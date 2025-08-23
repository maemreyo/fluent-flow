import React, { useState, useEffect } from 'react'
import type { 
  FluentFlowUser, 
  StudyGroup, 
  ChatMessage, 
  Leaderboard,
  SocialNotification
} from '../../lib/utils/social-features'
import { socialService } from '../../lib/services/social-service'

interface SocialFeaturesCardProps {
  currentUser: FluentFlowUser | null
}

export function SocialFeaturesCard({ currentUser }: SocialFeaturesCardProps) {
  const [activeTab, setActiveTab] = useState<'groups' | 'leaderboard' | 'chat' | 'notifications'>('groups')
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([])
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [notifications, setNotifications] = useState<SocialNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    if (currentUser) {
      loadSocialData()
    }
  }, [currentUser])

  const loadSocialData = async () => {
    setIsLoading(true)
    try {
      const [groups, board, notifs] = await Promise.all([
        socialService.getUserStudyGroups(),
        socialService.getLeaderboard('global', 'xp', 'weekly'),
        socialService.getUserNotifications()
      ])
      
      setStudyGroups(groups)
      setLeaderboard(board)
      setNotifications(notifs)
      
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id)
        const groupMessages = await socialService.getGroupMessages(groups[0].id)
        setMessages(groupMessages)
      }
    } catch (error) {
      console.error('Failed to load social data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGroupSelect = async (groupId: string) => {
    setSelectedGroupId(groupId)
    const groupMessages = await socialService.getGroupMessages(groupId)
    setMessages(groupMessages)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroupId || !currentUser) return
    
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      groupId: selectedGroupId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatar,
      content: newMessage.trim(),
      type: 'text',
      timestamp: new Date()
    }
    
    const success = await socialService.sendMessage(message)
    if (success) {
      setNewMessage('')
      setMessages(prev => [...prev, message])
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return 'Yesterday'
    return `${diffInDays} days ago`
  }

  const getLevelColor = (level: number) => {
    if (level >= 8) return 'text-purple-600'
    if (level >= 6) return 'text-indigo-600'
    if (level >= 4) return 'text-blue-600'
    if (level >= 2) return 'text-green-600'
    return 'text-gray-600'
  }

  if (!currentUser) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🌟</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Join the Community</h3>
          <p className="text-gray-600 text-sm">Connect with other learners, join study groups, and track your progress on leaderboards!</p>
          <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Get Started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Social Features</h2>
      
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-4">
        {[
          { id: 'groups', label: 'Groups', icon: '👥', count: studyGroups.length },
          { id: 'leaderboard', label: 'Rankings', icon: '🏆' },
          { id: 'chat', label: 'Chat', icon: '💬' },
          { id: 'notifications', label: 'Alerts', icon: '🔔', count: notifications.filter(n => !n.read).length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-48">
        {/* Study Groups */}
        {activeTab === 'groups' && (
          <div className="space-y-3">
            {studyGroups.length > 0 ? (
              studyGroups.map((group) => (
                <div key={group.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{group.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>🌐 {group.language}</span>
                        <span>📊 {group.level}</span>
                        <span>👥 {group.members.length}/{group.maxMembers}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleGroupSelect(group.id)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">👥</div>
                <p className="text-sm mb-3">No study groups yet</p>
                <button className="bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700">
                  Find Groups
                </button>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            {leaderboard?.entries && leaderboard.entries.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-800">Weekly XP Leaders</h3>
                  <span className="text-xs text-gray-500">Last updated {formatTimeAgo(leaderboard.lastUpdated)}</span>
                </div>
                {leaderboard.entries.slice(0, 10).map((entry) => (
                  <div key={entry.userId} className="flex items-center gap-3 p-2">
                    <div className={`w-6 text-center font-bold ${
                      entry.rank === 1 ? 'text-yellow-600' : 
                      entry.rank === 2 ? 'text-gray-600' :
                      entry.rank === 3 ? 'text-orange-600' : 'text-gray-500'
                    }`}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{entry.username}</span>
                        <span className={`text-xs px-2 py-1 rounded ${getLevelColor(entry.level)} bg-gray-100`}>
                          L{entry.level}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{entry.value.toLocaleString()} XP</div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">🏆</div>
                <p className="text-sm">Leaderboard coming soon</p>
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        {activeTab === 'chat' && (
          <div className="space-y-3">
            {selectedGroupId && studyGroups.length > 0 ? (
              <>
                <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                  {messages.length > 0 ? (
                    messages.slice(-5).map((message) => (
                      <div key={message.id} className="text-sm">
                        <span className="font-medium text-gray-700">{message.senderName}:</span>
                        <span className="ml-2 text-gray-600">{message.content}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center">No messages yet</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-sm">Join a study group to start chatting</p>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className={`p-3 rounded-lg border-l-4 ${
                  notification.read ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-400'
                }`}>
                  <h4 className="font-medium text-gray-800 text-sm">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <span className="text-xs text-gray-400">{formatTimeAgo(notification.createdAt)}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}