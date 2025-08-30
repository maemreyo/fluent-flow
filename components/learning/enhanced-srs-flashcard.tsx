import React, { useEffect, useState } from 'react'
import {
  ArrowRight,
  RotateCcw,
  Eye,
  Volume2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Brain,
  Target,
  BookOpen,
  MessageSquare,
  Lightbulb,
  X,
  Loader2
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { srsService, type SRSRating, type ReviewSession } from '../../lib/services/srs-service'
import { contextualLearningAIService, type UsageExample, type CollocationPattern } from '../../lib/services/contextual-learning-ai-service'
import type { UserVocabularyItem } from '../../lib/services/user-vocabulary-service'

interface EnhancedSRSFlashcardProps {
  onComplete?: () => void
  onExit?: () => void
  onSessionStats?: (stats: ReviewSession['sessionStats']) => void
  loopId?: string // For contextual learning cache
}

const RATING_CONFIG = {
  0: { label: 'Again', description: 'Complete blackout', color: 'from-red-500 to-red-600', icon: XCircle },
  1: { label: 'Again', description: 'Incorrect response', color: 'from-red-500 to-red-600', icon: XCircle },
  2: { label: 'Again', description: 'Incorrect but close', color: 'from-red-500 to-red-600', icon: XCircle },
  3: { label: 'Hard', description: 'Correct but difficult', color: 'from-orange-500 to-orange-600', icon: AlertCircle },
  4: { label: 'Good', description: 'Correct with effort', color: 'from-green-500 to-green-600', icon: CheckCircle },
  5: { label: 'Easy', description: 'Perfect recall', color: 'from-blue-500 to-blue-600', icon: Target }
}

export const EnhancedSRSFlashcard: React.FC<EnhancedSRSFlashcardProps> = ({
  onComplete,
  onExit,
  onSessionStats,
  loopId
}) => {
  const [session, setSession] = useState<ReviewSession | null>(null)
  const [currentCard, setCurrentCard] = useState<UserVocabularyItem | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedRating, setSelectedRating] = useState<SRSRating | null>(null)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  
  // Contextual learning data
  const [examples, setExamples] = useState<UsageExample[]>([])
  const [collocations, setCollocations] = useState<CollocationPattern[]>([])
  const [loadingContextual, setLoadingContextual] = useState(false)

  useEffect(() => {
    setIsSpeechSupported('speechSynthesis' in window)
    initializeSession()
  }, [])

  const initializeSession = async () => {
    setIsLoading(true)
    try {
      // Use resumeOrStartSession to check for existing session first
      const session = await srsService.resumeOrStartSession(20)
      setSession(session)
      
      if (session.cards.length > 0) {
        const currentCard = session.cards[session.currentIndex]
        setCurrentCard(currentCard)
        await loadContextualLearning(currentCard)
      }
    } catch (error) {
      console.error('Failed to initialize SRS session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadContextualLearning = async (card: UserVocabularyItem) => {
    setLoadingContextual(true)
    try {
      const result = await contextualLearningAIService.getContextualDataForSRS(card, loopId, {
        generateIfMissing: true,
        maxExamples: 3,
        maxCollocations: 4
      })
      
      setExamples(result.examples)
      setCollocations(result.collocations)
      
      if (result.generated) {
        console.log('Generated fresh contextual data for:', card.text)
      } else if (result.hasEnhancedData) {
        console.log('Using cached contextual data for:', card.text)
      }
    } catch (error) {
      console.error('Failed to load contextual learning data:', error)
    } finally {
      setLoadingContextual(false)
    }
  }

  const handleFlipCard = () => {
    setIsFlipped(true)
  }

  const handleRating = async (rating: SRSRating) => {
    if (isProcessing || !session || !currentCard) return
    
    setIsProcessing(true)
    setSelectedRating(rating)
    
    try {
      // Process the current card
      const updatedSession = await srsService.processCard(session.id, currentCard.id, rating)
      
      // Update session stats
      onSessionStats?.(updatedSession.sessionStats)
      
      // Move to next card or complete session
      if (updatedSession.currentIndex < updatedSession.cards.length) {
        const nextCard = updatedSession.cards[updatedSession.currentIndex]
        setCurrentCard(nextCard)
        setSession(updatedSession)
        setIsFlipped(false)
        setSelectedRating(null)
        await loadContextualLearning(nextCard)
      } else {
        // Session completed
        console.log('SRS Review session completed!')
        await srsService.completeSession(session.id)
        onComplete?.()
      }
    } catch (error) {
      console.error('Failed to process SRS rating:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = async () => {
    await initializeSession()
    setIsFlipped(false)
    setSelectedRating(null)
  }

  const handlePlayAudio = (text: string) => {
    if (!isSpeechSupported) return
    
    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('Failed to play audio:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-center py-16">
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-violet-500" />
              <p className="text-gray-600 text-lg">Starting your SRS review session...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session || !currentCard) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-center py-16">
            <div className="space-y-4 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Great work! 🎉
              </h2>
              <p className="text-gray-600 text-lg">No cards due for review right now.</p>
              <Button
                onClick={initializeSession}
                className="bg-gradient-to-r from-violet-500 to-emerald-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const progressPercentage = ((session.currentIndex) / session.cards.length) * 100
  const { sessionStats } = session

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4 min-h-screen bg-gradient-to-br from-violet-50 via-sky-50 to-emerald-50">
      {/* Progress Header - Modern Glass Design */}
      <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-emerald-500/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent">
                SRS Review Session
              </h2>
              <p className="text-gray-600 text-sm">
                Card {session.currentIndex + 1} of {session.cards.length} • 
                {sessionStats.correct}/{sessionStats.reviewed} correct
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-300"
              >
                <RotateCcw className="h-4 w-4 text-violet-600" />
              </button>
              <button
                onClick={onExit}
                className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-300"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Progress value={progressPercentage} className="h-3 bg-white/30 rounded-full overflow-hidden" />
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-emerald-500/20 rounded-full" 
                 style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>
      </div>

      {/* Main Flashcard - Modern Glass Design */}
      <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden min-h-[500px]">
        <div className="p-8 bg-gradient-to-r from-violet-500/5 via-blue-500/5 to-emerald-500/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent mb-3">
                {currentCard.text}
              </h1>
              <div className="flex items-center gap-3">
                {currentCard.partOfSpeech && (
                  <span className="px-3 py-1 rounded-xl bg-violet-100/70 text-violet-700 text-sm font-medium backdrop-blur-sm border border-violet-200/50">
                    {currentCard.partOfSpeech}
                  </span>
                )}
                <span className={cn(
                  'px-3 py-1 rounded-xl text-sm font-medium backdrop-blur-sm border',
                  currentCard.difficulty === 'beginner' && "bg-green-100/70 text-green-700 border-green-200/50",
                  currentCard.difficulty === 'intermediate' && "bg-blue-100/70 text-blue-700 border-blue-200/50",
                  currentCard.difficulty === 'advanced' && "bg-purple-100/70 text-purple-700 border-purple-200/50"
                )}>
                  {currentCard.difficulty}
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-100/70 text-emerald-700 text-sm font-medium backdrop-blur-sm border border-emerald-200/50">
                  {currentCard.learningStatus}
                </span>
              </div>
            </div>
            {isSpeechSupported && (
              <button
                onClick={() => handlePlayAudio(currentCard.text)}
                className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-300"
              >
                <Volume2 className="h-5 w-5 text-violet-600" />
              </button>
            )}
          </div>

          {!isFlipped ? (
            // Front of card
            <div className="space-y-6">
              <div className="text-center py-12">
                <Brain className="mx-auto h-16 w-16 text-violet-500 mb-4" />
                <p className="text-gray-600 text-lg mb-8">Think about the definition and example usage</p>
                <Button
                  onClick={handleFlipCard}
                  className="bg-gradient-to-r from-violet-500 to-blue-500 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Show Answer
                </Button>
              </div>
            </div>
          ) : (
            // Back of card
            <div className="space-y-6">
              {/* Definition */}
              <div className="rounded-2xl bg-white/50 backdrop-blur-sm border border-white/30 p-6">
                <h3 className="font-semibold text-violet-700 text-lg mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Definition
                </h3>
                <p className="text-gray-700 text-lg leading-relaxed">{currentCard.definition}</p>
                {currentCard.example && (
                  <div className="mt-4 p-4 rounded-xl bg-violet-50/50 border border-violet-200/30">
                    <p className="italic text-violet-700">"{currentCard.example}"</p>
                  </div>
                )}
              </div>

              {/* Examples and Collocations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Examples */}
                {examples.length > 0 && (
                  <div className="rounded-2xl bg-white/50 backdrop-blur-sm border border-white/30 p-6">
                    <h3 className="font-semibold text-blue-700 text-lg mb-3 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Usage Examples
                    </h3>
                    <div className="space-y-3">
                      {examples.slice(0, 3).map((example, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/30">
                          <p className="text-blue-700 text-sm">{example.sentence}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collocations */}
                {collocations.length > 0 && (
                  <div className="rounded-2xl bg-white/50 backdrop-blur-sm border border-white/30 p-6">
                    <h3 className="font-semibold text-emerald-700 text-lg mb-3 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Word combinations
                    </h3>
                    <div className="space-y-3">
                      {collocations.slice(0, 3).map((collocation, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/30">
                          <p className="text-emerald-700 text-sm font-medium">{collocation.pattern}</p>
                          <p className="text-emerald-600 text-xs mt-1">{collocation.frequency}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rating Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-white/20">
                {Object.entries(RATING_CONFIG).map(([rating, config]) => {
                  const Icon = config.icon
                  return (
                    <button
                      key={rating}
                      onClick={() => handleRating(Number(rating) as SRSRating)}
                      disabled={isProcessing}
                      className={cn(
                        "p-4 rounded-2xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2",
                        `bg-gradient-to-r ${config.color}`,
                        selectedRating === Number(rating) && "scale-105 ring-2 ring-white/50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm">{config.label}</span>
                      <span className="text-xs opacity-90">{config.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading indicator for contextual data */}
      {loadingContextual && (
        <div className="fixed bottom-4 right-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-white/20 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            <span className="text-sm text-gray-600">Loading examples...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedSRSFlashcard