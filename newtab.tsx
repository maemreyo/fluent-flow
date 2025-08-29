import React, { useState, useEffect } from 'react'
import { Book, Target, Users } from 'lucide-react'
import { FlashcardPractice } from './components/learning/flashcard-practice'
import { userVocabularyService, type LearningStats } from './lib/services/user-vocabulary-service'
import './styles/newtab.css'

function VocabularyLearningNewTab() {
  const [activeTab, setActiveTab] = useState<'srs' | 'practice' | 'contextual' | 'social'>('srs')
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [stats, setStats] = useState<LearningStats | null>(null)

  // Load user stats
  useEffect(() => {
    const loadStats = async () => {
      const userStats = await userVocabularyService.getUserStats()
      setStats(userStats)
    }
    loadStats()
  }, [])

  const tabs = [
    {
      id: 'srs' as const,
      title: 'Spaced Repetition',
      icon: <Target className="h-5 w-5" />,
      description: 'Smart learning schedule based on forgetting curve'
    },
    {
      id: 'practice' as const,
      title: 'Active Practice',
      icon: <Book className="h-5 w-5" />,
      description: 'Flashcards, audio recognition, and spelling practice'
    },
    {
      id: 'contextual' as const,
      title: 'Contextual Learning',
      icon: <Book className="h-5 w-5" />,
      description: 'Learn vocabulary in real video context'
    },
    {
      id: 'social' as const,
      title: 'Social & Games',
      icon: <Users className="h-5 w-5" />,
      description: 'Share words, streaks, and achievements'
    }
  ]

  if (showFlashcards) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFlashcards(false)}
                  className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Book className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Flashcard Practice</h1>
                  <p className="text-sm text-gray-500">Practice your vocabulary</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FlashcardPractice onComplete={() => setShowFlashcards(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg">
                <Book className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FluentFlow</h1>
                <p className="text-sm text-gray-500">Vocabulary Learning Center</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {stats ? stats.wordsLearned + stats.phrasesLearned : 0}
                </div>
                <div className="text-gray-500">Items Learned</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {stats?.currentStreakDays || 0}
                </div>
                <div className="text-gray-500">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {stats ? stats.totalWordsAdded + stats.totalPhrasesAdded : 0}
                </div>
                <div className="text-gray-500">Total Saved</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className={`mr-2 ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400'}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {activeTab === 'srs' && (
            <div className="text-center py-16">
              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Spaced Repetition System
              </h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Smart learning schedule that shows you vocabulary words at optimal intervals based on the forgetting curve. 
                Add words from your FluentFlow sessions and track your progress.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <div className="font-semibold text-green-800">Mark as Learning</div>
                  <div className="text-sm text-green-600 mt-1">Add to personal deck</div>
                </div>
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="font-semibold text-blue-800">Smart Scheduling</div>
                  <div className="text-sm text-blue-600 mt-1">Based on forgetting curve</div>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <div className="font-semibold text-purple-800">Progress Tracking</div>
                  <div className="text-sm text-purple-600 mt-1">Monitor learning status</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'practice' && (
            <div className="text-center py-16">
              <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Active Practice Methods
              </h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Interactive practice modes to reinforce vocabulary learning through different methods.
                Practice with flashcards, audio recognition, and spelling exercises.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
                <button
                  onClick={() => setShowFlashcards(true)}
                  className="text-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors border-2 border-transparent hover:border-orange-200"
                >
                  <div className="font-semibold text-orange-800">Flashcard Mode</div>
                  <div className="text-xs text-orange-600 mt-1">Word → Definition recall</div>
                </button>
                <div className="text-center p-4 bg-red-50 rounded-lg opacity-50">
                  <div className="font-semibold text-red-800">Contextual Usage</div>
                  <div className="text-xs text-red-600 mt-1">Generate sentences</div>
                  <div className="text-xs text-gray-500 mt-1">Coming Soon</div>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg opacity-50">
                  <div className="font-semibold text-indigo-800">Audio Recognition</div>
                  <div className="text-xs text-indigo-600 mt-1">Listen → identify word</div>
                  <div className="text-xs text-gray-500 mt-1">Coming Soon</div>
                </div>
                <div className="text-center p-4 bg-teal-50 rounded-lg opacity-50">
                  <div className="font-semibold text-teal-800">Spelling Practice</div>
                  <div className="text-xs text-teal-600 mt-1">Type from pronunciation</div>
                  <div className="text-xs text-gray-500 mt-1">Coming Soon</div>
                </div>
              </div>
              <div className="text-center">
                <button
                  onClick={() => setShowFlashcards(true)}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Start Flashcard Practice
                </button>
              </div>
            </div>
          )}

          {activeTab === 'contextual' && (
            <div className="text-center py-16">
              <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Contextual Learning
              </h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Learn vocabulary in the context of real video content. Associate words with specific video segments
                and practice with authentic usage examples.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="font-semibold text-yellow-800">Save to Loop</div>
                  <div className="text-xs text-yellow-600 mt-1">Link with video segments</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="font-semibold text-green-800">Usage Examples</div>
                  <div className="text-xs text-green-600 mt-1">Real content examples</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="font-semibold text-blue-800">Collocation Practice</div>
                  <div className="text-xs text-blue-600 mt-1">Word combinations</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="font-semibold text-purple-800">Similar Context</div>
                  <div className="text-xs text-purple-600 mt-1">Find in other videos</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="text-center py-16">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Social & Gamification
              </h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Share interesting words with others, maintain learning streaks, and unlock achievements 
                for reaching learning milestones. Learn vocabulary with peers in study groups.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                <div className="text-center p-4 bg-pink-50 rounded-lg">
                  <div className="font-semibold text-pink-800">Share Word</div>
                  <div className="text-xs text-pink-600 mt-1">Share with others</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="font-semibold text-orange-800">Word Streaks</div>
                  <div className="text-xs text-orange-600 mt-1">Daily learning streaks</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="font-semibold text-yellow-800">Achievement Badges</div>
                  <div className="text-xs text-yellow-600 mt-1">Unlock rewards</div>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <div className="font-semibold text-indigo-800">Study Groups</div>
                  <div className="text-xs text-indigo-600 mt-1">Learn with peers</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Get Started Section */}
        <div className="mt-8 bg-indigo-600 rounded-lg text-white p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Ready to Start Learning?</h3>
          <p className="text-indigo-100 mb-6">
            Visit FluentFlow videos, analyze vocabulary, and star words to add them to your personal learning deck.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="text-sm text-indigo-200">
              1. Watch videos with FluentFlow → 2. Analyze vocabulary → 3. Star words to save → 4. Practice here!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VocabularyLearningNewTab