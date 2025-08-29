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
  X
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Separator } from '../ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
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
  0: { label: 'Again', description: 'Complete blackout', color: 'bg-red-500 hover:bg-red-600 text-white', icon: XCircle },
  1: { label: 'Again', description: 'Incorrect response', color: 'bg-red-500 hover:bg-red-600 text-white', icon: XCircle },
  2: { label: 'Again', description: 'Incorrect but close', color: 'bg-red-500 hover:bg-red-600 text-white', icon: XCircle },
  3: { label: 'Hard', description: 'Correct but difficult', color: 'bg-orange-500 hover:bg-orange-600 text-white', icon: AlertCircle },
  4: { label: 'Good', description: 'Correct with effort', color: 'bg-green-500 hover:bg-green-600 text-white', icon: CheckCircle },
  5: { label: 'Easy', description: 'Perfect recall', color: 'bg-blue-500 hover:bg-blue-600 text-white', icon: Target }
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
        console.log('Loaded cached contextual data for:', card.text)
      } else {
        console.log('Using basic data for:', card.text)
      }
    } catch (error) {
      console.error('Failed to load contextual learning:', error)
      setExamples([])
      setCollocations([])
    } finally {
      setLoadingContextual(false)
    }
  }

  const handleFlipCard = () => {
    setIsFlipped(true)
  }

  const handleRating = async (rating: SRSRating) => {
    if (!currentCard || !session || isProcessing) return

    setIsProcessing(true)
    setSelectedRating(rating)

    try {
      // Process the review with SRS algorithm
      await srsService.processReview(currentCard.id, rating)
      
      // Update session stats
      const updatedStats = { ...session.sessionStats }
      updatedStats.reviewed += 1
      
      if (rating === 0 || rating === 1 || rating === 2) {
        updatedStats.again += 1
      } else if (rating === 3) {
        updatedStats.hard += 1
      } else if (rating === 4) {
        updatedStats.good += 1
      } else if (rating === 5) {
        updatedStats.easy += 1
      }
      
      if (rating >= 3) {
        updatedStats.correct += 1
      }

      const updatedSession = {
        ...session,
        currentIndex: session.currentIndex + 1,
        sessionStats: updatedStats
      }
      
      setSession(updatedSession)
      onSessionStats?.(updatedStats)

      // Save session state for persistence
      srsService.saveSession(updatedSession)

      // Short delay to show the rating
      setTimeout(() => {
        handleNextCard(updatedSession)
      }, 1000)

    } catch (error) {
      console.error('Failed to process rating:', error)
    }
  }

  const handleNextCard = async (updatedSession: ReviewSession) => {
    if (updatedSession.currentIndex >= updatedSession.cards.length) {
      // Session complete - clear saved session
      srsService.clearSession()
      onComplete?.()
      return
    }

    const nextCard = updatedSession.cards[updatedSession.currentIndex]
    setCurrentCard(nextCard)
    setIsFlipped(false)
    setSelectedRating(null)
    setIsProcessing(false)
    
    // Load contextual learning for next card
    await loadContextualLearning(nextCard)
  }

  const handleReset = () => {
    // Clear saved session when resetting
    srsService.clearSession()
    initializeSession()
    setIsFlipped(false)
    setSelectedRating(null)
    setIsProcessing(false)
    setExamples([])
    setCollocations([])
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
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Brain className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-500" />
            <p className="text-muted-foreground">Starting your SRS review session...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!session || !currentCard) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium mb-2">Great work!</p>
            <p className="text-muted-foreground">No cards due for review right now.</p>
            <Button onClick={initializeSession} className="mt-4">
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = ((session.currentIndex) / session.cards.length) * 100
  const { sessionStats } = session

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">
                Card {session.currentIndex + 1} of {session.cards.length}
              </p>
              <p className="text-xs text-muted-foreground">
                {sessionStats.correct}/{sessionStats.reviewed} correct
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button variant="ghost" size="sm" onClick={onExit}>
                <X className="h-4 w-4 mr-2" />
                Exit
              </Button>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Main Flashcard */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">{currentCard.text}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                {currentCard.partOfSpeech && (
                  <Badge variant="outline">{currentCard.partOfSpeech}</Badge>
                )}
                <Badge variant="secondary">{currentCard.difficulty}</Badge>
                <Badge variant="outline">{currentCard.learningStatus}</Badge>
              </CardDescription>
            </div>
            {isSpeechSupported && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handlePlayAudio(currentCard.text)}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!isFlipped ? (
            /* Front of card */
            <div className="text-center py-8">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Do you remember this word?</h3>
                <p className="text-muted-foreground">Try to recall the meaning and usage</p>
              </div>
              
              <Button onClick={handleFlipCard} size="lg" className="mt-4">
                <Eye className="h-4 w-4 mr-2" />
                Show Answer
              </Button>
            </div>
          ) : (
            /* Back of card with contextual learning */
            <div className="space-y-6">
              {/* Definition */}
              <div>
                <h3 className="font-medium text-lg mb-2">Definition</h3>
                <p className="text-gray-700">{currentCard.definition}</p>
                {currentCard.example && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm italic">{currentCard.example}</p>
                  </div>
                )}
              </div>

              {/* Enhanced content with tabs */}
              <Tabs defaultValue="examples" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="examples" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Examples {examples.length > 0 && `(${examples.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="collocations" className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Collocations {collocations.length > 0 && `(${collocations.length})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="examples" className="mt-4">
                  {loadingContextual ? (
                    <div className="flex items-center justify-center py-6">
                      <Brain className="h-5 w-5 animate-pulse mr-2" />
                      <span className="text-sm text-muted-foreground">Loading examples...</span>
                    </div>
                  ) : examples.length > 0 ? (
                    <div className="space-y-3">
                      {examples.slice(0, 3).map((example) => (
                        <div key={example.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm font-medium text-gray-800">{example.sentence}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{example.context}</Badge>
                            {example.domain && (
                              <Badge variant="secondary" className="text-xs">{example.domain}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <BookOpen className="h-6 w-6 mx-auto mb-2" />
                      <p className="text-sm">No cached examples available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="collocations" className="mt-4">
                  {loadingContextual ? (
                    <div className="flex items-center justify-center py-6">
                      <Brain className="h-5 w-5 animate-pulse mr-2" />
                      <span className="text-sm text-muted-foreground">Loading collocations...</span>
                    </div>
                  ) : collocations.length > 0 ? (
                    <div className="space-y-3">
                      {collocations.slice(0, 4).map((collocation) => (
                        <div key={collocation.id} className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">{collocation.pattern}</h4>
                            <div className="flex gap-1">
                              <Badge 
                                variant={collocation.frequency === 'common' ? 'default' : 'secondary'} 
                                className="text-xs"
                              >
                                {collocation.frequency}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{collocation.type}</Badge>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {collocation.examples.slice(0, 2).map((example, idx) => (
                              <p key={idx} className="text-xs text-gray-600 italic">• {example}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Lightbulb className="h-6 w-6 mx-auto mb-2" />
                      <p className="text-sm">No cached collocations available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Separator />

              {/* Rating Buttons */}
              <div className="space-y-3">
                <h3 className="font-medium">How well did you know this word?</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(RATING_CONFIG).map(([rating, config]) => {
                    const isSelected = selectedRating === parseInt(rating)
                    const Icon = config.icon
                    
                    return (
                      <Button
                        key={rating}
                        onClick={() => handleRating(parseInt(rating) as SRSRating)}
                        disabled={isProcessing}
                        className={cn(
                          'flex flex-col items-center justify-center h-16 transition-all',
                          isSelected ? config.color : 'border-2 hover:border-gray-400',
                          isProcessing && !isSelected && 'opacity-50'
                        )}
                        variant={isSelected ? "default" : "outline"}
                      >
                        <Icon className="h-4 w-4 mb-1" />
                        <span className="text-xs font-medium">{config.label}</span>
                        <span className="text-xs opacity-75">{config.description}</span>
                      </Button>
                    )
                  })}
                </div>
              </div>

              {selectedRating !== null && (
                <div className="text-center text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4 inline mr-1" />
                  Moving to next card...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Stats */}
      {sessionStats.reviewed > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-green-600">{sessionStats.correct}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">{sessionStats.again}</p>
                <p className="text-xs text-muted-foreground">Again</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-600">{sessionStats.hard}</p>
                <p className="text-xs text-muted-foreground">Hard</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">{sessionStats.easy}</p>
                <p className="text-xs text-muted-foreground">Easy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EnhancedSRSFlashcard