import React, { useEffect, useState } from 'react'
import {
  Sparkles,
  BookOpen,
  Volume2,
  ArrowRight,
  Brain,
  Target,
  Clock,
  Lightbulb,
  Star,
  TrendingUp
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { userVocabularyService, type UserVocabularyItem } from '../../lib/services/user-vocabulary-service'
import { contextualLearningAIService } from '../../lib/services/contextual-learning-ai-service'
import { cn } from '../../lib/utils'

interface VocabularySpotlightProps {
  onStartSRS?: () => void
  onDismiss?: () => void
  className?: string
}

export const VocabularySpotlight: React.FC<VocabularySpotlightProps> = ({
  onStartSRS,
  onDismiss,
  className
}) => {
  const [spotlightWord, setSpotlightWord] = useState<UserVocabularyItem | null>(null)
  const [examples, setExamples] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0)
  const [dueCount, setDueCount] = useState(0)

  useEffect(() => {
    loadSpotlightData()
    
    // Auto-cycle through examples
    const interval = setInterval(() => {
      setCurrentExampleIndex(prev => (prev + 1) % Math.max(examples.length, 1))
    }, 3000)

    return () => clearInterval(interval)
  }, [examples.length])

  // Auto-redirect when all caught up (moved outside conditional to fix hooks order)
  useEffect(() => {
    if (!isLoading && !spotlightWord) {
      const timer = setTimeout(() => {
        onDismiss?.()
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, spotlightWord, onDismiss])

  const loadSpotlightData = async () => {
    setIsLoading(true)
    try {
      // Get vocabulary items due for review or learning
      const dueItems = await userVocabularyService.getItemsDueForReview()
      const newItems = await userVocabularyService.getUserVocabularyDeck({ 
        status: 'new', 
        limit: 10 
      })
      
      const allCandidates = [...dueItems, ...newItems]
      setDueCount(dueItems.length)

      if (allCandidates.length === 0) {
        setIsLoading(false)
        return
      }

      // Pick a random interesting word for spotlight
      const spotlightCandidate = allCandidates[Math.floor(Math.random() * allCandidates.length)]
      setSpotlightWord(spotlightCandidate)

      // Load contextual examples if available
      try {
        const contextualData = await contextualLearningAIService.getContextualDataForSRS(spotlightCandidate, undefined, {
          generateIfMissing: false // Don't generate for spotlight, just use cached
        })
        const exampleTexts = contextualData.examples.map(ex => ex.sentence).slice(0, 3)
        
        if (exampleTexts.length > 0) {
          setExamples(exampleTexts)
        } else if (spotlightCandidate.example) {
          setExamples([spotlightCandidate.example])
        } else {
          setExamples([`"${spotlightCandidate.text}" - ${spotlightCandidate.definition}`])
        }
      } catch (error) {
        console.error('Failed to load contextual data:', error)
        if (spotlightCandidate.example) {
          setExamples([spotlightCandidate.example])
        }
      }
    } catch (error) {
      console.error('Failed to load spotlight data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = 0.8
        speechSynthesis.speak(utterance)
      } catch (error) {
        console.error('Failed to play audio:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <Card className={cn("relative overflow-hidden border-0 shadow-2xl", className)}>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 opacity-90" />
        <CardContent className="relative p-8 text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-4 text-white" />
          <p className="text-white text-lg">Preparing your learning spotlight...</p>
        </CardContent>
      </Card>
    )
  }

  if (!spotlightWord) {
    return (
      <Card className={cn("relative overflow-hidden border-0 shadow-2xl", className)}>
        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 opacity-90" />
        <CardContent className="relative p-8 text-center">
          <Star className="h-12 w-12 mx-auto mb-4 text-white" />
          <h2 className="text-2xl font-bold text-white mb-2">All Caught Up! 🎉</h2>
          <p className="text-white/90 text-lg mb-4">
            No vocabulary due for review. You're doing great!
          </p>
          <p className="text-white/70 text-sm mb-4">
            Redirecting to dashboard in a few seconds...
          </p>
          <Button onClick={onDismiss} variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
            Continue Learning
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("relative overflow-hidden border-0 shadow-2xl", className)}>
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90" />
      <div className="absolute inset-0 opacity-20" 
           style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} 
      />
      
      <CardContent className="relative p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="h-6 w-6 text-white animate-pulse" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-400 rounded-full animate-ping" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Word Spotlight</h2>
              <p className="text-white/80 text-sm">Daily vocabulary focus</p>
            </div>
          </div>
          
          {dueCount > 0 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{dueCount}</div>
              <div className="text-white/80 text-xs">Due Today</div>
            </div>
          )}
        </div>

        {/* Main Word Display */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
              {spotlightWord.text}
            </h1>
            {('speechSynthesis' in window) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePlayAudio(spotlightWord.text)}
                className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full h-12 w-12 p-0"
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Word Info */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {spotlightWord.partOfSpeech && (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-sm">
                {spotlightWord.partOfSpeech}
              </Badge>
            )}
            <Badge 
              variant="secondary" 
              className={cn(
                "text-sm",
                spotlightWord.difficulty === 'beginner' && "bg-green-500/20 text-green-100 border-green-300/30",
                spotlightWord.difficulty === 'intermediate' && "bg-yellow-500/20 text-yellow-100 border-yellow-300/30",
                spotlightWord.difficulty === 'advanced' && "bg-red-500/20 text-red-100 border-red-300/30"
              )}
            >
              {spotlightWord.difficulty}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-sm">
              {spotlightWord.learningStatus}
            </Badge>
          </div>

          {/* Definition */}
          <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
            {spotlightWord.definition}
          </p>

          {/* Example Sentence with Animation */}
          {examples.length > 0 && (
            <div className="bg-white/10 rounded-xl p-6 mb-6 min-h-[80px] flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="h-5 w-5 text-white/60 mx-auto mb-2" />
                <p className="text-white/90 italic text-lg leading-relaxed transition-all duration-500 ease-in-out">
                  "{examples[currentExampleIndex]}"
                </p>
                {examples.length > 1 && (
                  <div className="flex justify-center mt-3 space-x-2">
                    {examples.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "h-2 w-2 rounded-full transition-all duration-300",
                          index === currentExampleIndex ? "bg-white" : "bg-white/40"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={onStartSRS}
            size="lg"
            className="bg-white text-indigo-600 hover:bg-gray-100 shadow-lg font-semibold px-8 py-3 text-lg"
          >
            <Target className="h-5 w-5 mr-2" />
            Start SRS Review
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="lg"
            className="text-white hover:bg-white/20 font-medium px-6"
          >
            Browse All Cards
          </Button>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-center gap-8 mt-8 pt-6 border-t border-white/20">
          <div className="text-center">
            <TrendingUp className="h-5 w-5 text-white/60 mx-auto mb-1" />
            <div className="text-white/90 text-sm font-medium">
              {spotlightWord.timesPracticed} practices
            </div>
          </div>
          <div className="text-center">
            <Clock className="h-5 w-5 text-white/60 mx-auto mb-1" />
            <div className="text-white/90 text-sm font-medium">
              {spotlightWord.intervalDays}d interval
            </div>
          </div>
          <div className="text-center">
            <Lightbulb className="h-5 w-5 text-white/60 mx-auto mb-1" />
            <div className="text-white/90 text-sm font-medium">
              {Math.round(spotlightWord.easeFactor * 100)/100} ease
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default VocabularySpotlight