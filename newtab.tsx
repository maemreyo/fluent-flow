import { useEffect, useState } from 'react'
import { Book, Target } from 'lucide-react'
import { AudioRecognitionPractice } from './components/learning/audio-recognition-practice'
import { ContextualUsagePractice } from './components/learning/contextual-usage-practice'
import { EnhancedContextualLearning } from './components/learning/enhanced-contextual-learning'
import EnhancedSRSFlashcard from './components/learning/enhanced-srs-flashcard'
import { FlashcardPractice } from './components/learning/flashcard-practice'
import { SocialGamification } from './components/learning/social-gamification'
import { SpellingPractice } from './components/learning/spelling-practice'
import { SRSDashboard } from './components/learning/srs-dashboard'
import VocabularySpotlight from './components/learning/vocabulary-spotlight'
import { UserDropdown } from './components/shared/UserDropdown'
import { useAuthentication } from './lib/hooks/use-authentication'
import { userVocabularyService, type LearningStats } from './lib/services/user-vocabulary-service'
import './styles/newtab.css'

function VocabularyLearningNewTab() {
  const [activeTab, setActiveTab] = useState<'srs' | 'practice' | 'contextual' | 'social'>('srs')
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [showSRSReview, setShowSRSReview] = useState(false)
  const [showContextualUsage, setShowContextualUsage] = useState(false)
  const [showAudioRecognition, setShowAudioRecognition] = useState(false)
  const [showSpellingPractice, setShowSpellingPractice] = useState(false)
  const [showSpotlight, setShowSpotlight] = useState(true)
  const [stats, setStats] = useState<LearningStats | null>(null)

  // Authentication
  const { user, checkingAuth, signOut } = useAuthentication()

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
      title: 'Smart Review',
      icon: <Target className="h-5 w-5" />,
      description: 'Review words at optimal intervals to boost long-term memory retention'
    },
    {
      id: 'contextual' as const,
      title: 'Word Explorer',
      icon: <Book className="h-5 w-5" />,
      description: 'Explore usage examples, collocations, and contexts for deeper understanding'
    }
  ]

  // Show vocabulary spotlight on first load
  if (showSpotlight) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="w-full max-w-4xl">
          <VocabularySpotlight
            onStartSRS={() => {
              setShowSpotlight(false)
              setShowSRSReview(true)
            }}
            onDismiss={() => setShowSpotlight(false)}
          />
        </div>
      </div>
    )
  }

  if (showSRSReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSRSReview(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 transition-colors hover:bg-indigo-700"
                >
                  <Target className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SRS Review Session</h1>
                  <p className="text-sm text-gray-500">Smart spaced repetition practice</p>
                </div>
              </div>
              <UserDropdown user={user} checkingAuth={checkingAuth} onSignOut={signOut} />
            </div>
          </div>
        </div>
        <EnhancedSRSFlashcard
          onComplete={() => setShowSRSReview(false)}
          onExit={() => setShowSRSReview(false)}
        />
      </div>
    )
  }

  if (showFlashcards) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFlashcards(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 transition-colors hover:bg-indigo-700"
                >
                  <Book className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Flashcard Practice</h1>
                  <p className="text-sm text-gray-500">Practice your vocabulary</p>
                </div>
              </div>
              <UserDropdown user={user} checkingAuth={checkingAuth} onSignOut={signOut} />
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
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowContextualUsage(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 transition-colors hover:bg-red-700"
                >
                  <Book className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Contextual Usage Practice</h1>
                  <p className="text-sm text-gray-500">Create sentences with vocabulary</p>
                </div>
              </div>
              <UserDropdown user={user} checkingAuth={checkingAuth} onSignOut={signOut} />
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
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAudioRecognition(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 transition-colors hover:bg-green-700"
                >
                  <Book className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Audio Recognition Practice</h1>
                  <p className="text-sm text-gray-500">Listen and identify words</p>
                </div>
              </div>
              <UserDropdown user={user} checkingAuth={checkingAuth} onSignOut={signOut} />
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
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSpellingPractice(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 transition-colors hover:bg-purple-700"
                >
                  <Book className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Spelling Practice</h1>
                  <p className="text-sm text-gray-500">Type words from pronunciation</p>
                </div>
              </div>
              <UserDropdown user={user} checkingAuth={checkingAuth} onSignOut={signOut} />
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                <Book className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FluentFlow</h1>
                <p className="text-sm text-gray-500">Vocabulary Learning Center</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Quick Stats */}
              <div className="hidden items-center space-x-6 text-sm md:flex">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {stats ? stats.wordsLearned + stats.phrasesLearned : 0}
                  </div>
                  <div className="text-gray-500">Items Learned</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{stats?.currentStreakDays || 0}</div>
                  <div className="text-gray-500">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {stats ? stats.totalWordsAdded + stats.totalPhrasesAdded : 0}
                  </div>
                  <div className="text-gray-500">Total Saved</div>
                </div>
              </div>
              <UserDropdown user={user} checkingAuth={checkingAuth} onSignOut={signOut} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <span
                    className={`mr-2 ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400'}`}
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          {activeTab === 'srs' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Smart Review System</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Our smart algorithm shows you words just before you're about to forget them. 
                  Review frequently at first, then less often as words move to long-term memory.
                </p>
              </div>
              <SRSDashboard
                onStartReview={() => setShowSRSReview(true)}
                onViewAllCards={() => setActiveTab('contextual')}
              />
            </div>
          )}

          {activeTab === 'practice' && (
            <div className="py-16 text-center">
              <Book className="mx-auto mb-4 h-16 w-16 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Active Practice Methods</h3>
              <p className="mx-auto mb-8 max-w-2xl text-gray-600">
                Interactive practice modes to reinforce vocabulary learning through different
                methods. Practice with flashcards, audio recognition, and spelling exercises.
              </p>
              <div className="mx-auto mb-8 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => setShowFlashcards(true)}
                  className="rounded-lg border-2 border-transparent bg-orange-50 p-4 text-center transition-colors hover:border-orange-200 hover:bg-orange-100"
                >
                  <div className="font-semibold text-orange-800">Flashcard Mode</div>
                  <div className="mt-1 text-xs text-orange-600">Word → Definition recall</div>
                </button>
                <button
                  onClick={() => setShowContextualUsage(true)}
                  className="rounded-lg border-2 border-transparent bg-red-50 p-4 text-center transition-colors hover:border-red-200 hover:bg-red-100"
                >
                  <div className="font-semibold text-red-800">Contextual Usage</div>
                  <div className="mt-1 text-xs text-red-600">Generate sentences</div>
                </button>
                <button
                  onClick={() => setShowAudioRecognition(true)}
                  className="rounded-lg border-2 border-transparent bg-green-50 p-4 text-center transition-colors hover:border-green-200 hover:bg-green-100"
                >
                  <div className="font-semibold text-green-800">Audio Recognition</div>
                  <div className="mt-1 text-xs text-green-600">Listen → identify word</div>
                </button>
                <button
                  onClick={() => setShowSpellingPractice(true)}
                  className="rounded-lg border-2 border-transparent bg-purple-50 p-4 text-center transition-colors hover:border-purple-200 hover:bg-purple-100"
                >
                  <div className="font-semibold text-purple-800">Spelling Practice</div>
                  <div className="mt-1 text-xs text-purple-600">Type from pronunciation</div>
                </button>
              </div>
              <div className="text-center">
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => setShowFlashcards(true)}
                    className="rounded-lg bg-orange-500 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-600"
                  >
                    Start Flashcard Practice
                  </button>
                  <button
                    onClick={() => setShowContextualUsage(true)}
                    className="rounded-lg bg-red-500 px-6 py-3 font-medium text-white transition-colors hover:bg-red-600"
                  >
                    Start Usage Practice
                  </button>
                  <button
                    onClick={() => setShowAudioRecognition(true)}
                    className="rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition-colors hover:bg-green-600"
                  >
                    Start Audio Practice
                  </button>
                  <button
                    onClick={() => setShowSpellingPractice(true)}
                    className="rounded-lg bg-purple-500 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-600"
                  >
                    Start Spelling Practice
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contextual' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Word Explorer</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Dive deep into your vocabulary. Generate usage examples, discover word collocations, 
                  and understand how words are used in different contexts.
                </p>
              </div>
              <EnhancedContextualLearning
                onNavigateToVideo={(loopId: string) => {
                  // TODO: Navigate to video with specific loop
                  console.log('Navigate to loop:', loopId)
                  alert(`Navigate to video loop: ${loopId}`)
                }}
              />
            </div>
          )}

          {activeTab === 'social' && <SocialGamification />}
        </div>

        {/* Get Started Section */}
        <div className="mt-8 rounded-lg bg-indigo-600 p-8 text-center text-white">
          <h3 className="mb-2 text-xl font-semibold">Ready to Start Learning?</h3>
          <p className="mb-6 text-indigo-100">
            Visit FluentFlow videos, analyze vocabulary, and star words to add them to your personal
            learning deck.
          </p>
          <div className="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <div className="text-sm text-indigo-200">
              1. Watch videos with FluentFlow → 2. Analyze vocabulary → 3. Star words to save → 4.
              Practice here!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VocabularyLearningNewTab
