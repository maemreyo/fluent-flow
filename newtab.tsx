import { useEffect, useState } from 'react'
import { Book, Target } from 'lucide-react'
import { AudioRecognitionPractice } from './components/learning/audio-recognition-practice'
import { ContextualUsagePractice } from './components/learning/contextual-usage-practice'
import EnhancedSRSFlashcard from './components/learning/enhanced-srs-flashcard'
import { FlashcardPractice } from './components/learning/flashcard-practice'
import { SpellingPractice } from './components/learning/spelling-practice'
import VocabularySpotlight from './components/learning/vocabulary-spotlight'
import { GetStartedSection } from './components/newtab/get-started-section'
import { ModernHeader } from './components/newtab/modern-header'
import { ModernTabContent } from './components/newtab/modern-tab-content'
import { ModernTabNavigation } from './components/newtab/modern-tab-navigation'
import { UserDropdown } from './components/shared/UserDropdown'
import { useAuthentication } from './lib/hooks/use-authentication'
import { userVocabularyService, type LearningStats } from './lib/services/user-vocabulary-service'
import './styles/newtab.css'

function VocabularyLearningNewTab() {
  const [activeTab, setActiveTab] = useState<'srs' | 'contextual'>('srs')
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-sky-50 to-emerald-50">
      <ModernHeader user={user} checkingAuth={checkingAuth} signOut={signOut} stats={stats} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ModernTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <ModernTabContent
          activeTab={activeTab}
          onStartReview={() => setShowSRSReview(true)}
          onViewAllCards={() => setShowFlashcards(true)}
          onNavigateToVideo={(loopId: string) => {
            console.log('Navigate to loop:', loopId)
            alert(`Navigate to video loop: ${loopId}`)
          }}
        />

        <GetStartedSection />
      </div>
    </div>
  )
}

export default VocabularyLearningNewTab
