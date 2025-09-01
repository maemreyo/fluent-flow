'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { AuthPrompt } from '../../../components/auth/AuthPrompt'
import { useQuizAuth } from '../../../lib/hooks/use-quiz-auth'
import { supabase } from '../../../lib/supabase/client'
import SessionsTab from '../../../components/sessions/SessionsTab'
import CreateSessionModal from '../../../components/sessions/CreateSessionModal'
import { 
  ArrowLeft,
  Users, 
  Settings, 
  Calendar,
  Plus,
  Play,
  Trophy,
  MessageCircle,
  Copy,
  Crown,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Share2
} from 'lucide-react'

interface GroupMember {
  user_id: string
  username: string
  avatar?: string
  role: string
  joined_at: string
  contribution: number
  last_active: string
}

interface QuizSession {
  id: string
  quiz_token: string
  quiz_title?: string
  video_url?: string
  video_title?: string
  scheduled_at: string
  started_at?: string
  ended_at?: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  created_by: string
  result_count: number
}

interface StudyGroup {
  id: string
  name: string
  description: string
  language: string
  level: string
  created_by: string
  created_at: string
  is_private: boolean
  max_members: number
  group_code: string
  member_count: number
  members: GroupMember[]
  user_role: string | null
  is_member: boolean
  recent_sessions: QuizSession[]
}

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const router = useRouter()
  const { groupId } = use(params)
  
  const [group, setGroup] = useState<StudyGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'sessions' | 'settings'>('overview')
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const { user, isAuthenticated, isLoading: authLoading, signOut } = useQuizAuth()

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        fetchGroup()
      } else {
        setShowAuthPrompt(true)
        setLoading(false)
      }
    }
  }, [groupId, isAuthenticated, authLoading])

  const fetchGroup = async () => {
    if (!isAuthenticated || !supabase) return
    
    setLoading(true)
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch(`/api/groups/${groupId}`, {
        headers
      })
      const data = await response.json()
      
      if (response.ok) {
        setGroup(data.group)
      } else {
        console.error('Error fetching group:', data.error)
        if (response.status === 404 || response.status === 403) {
          router.push('/groups')
        }
      }
    } catch (error) {
      console.error('Error fetching group:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthPrompt(false)
    // Group will be fetched automatically when isAuthenticated becomes true
  }

  const handleCloseAuthPrompt = () => {
    setShowAuthPrompt(false)
    router.push('/groups')
  }

  const copyGroupCode = () => {
    if (group?.group_code) {
      navigator.clipboard.writeText(group.group_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'active':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Group not found</h2>
          <p className="text-gray-600 mb-4">This group doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => router.push('/groups')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Back to Groups
          </button>
        </div>
      </div>
    )
  }

  const canManage = group.user_role && ['owner', 'admin'].includes(group.user_role)

  return (
    <>
      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <AuthPrompt
          onClose={handleCloseAuthPrompt}
          onAuthSuccess={handleAuthSuccess}
          title="Access Group"
          subtitle="Sign in to view and participate in study groups"
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/groups')}
              className="p-2 hover:bg-white/50 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  group.is_private 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {group.is_private ? 'Private' : 'Public'}
                </span>
              </div>
              <p className="text-gray-600">{group.description || 'No description'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
              <span className="font-mono text-lg font-bold text-indigo-600">{group.group_code}</span>
              <button
                onClick={copyGroupCode}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy group code"
              >
                {copiedCode ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
            
            {canManage && (
              <button
                onClick={() => setShowCreateSession(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all hover:scale-105 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                New Quiz Session
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Members</p>
                <p className="text-2xl font-bold text-gray-800">{group.member_count}/{group.max_members}</p>
              </div>
              <Users className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Quiz Sessions</p>
                <p className="text-2xl font-bold text-gray-800">{group.recent_sessions.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Language</p>
                <p className="text-2xl font-bold text-gray-800">{group.language}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Level</p>
                <p className="text-2xl font-bold text-gray-800 capitalize">{group.level}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-lg border border-white/20 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: Calendar },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'sessions', label: 'Sessions', icon: Play },
            ...(canManage ? [{ id: 'settings', label: 'Settings', icon: Settings }] : [])
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-indigo-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/20">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Activity</h2>
              
              {group.recent_sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No quiz sessions yet</h3>
                  <p className="text-gray-500 mb-6">Create the first quiz session to get started!</p>
                  {canManage && (
                    <button
                      onClick={() => setShowCreateSession(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all hover:scale-105"
                    >
                      <Plus className="w-5 h-5" />
                      Create Quiz Session
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {group.recent_sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(session.status)}
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {session.quiz_title || session.video_title || 'Quiz Session'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(session.scheduled_at).toLocaleString()} • {session.result_count} participants
                          </p>
                        </div>
                      </div>
                      <button className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                        View Results
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Members ({group.member_count})</h2>
                {canManage && (
                  <button className="inline-flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                    <Share2 className="w-4 h-4" />
                    Invite Members
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.members.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{member.username}</p>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="text-sm text-gray-600 capitalize">{member.role}</p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <SessionsTab
              groupId={groupId}
              canManage={!!canManage}
              onCreateSession={() => setShowCreateSession(true)}
            />
          )}

          {activeTab === 'settings' && canManage && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Group Settings</h2>
              
              {/* Settings form will go here */}
              <div className="text-center py-8 text-gray-500">
                Group settings coming soon...
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Create Session Modal */}
        {showCreateSession && (
          <CreateSessionModal 
            groupId={groupId}
            onClose={() => setShowCreateSession(false)} 
            onSuccess={fetchGroup}
          />
        )}
      </div>
    </>
  )
}
