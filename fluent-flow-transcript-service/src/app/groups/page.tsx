'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Users, 
  Search, 
  Settings, 
  UserPlus,
  Calendar,
  BarChart3,
  MessageCircle,
  Crown,
  Shield
} from 'lucide-react'
import { AuthPrompt } from '../../components/auth/AuthPrompt'
import { useQuizAuth } from '../../lib/hooks/use-quiz-auth'
import { supabase } from '../../lib/supabase/client'

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
  member_count: number
  study_group_members: Array<{
    user_id: string
    username: string
    role: string
    joined_at: string
  }>
}

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'my-groups' | 'public'>('my-groups')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  // Use useQuizAuth without token for direct authentication
  const { user, isAuthenticated, isLoading: authLoading, signOut } = useQuizAuth()

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        fetchGroups()
      } else {
        setShowAuthPrompt(true)
        setLoading(false)
      }
    }
  }, [activeTab, isAuthenticated, authLoading])

  const fetchGroups = async () => {
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
      
      const response = await fetch(`/api/groups?type=${activeTab}`, {
        headers
      })
      const data = await response.json()
      
      if (response.ok) {
        setGroups(data.groups || [])
      } else {
        console.error('Error fetching groups:', data.error)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.language.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthPrompt(false)
    // Groups will be fetched automatically when isAuthenticated becomes true
  }

  const handleCloseAuthPrompt = () => {
    setShowAuthPrompt(false)
  }

  const handleCreateGroup = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      return
    }
    setShowCreateModal(true)
  }

  const handleJoinGroup = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      return
    }
    setShowJoinModal(true)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <AuthPrompt
          onClose={handleCloseAuthPrompt}
          onAuthSuccess={handleAuthSuccess}
          title="Join Study Groups!"
          subtitle="Sign in to create, join, and manage study groups with your classmates"
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-10 right-10 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Study Groups
                </h1>
                <p className="text-gray-600 text-lg">
                  Join or create groups to learn together and track progress
                </p>
                {user && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>Welcome, {user.email}</span>
                    <button
                      onClick={signOut}
                      className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
              
              {isAuthenticated && (
                <div className="flex gap-3">
                  <button
                    onClick={handleJoinGroup}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-2xl text-indigo-700 font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <UserPlus className="w-5 h-5" />
                    Join Group
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Create Group
                  </button>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <>
                {/* Tab Navigation */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-lg border border-white/20">
                    <button
                      onClick={() => setActiveTab('my-groups')}
                      className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                        activeTab === 'my-groups'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-indigo-600'
                      }`}
                    >
                      My Groups
                    </button>
                    <button
                      onClick={() => setActiveTab('public')}
                      className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                        activeTab === 'public'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-indigo-600'
                      }`}
                    >
                      Discover
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search groups..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all duration-300 shadow-lg"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Groups Grid */}
          {isAuthenticated && loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded-xl mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
                </div>
              ))}
            </div>
          ) : isAuthenticated && filteredGroups.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-6">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-gray-600 mb-2">
                  {activeTab === 'my-groups' ? 'No groups yet' : 'No public groups found'}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {activeTab === 'my-groups'
                    ? 'Create your first study group or join an existing one to get started'
                    : 'Try adjusting your search or create a public group for others to discover'
                  }
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleCreateGroup}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Create Group
                </button>
                <button
                  onClick={handleJoinGroup}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-2xl text-indigo-700 font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  <UserPlus className="w-5 h-5" />
                  Join Group
                </button>
              </div>
            </div>
          ) : isAuthenticated && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => {
                const userRole = group.study_group_members?.[0]?.role
                
                return (
                  <div
                    key={group.id}
                    className="group bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
                    onClick={() => router.push(`/groups/${group.id}`)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                            {group.name}
                          </h3>
                          {userRole && getRoleIcon(userRole)}
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {group.description || 'No description'}
                        </p>
                      </div>
                      {!group.is_private && (
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          Public
                        </div>
                      )}
                    </div>

                    {/* Language & Level */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {group.language}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border-2 ${getLevelColor(group.level)}`}>
                        {group.level}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{group.member_count}/{group.max_members} members</span>
                      </div>
                      <div className="text-xs">
                        {new Date(group.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Action Icons */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <MessageCircle className="w-4 h-4" />
                          <span>Chat</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>Sessions</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <BarChart3 className="w-4 h-4" />
                          <span>Stats</span>
                        </div>
                      </div>
                      {(userRole === 'owner' || userRole === 'admin') && (
                        <Settings className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Create Group Modal */}
        {showCreateModal && (
          <CreateGroupModal 
            onClose={() => setShowCreateModal(false)} 
            onSuccess={fetchGroups}
          />
        )}

        {/* Join Group Modal */}
        {showJoinModal && (
          <JoinGroupModal 
            onClose={() => setShowJoinModal(false)} 
            onSuccess={fetchGroups}
          />
        )}
      </div>
    </>
  )
}

// Create Group Modal Component
function CreateGroupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'English',
    level: 'intermediate',
    is_private: false,
    max_members: 20
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get the current session token
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } }
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        alert(data.error || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Study Group</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
              placeholder="My Study Group"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
              placeholder="What will your group focus on?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Language *
              </label>
              <select
                required
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Level *
              </label>
              <select
                required
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Max Members
            </label>
            <input
              type="number"
              min="2"
              max="50"
              value={formData.max_members}
              onChange={(e) => setFormData(prev => ({ ...prev, max_members: parseInt(e.target.value) }))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_private"
              checked={formData.is_private}
              onChange={(e) => setFormData(prev => ({ ...prev, is_private: e.target.checked }))}
              className="w-5 h-5 text-indigo-600 border-2 border-gray-200 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_private" className="ml-3 text-sm font-medium text-gray-700">
              Make group private (invite only)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Join Group Modal Component
function JoinGroupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [groupCode, setGroupCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get the current session token
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } }
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: groupCode })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Successfully joined "${data.group.name}"!`)
        onSuccess()
        onClose()
      } else {
        alert(data.error || 'Failed to join group')
      }
    } catch (error) {
      console.error('Error joining group:', error)
      alert('Failed to join group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">Join Study Group</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Group Code
            </label>
            <input
              type="text"
              required
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all text-center text-lg font-mono tracking-wider"
              placeholder="ABC123XY"
              maxLength={8}
            />
            <p className="text-sm text-gray-500 mt-2">
              Enter the 8-character group code shared by the group admin
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || groupCode.length !== 8}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}