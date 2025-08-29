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
  Target
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { srsService, type SRSRating, type ReviewSession } from '../../lib/services/srs-service'
import type { UserVocabularyItem } from '../../lib/services/user-vocabulary-service'

interface SRSFlashcardReviewProps {
  onComplete?: () => void
  onSessionStats?: (stats: ReviewSession['sessionStats']) => void
}

const RATING_CONFIG = {
  0: { label: 'Again', description: 'Complete blackout', color: 'bg-red-500 hover:bg-red-600 text-white', icon: XCircle },
  1: { label: 'Again', description: 'Incorrect response', color: 'bg-red-500 hover:bg-red-600 text-white', icon: XCircle },
  2: { label: 'Again', description: 'Incorrect but close', color: 'bg-red-500 hover:bg-red-600 text-white', icon: XCircle },
  3: { label: 'Hard', description: 'Correct but difficult', color: 'bg-orange-500 hover:bg-orange-600 text-white', icon: AlertCircle },
  4: { label: 'Good', description: 'Correct with effort', color: 'bg-green-500 hover:bg-green-600 text-white', icon: CheckCircle },
  5: { label: 'Easy', description: 'Perfect recall', color: 'bg-blue-500 hover:bg-blue-600 text-white', icon: Target }
}

export const SRSFlashcardReview: React.FC<SRSFlashcardReviewProps> = ({
  onComplete,
  onSessionStats
}) => {
  const [session, setSession] = useState<ReviewSession | null>(null)
  const [currentCard, setCurrentCard] = useState<UserVocabularyItem | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedRating, setSelectedRating] = useState<SRSRating | null>(null)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)

  useEffect(() => {
    setIsSpeechSupported('speechSynthesis' in window)
    initializeSession()
  }, [])

  const initializeSession = async () => {
    setIsLoading(true)
    try {
      const newSession = await srsService.startReviewSession(20)
      setSession(newSession)
      if (newSession.cards.length > 0) {
        setCurrentCard(newSession.cards[0])
      }
    } catch (error) {
      console.error('Failed to initialize SRS session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const speakWord = (text: string) => {
    if (!isSpeechSupported) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const handleRating = async (rating: SRSRating) => {
    if (!currentCard || !session || isProcessing) return
    
    setIsProcessing(true)
    setSelectedRating(rating)

    try {
      // Process the review using SM-2 algorithm
      await srsService.processReview(currentCard.id, rating)
      
      // Update session stats
      const updatedStats = { ...session.sessionStats }
      updatedStats.reviewed++
      if (rating >= 3) updatedStats.correct++
      
      switch (rating) {
        case 0:
        case 1:
        case 2:
          updatedStats.again++
          break
        case 3:
          updatedStats.hard++
          break
        case 4:
          updatedStats.good++
          break
        case 5:
          updatedStats.easy++
          break
      }

      const updatedSession = { ...session, sessionStats: updatedStats }
      setSession(updatedSession)
      onSessionStats?.(updatedStats)

      // Auto-advance after a short delay
      setTimeout(() => {
        handleNextCard()
      }, 1500)

    } catch (error) {
      console.error('Failed to process rating:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNextCard = () => {
    if (!session) return

    const nextIndex = session.currentIndex + 1
    if (nextIndex >= session.cards.length) {
      onComplete?.()
      return
    }

    const updatedSession = { ...session, currentIndex: nextIndex }
    setSession(updatedSession)
    setCurrentCard(session.cards[nextIndex])
    setIsFlipped(false)
    setSelectedRating(null)
  }

  const handleFlipCard = () => {
    setIsFlipped(true)
  }

  const handleReset = () => {
    setIsFlipped(false)
    setSelectedRating(null)
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-12">
        <div className="space-y-4 text-center">
          <Brain className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Preparing your review session...</p>
        </div>
      </div>
    )
  }

  if (!session || !currentCard || session.cards.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <CardHeader>
          <Target className="mx-auto h-16 w-16 text-muted-foreground" />
          <CardTitle>No Reviews Available</CardTitle>
          <CardDescription>
            Great job! You're all caught up with your reviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onComplete}>Return to Learning</Button>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = ((session.currentIndex + 1) / session.cards.length) * 100

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header with Progress */}
      <header className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Spaced Repetition Review</h1>
            <p className="text-muted-foreground">
              Active recall practice with adaptive scheduling
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold text-primary">
              {session.currentIndex + 1} / {session.cards.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Accuracy: {session.sessionStats.reviewed > 0 
                ? Math.round((session.sessionStats.correct / session.sessionStats.reviewed) * 100)
                : 0}%
            </div>
          </div>
        </div>
        <Progress value={progressPercentage} />
      </header>

      {/* Main Flashcard */}
      <Card className="relative min-h-[400px] bg-gradient-to-br from-background to-muted/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {currentCard.itemType}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {currentCard.difficulty}
              </Badge>
              {currentCard.learningStatus === 'new' && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  New
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSpeechSupported && (
                <Button variant="ghost" size="icon" onClick={() => speakWord(currentCard.text)}>
                  <Volume2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!isFlipped ? (
            /* Front of Card - Question */
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
              <h2 className="text-4xl font-bold mb-4">{currentCard.text}</h2>
              {currentCard.pronunciation && (
                <p className="text-lg text-muted-foreground font-mono mb-6">
                  {currentCard.pronunciation}
                </p>
              )}
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Try to recall the meaning, then click to reveal the answer.
                </p>
                <Button onClick={handleFlipCard} size="lg" className="px-8">
                  <Eye className="mr-2 h-4 w-4" />
                  Show Answer
                </Button>
              </div>
            </div>
          ) : (
            /* Back of Card - Answer */
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">{currentCard.text}</h2>
                {currentCard.pronunciation && (
                  <p className="text-lg text-muted-foreground font-mono mb-4">
                    {currentCard.pronunciation}
                  </p>
                )}
              </div>
              
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="font-semibold mb-2">Definition:</h3>
                <p className="text-muted-foreground">{currentCard.definition}</p>
                {currentCard.definitionVi && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    {currentCard.definitionVi}
                  </p>
                )}
              </div>

              {currentCard.example && (
                <div className="rounded-lg bg-primary/5 p-4">
                  <h3 className="font-semibold mb-2">Example:</h3>
                  <p className="italic">"{currentCard.example}"</p>
                </div>
              )}

              {currentCard.partOfSpeech && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Part of speech:</span>
                  <Badge variant="outline">{currentCard.partOfSpeech}</Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Buttons - Only show when flipped */}
      {isFlipped && !isProcessing && selectedRating === null && (
        <Card className="bg-muted/20">
          <CardHeader>
            <CardTitle className="text-center">How well did you recall this word?</CardTitle>
            <CardDescription className="text-center">
              Your rating helps optimize when you'll see this word again
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(RATING_CONFIG).map(([rating, config]) => {
                const IconComponent = config.icon
                return (
                  <Button
                    key={rating}
                    onClick={() => handleRating(Number(rating) as SRSRating)}
                    className={cn(
                      'h-auto flex-col gap-2 p-4 text-center',
                      config.color
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                    <div>
                      <div className="font-semibold">{config.label}</div>
                      <div className="text-xs opacity-90">{config.description}</div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing/Result State */}
      {isProcessing && (
        <Card className="bg-muted/20">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 animate-pulse text-primary" />
              <span>Processing your response...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedRating !== null && !isProcessing && (
        <Card className={cn(
          "border-l-4",
          selectedRating >= 3 
            ? "border-green-500 bg-green-50/50 dark:bg-green-900/20" 
            : "border-red-500 bg-red-50/50 dark:bg-red-900/20"
        )}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              {selectedRating >= 3 ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <p className="font-semibold">
                  Rated as: {RATING_CONFIG[selectedRating].label}
                </p>
                <p className="text-sm text-muted-foreground">
                  This will adjust your review schedule
                </p>
              </div>
            </div>
            <Button onClick={handleNextCard} className="ml-4">
              {session.currentIndex + 1 >= session.cards.length ? 'Complete Session' : 'Next Card'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Session Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{session.sessionStats.correct}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{session.sessionStats.again}</div>
            <div className="text-sm text-muted-foreground">Again</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{session.sessionStats.hard}</div>
            <div className="text-sm text-muted-foreground">Hard</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{session.sessionStats.easy}</div>
            <div className="text-sm text-muted-foreground">Easy</div>
          </CardContent>
        </Card>
      </div>

      {/* Exit Button */}
      <div className="pt-4 text-center">
        <Button variant="ghost" onClick={onComplete}>
          Exit Review Session
        </Button>
      </div>
    </div>
  )
}

export default SRSFlashcardReview