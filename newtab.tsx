import React, { useState, useEffect } from 'react'
import { Book, Target, Users } from 'lucide-react'
import { FlashcardPractice } from './components/learning/flashcard-practice'
import { EnhancedContextualLearning } from './components/learning/enhanced-contextual-learning'
import { SocialGamification } from './components/learning/social-gamification'
import { ContextualUsagePractice } from './components/learning/contextual-usage-practice'
import { AudioRecognitionPractice } from './components/learning/audio-recognition-practice'
import { SpellingPractice } from './components/learning/spelling-practice'
import { userVocabularyService, type LearningStats } from './lib/services/user-vocabulary-service'
import './styles/newtab.css'

function VocabularyLearningNewTab() {
  const [activeTab, setActiveTab] = useState<'srs' | 'practice' | 'contextual' | 'social'>('srs')
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [showContextualUsage, setShowContextualUsage] = useState(false)
  const [showAudioRecognition, setShowAudioRecognition] = useState(false)
  const [showSpellingPractice, setShowSpellingPractice] = useState(false)
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

  if (showContextualUsage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowContextualUsage(false)}
                  className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Book className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Contextual Usage Practice</h1>
                  <p className="text-sm text-gray-500">Create sentences with vocabulary</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ContextualUsagePractice onComplete={() => setShowContextualUsage(false)} />
      </div>
    )
  }

  if (showAudioRecognition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAudioRecognition(false)}
                  className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Book className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Audio Recognition Practice</h1>
                  <p className="text-sm text-gray-500">Listen and identify words</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <AudioRecognitionPractice onComplete={() => setShowAudioRecognition(false)} />
      </div>
    )
  }

  if (showSpellingPractice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSpellingPractice(false)}
                  className="flex items-center justify-center w-10 h-10 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Book className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Spelling Practice</h1>
                  <p className="text-sm text-gray-500">Type words from pronunciation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <SpellingPractice onComplete={() => setShowSpellingPractice(false)} />
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
                <button
                  onClick={() => setShowContextualUsage(true)}
                  className="text-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border-2 border-transparent hover:border-red-200"
                >
                  <div className="font-semibold text-red-800">Contextual Usage</div>
                  <div className="text-xs text-red-600 mt-1">Generate sentences</div>
                </button>
                <button
                  onClick={() => setShowAudioRecognition(true)}
                  className="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border-2 border-transparent hover:border-green-200"
                >
                  <div className="font-semibold text-green-800">Audio Recognition</div>
                  <div className="text-xs text-green-600 mt-1">Listen → identify word</div>
                </button>
                <button
                  onClick={() => setShowSpellingPractice(true)}
                  className="text-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border-2 border-transparent hover:border-purple-200"
                >
                  <div className="font-semibold text-purple-800">Spelling Practice</div>
                  <div className="text-xs text-purple-600 mt-1">Type from pronunciation</div>
                </button>
              </div>
              <div className="text-center">
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => setShowFlashcards(true)}
                    className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                  >
                    Start Flashcard Practice
                  </button>
                  <button
                    onClick={() => setShowContextualUsage(true)}
                    className="bg-red-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    Start Usage Practice
                  </button>
                  <button
                    onClick={() => setShowAudioRecognition(true)}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    Start Audio Practice
                  </button>
                  <button
                    onClick={() => setShowSpellingPractice(true)}
                    className="bg-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-600 transition-colors"
                  >
                    Start Spelling Practice
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contextual' && (
            <EnhancedContextualLearning 
              onNavigateToVideo={(loopId: string) => {
                // TODO: Navigate to video with specific loop
                console.log('Navigate to loop:', loopId)
                alert(`Navigate to video loop: ${loopId}`)
              }}
            />
          )}

          {activeTab === 'social' && (
            <SocialGamification />
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