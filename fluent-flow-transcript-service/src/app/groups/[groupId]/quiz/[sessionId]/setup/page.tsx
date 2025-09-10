'use client'

import { use, useCallback } from 'react'
import { PermissionManager } from '../../../../../../lib/permissions'
import { useLoop } from '../../../../../../hooks/useLoops'
import { useGroupQuestionGeneration } from '../hooks/useQuestionGeneration'
import { useQuizSync } from '../hooks/useQuizSync'
import { GroupPresetSelectionView } from '../components/GroupPresetSelectionView'
import { MemberWaitingView } from '../components/MemberWaitingView'
import { useQuizFlow } from '../shared/hooks/useQuizFlow'

interface SetupPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function SetupPage({ params }: SetupPageProps) {
  const { groupId, sessionId } = use(params)

  const {
    session,
    group,
    user,
    onlineParticipants,
    navigateToLobby,
    navigateToInfo
  } = useQuizFlow({ groupId, sessionId })

  // Question generation hook
  const {
    generatingState,
    generatedCounts,
    shareTokens,
    currentPreset,
    handleGenerateQuestions: generateQuestions,
    handleGenerateAllQuestions: generateAllQuestions,
    handleGenerateFromPreset: generateFromPreset,
    needsPresetReplacement
  } = useGroupQuestionGeneration(groupId, sessionId)

  const loopId = (session as any)?.loop_data?.id
  const { data: loopData, error: loopError } = useLoop(groupId, loopId)

  // Role-based permissions
  const permissions = new PermissionManager(user, group, session)
  
  // Debug permissions
  console.log('🔍 Permission Debug:', {
    user: user ? { id: user.id, email: user.email } : null,
    group: group ? { 
      id: group.id, 
      user_role: (group as any)?.user_role,
      role: group.user_role 
    } : null,
    session: session ? { 
      id: session.id, 
      created_by: session.created_by 
    } : null,
    canManageQuiz: permissions.canManageQuiz(),
    isOwner: permissions.isOwner(),
    isAdmin: permissions.isAdmin(),
    isMember: permissions.isMember(),
    isSessionCreator: permissions.isSessionCreator(),
    getAllPermissions: permissions.getAllPermissions()
  })

  // Quiz synchronization for broadcasting
  const {
    syncState,
    broadcastQuizSessionStart,
    broadcastPreparationUpdate
  } = useQuizSync({
    groupId,
    sessionId,
    canManage: permissions.canManageQuiz(),
    enabled: true,
    onMemberStartQuizInfo: navigateToInfo,
    onMemberResetToPresets: () => window.location.reload(),
    // Pass shareTokens to session storage for later use by preview page
    onMemberLoadQuestions: (shareTokens) => {
      console.log('📚 Member storing shareTokens for preview page:', shareTokens)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`quiz-shareTokens-${sessionId}`, JSON.stringify(shareTokens))
      }
    }
  })

  const handlePresetSelect = useCallback((preset: any) => {
    // Logic for preset selection
    console.log('Preset selected:', preset)
  }, [])

  const handleStartQuiz = useCallback(async (shareTokens: Record<string, string>) => {
    console.log('🚀 Starting quiz from setup with shareTokens:', shareTokens)
    
    // Broadcast to members and transition to lobby
    if (permissions.canManageQuiz()) {
      const success = await broadcastQuizSessionStart(session?.quiz_title || 'Quiz Session', shareTokens)
      if (success) {
        console.log('✅ Quiz session start broadcasted, navigating to lobby')
        navigateToLobby()
      }
    }
  }, [permissions, broadcastQuizSessionStart, session?.quiz_title, navigateToLobby])

  // Question generation handlers
  const handleGenerateQuestions = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!loopData || loopError) {
      console.error('❌ Cannot generate questions: Loop data not available')
      alert('Cannot generate questions: The practice loop associated with this session is not available.')
      return
    }

    if (permissions.canManageQuiz()) {
      broadcastPreparationUpdate('question-generation', {
        [difficulty]: true,
        completed: false
      })
    }

    await generateQuestions(difficulty, loopData)

    const newCounts = { ...generatedCounts, [difficulty]: generatedCounts[difficulty] + 1 }
    if (
      permissions.canManageQuiz() &&
      newCounts.easy > 0 &&
      newCounts.medium > 0 &&
      newCounts.hard > 0
    ) {
      broadcastPreparationUpdate('ready-to-start', { questionsReady: true })
    }
  }

  const handleGenerateAllQuestions = async () => {
    if (!loopData || loopError) {
      console.error('❌ Cannot generate questions: Loop data not available')
      alert('Cannot generate questions: The practice loop associated with this session is not available.')
      return
    }

    if (permissions.canManageQuiz()) {
      broadcastPreparationUpdate('question-generation', { all: true, completed: false })
    }

    await generateAllQuestions(loopData)

    if (permissions.canManageQuiz()) {
      broadcastPreparationUpdate('ready-to-start', { questionsReady: true })
    }
  }

  const handleGenerateFromPreset = async (
    distribution: { easy: number; medium: number; hard: number },
    presetInfo: { id: string; name: string }
  ) => {
    if (!loopData || loopError) {
      console.error('❌ Cannot generate questions: Loop data not available')
      alert('Cannot generate questions: The practice loop associated with this session is not available.')
      return
    }

    if (permissions.canManageQuiz()) {
      // First broadcast preset selection
      broadcastPreparationUpdate('preset-selection', {
        selectedPreset: { ...presetInfo, distribution }
      })
      
      // Then broadcast question generation start
      setTimeout(() => {
        broadcastPreparationUpdate('question-generation', {
          selectedPreset: { ...presetInfo, distribution },
          all: true,
          completed: false
        })
      }, 500)
    }

    await generateFromPreset(loopData, distribution, presetInfo)

    if (permissions.canManageQuiz()) {
      broadcastPreparationUpdate('ready-to-start', { questionsReady: true })
    }
  }

  // Show different views based on user role
  const canManageQuiz = permissions.canManageQuiz()
  const isOwner = permissions.isOwner()
  const isAdmin = permissions.isAdmin()
  const isSessionCreator = permissions.isSessionCreator()
  
  console.log('🔐 Setup page permission check:', {
    canManageQuiz,
    isOwner,
    isAdmin, 
    isSessionCreator,
    userRole: (group as any)?.user_role
  })
  
  if (!canManageQuiz) {
    // Members see waiting view with dynamic state
    console.log('👥 Showing Member waiting view')
    return (
      <MemberWaitingView
        onlineParticipants={onlineParticipants}
        sessionTitle={session?.quiz_title || 'Group Quiz Session'}
        currentStep={syncState.currentStep}
      />
    )
  }

  // Owners/admins see full preset selection
  console.log('👑 Showing Owner preset selection view')
  return (
    <div className="mx-auto max-w-6xl">
      <GroupPresetSelectionView
        onPresetSelect={handlePresetSelect}
        onlineParticipants={onlineParticipants}
        onGenerateQuestions={handleGenerateQuestions}
        onGenerateAllQuestions={handleGenerateAllQuestions}
        onGenerateFromPreset={handleGenerateFromPreset}
        generatingState={generatingState}
        generatedCounts={generatedCounts}
        shareTokens={shareTokens}
        onStartQuiz={handleStartQuiz}
        currentPreset={currentPreset}
        needsPresetReplacement={needsPresetReplacement}
      />
    </div>
  )
}