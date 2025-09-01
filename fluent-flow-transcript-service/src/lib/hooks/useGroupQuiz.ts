'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface GroupQuizState {
  groupId: string | null
  sessionId: string | null
  isGroupSession: boolean
  sessionInfo: {
    quiz_title?: string
    video_title?: string
    video_url?: string
    scheduled_at?: string
  } | null
}

interface QuizResult {
  score: number
  totalQuestions: number
  correctAnswers: number
  timeTakenSeconds?: number
  resultData?: any
}

export function useGroupQuiz() {
  const router = useRouter()
  const [groupQuizState, setGroupQuizState] = useState<GroupQuizState>({
    groupId: null,
    sessionId: null,
    isGroupSession: false,
    sessionInfo: null
  })

  // Initialize from URL parameters or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const groupId = urlParams.get('groupId')
    const sessionId = urlParams.get('sessionId')

    if (groupId && sessionId) {
      // This is a group quiz session
      setGroupQuizState({
        groupId,
        sessionId,
        isGroupSession: true,
        sessionInfo: null // Will be fetched separately
      })
      
      // Fetch session info
      fetchSessionInfo(groupId, sessionId)
    } else {
      // Check if we have group context in localStorage
      const savedGroupContext = localStorage.getItem('currentGroupQuiz')
      if (savedGroupContext) {
        try {
          const parsed = JSON.parse(savedGroupContext)
          setGroupQuizState(parsed)
          
          if (parsed.groupId && parsed.sessionId) {
            fetchSessionInfo(parsed.groupId, parsed.sessionId)
          }
        } catch (error) {
          console.error('Error parsing saved group context:', error)
          localStorage.removeItem('currentGroupQuiz')
        }
      }
    }
  }, [])

  const fetchSessionInfo = async (groupId: string, sessionId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/results`)
      if (response.ok) {
        const data = await response.json()
        setGroupQuizState(prev => ({
          ...prev,
          sessionInfo: {
            quiz_title: data.session?.quiz_title,
            video_title: data.session?.video_title,
            video_url: data.session?.video_url,
            scheduled_at: data.session?.scheduled_at
          }
        }))
      }
    } catch (error) {
      console.error('Error fetching session info:', error)
    }
  }

  const joinGroupSession = (groupId: string, sessionId: string, quizToken: string) => {
    const newState = {
      groupId,
      sessionId,
      isGroupSession: true,
      sessionInfo: null
    }
    
    setGroupQuizState(newState)
    
    // Save to localStorage for persistence
    localStorage.setItem('currentGroupQuiz', JSON.stringify(newState))
    
    // Navigate to quiz with group parameters
    router.push(`/questions/${quizToken}?groupId=${groupId}&sessionId=${sessionId}`)
  }

  const leaveGroupSession = () => {
    setGroupQuizState({
      groupId: null,
      sessionId: null,
      isGroupSession: false,
      sessionInfo: null
    })
    
    // Clear localStorage
    localStorage.removeItem('currentGroupQuiz')
  }

  const saveGroupQuizResult = async (result: QuizResult): Promise<boolean> => {
    if (!groupQuizState.isGroupSession || !groupQuizState.groupId || !groupQuizState.sessionId) {
      return false
    }

    try {
      const response = await fetch(
        `/api/groups/${groupQuizState.groupId}/sessions/${groupQuizState.sessionId}/results`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            score: result.score,
            total_questions: result.totalQuestions,
            correct_answers: result.correctAnswers,
            time_taken_seconds: result.timeTakenSeconds,
            result_data: result.resultData
          })
        }
      )

      if (response.ok) {
        // Clear group context after successful save
        leaveGroupSession()
        return true
      } else {
        const errorData = await response.json()
        console.error('Failed to save group quiz result:', errorData.error)
        return false
      }
    } catch (error) {
      console.error('Error saving group quiz result:', error)
      return false
    }
  }

  const getGroupResultsUrl = (): string | null => {
    if (!groupQuizState.isGroupSession || !groupQuizState.groupId || !groupQuizState.sessionId) {
      return null
    }
    
    return `/groups/${groupQuizState.groupId}?tab=sessions&sessionId=${groupQuizState.sessionId}`
  }

  const isInGroupSession = (): boolean => {
    return groupQuizState.isGroupSession && 
           !!groupQuizState.groupId && 
           !!groupQuizState.sessionId
  }

  return {
    ...groupQuizState,
    joinGroupSession,
    leaveGroupSession,
    saveGroupQuizResult,
    getGroupResultsUrl,
    isInGroupSession,
    fetchSessionInfo: () => {
      if (groupQuizState.groupId && groupQuizState.sessionId) {
        fetchSessionInfo(groupQuizState.groupId, groupQuizState.sessionId)
      }
    }
  }
}