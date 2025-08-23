import React, { useState, useEffect } from 'react'
import type { 
  FluentFlowUser, 
  GroupChallenge, 
  ChallengeParticipant
} from '../../lib/utils/social-features'
import { socialService } from '../../lib/services/social-service'
import { validateChallenge } from '../../lib/utils/social-features'

interface ChallengesCardProps {
  currentUser: FluentFlowUser | null
}

export function ChallengesCard({ currentUser }: ChallengesCardProps) {
  const [activeChallenges, setActiveChallenges] = useState<GroupChallenge[]>([])
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false)
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    type: 'practice_time' as const,
    target: 0,
    duration: 7
  })

  useEffect(() => {
    if (currentUser) {
      loadChallenges()
    }
  }, [currentUser])

  const loadChallenges = async () => {
    // In a real implementation, this would fetch active challenges from the service
    // For now, we'll simulate with empty array
    setActiveChallenges([])
  }

  const handleCreateChallenge = async () => {
    if (!currentUser) return
    
    const challengeData = {
      ...newChallenge,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Start tomorrow
      endDate: new Date(Date.now() + (newChallenge.duration + 1) * 24 * 60 * 60 * 1000),
      rewards: {
        xp: newChallenge.target * 10,
        achievement: 'Challenge Completed',
        badge: 'Challenge Master'
      }
    }

    const validation = validateChallenge(challengeData)
    if (!validation.isValid) {
      alert(validation.errors.join('\n'))
      return
    }

    // Here you would create the challenge via the service
    // For now, we'll just close the form
    setIsCreatingChallenge(false)
    setNewChallenge({
      title: '',
      description: '',
      type: 'practice_time',
      target: 0,
      duration: 7
    })
  }

  const formatChallengeType = (type: GroupChallenge['type']) => {
    const types = {
      practice_time: { label: 'Practice Time', icon: '⏰', unit: 'minutes' },
      streak: { label: 'Daily Streak', icon: '🔥', unit: 'days' },
      vocabulary: { label: 'Vocabulary', icon: '📚', unit: 'words' },
      sessions: { label: 'Sessions', icon: '🎯', unit: 'sessions' },
      videos: { label: 'Videos', icon: '🎥', unit: 'videos' }
    }
    return types[type]
  }

  const calculateProgress = (participant: ChallengeParticipant, target: number) => {
    return Math.min((participant.progress / target) * 100, 100)
  }

  if (!currentUser) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Join Challenges</h3>
          <p className="text-gray-600 text-sm">Compete with others and achieve your learning goals!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Challenges</h2>
        <button 
          onClick={() => setIsCreatingChallenge(true)}
          className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
        >
          Create
        </button>
      </div>

      {/* Active Challenges */}
      <div className="space-y-4">
        {activeChallenges.length > 0 ? (
          activeChallenges.map((challenge) => {
            const typeInfo = formatChallengeType(challenge.type)
            const userParticipant = challenge.participants.find(p => p.userId === currentUser.id)
            const progress = userParticipant ? calculateProgress(userParticipant, challenge.target) : 0
            const daysLeft = Math.ceil((challenge.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            
            return (
              <div key={challenge.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeInfo.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">{challenge.title}</h3>
                      <p className="text-sm text-gray-600">{challenge.description}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    challenge.status === 'active' ? 'bg-green-100 text-green-700' :
                    challenge.status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {challenge.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Your Progress</span>
                    <span className="font-medium">
                      {userParticipant?.progress || 0} / {challenge.target} {typeInfo.unit}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{challenge.participants.length} participants</span>
                    <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}</span>
                  </div>
                </div>

                {/* Top 3 participants */}
                {challenge.participants.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-purple-100">
                    <p className="text-xs text-gray-600 mb-2">Leaderboard</p>
                    <div className="space-y-1">
                      {challenge.participants
                        .sort((a, b) => b.progress - a.progress)
                        .slice(0, 3)
                        .map((participant, index) => (
                          <div key={participant.userId} className="flex items-center gap-2 text-sm">
                            <span className={`w-4 text-center ${
                              index === 0 ? 'text-yellow-600' : 
                              index === 1 ? 'text-gray-500' : 
                              'text-orange-600'
                            }`}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </span>
                            <span className={`font-medium ${
                              participant.userId === currentUser.id ? 'text-indigo-600' : 'text-gray-700'
                            }`}>
                              {participant.username}
                            </span>
                            <span className="text-gray-500 ml-auto">
                              {participant.progress} {typeInfo.unit}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm mb-3">No active challenges</p>
            <p className="text-xs text-gray-400">Create a challenge to get started!</p>
          </div>
        )}
      </div>

      {/* Create Challenge Form */}
      {isCreatingChallenge && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">Create New Challenge</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newChallenge.title}
                onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g., 30-Day Practice Streak"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newChallenge.description}
                onChange={(e) => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={2}
                placeholder="Describe your challenge..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newChallenge.type}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="practice_time">Practice Time</option>
                  <option value="streak">Daily Streak</option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="sessions">Sessions</option>
                  <option value="videos">Videos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                <input
                  type="number"
                  value={newChallenge.target}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, target: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
              <input
                type="number"
                value={newChallenge.duration}
                onChange={(e) => setNewChallenge(prev => ({ ...prev, duration: parseInt(e.target.value) || 7 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="7"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreateChallenge}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Create Challenge
              </button>
              <button
                onClick={() => {setIsCreatingChallenge(false); setNewChallenge({title: '', description: '', type: 'practice_time', target: 0, duration: 7})}}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}