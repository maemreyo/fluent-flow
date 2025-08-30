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
      <div className={cn("relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl backdrop-blur-sm bg-white/70", className)}>
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-600 opacity-90" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        <div className="relative p-12 text-center">
          <Brain className="h-16 w-16 animate-pulse mx-auto mb-6 text-white" />
          <h3 className="text-2xl font-bold text-white mb-4">✨ Preparing Your Learning Spotlight...</h3>
          <p className="text-white/90 text-lg">Finding the perfect word for your vocabulary journey</p>
        </div>
      </div>
    )
  }

  if (!spotlightWord) {
    return (
      <div className={cn("relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl backdrop-blur-sm bg-white/70", className)}>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-90" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        <div className="relative p-12 text-center">
          <Star className="h-16 w-16 mx-auto mb-6 text-white animate-pulse" />
          <h3 className="text-3xl font-bold text-white mb-4">🎉 All Caught Up!</h3>
          <p className="text-white/90 text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Amazing work! No vocabulary due for review. You're mastering your learning journey! ⭐
          </p>
          <p className="text-white/70 text-sm mb-8">
            Redirecting to your dashboard in a few seconds...
          </p>
          <Button 
            onClick={onDismiss} 
            className="bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-xl px-8 py-3 font-semibold transition-all duration-300"
          >
            Continue Learning Journey ✨
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl backdrop-blur-sm bg-white/70", className)}>
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 opacity-90" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>
      
      <div className="relative p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-400 rounded-full animate-ping" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Word Spotlight ✨</h2>
              <p className="text-white/80 text-sm">Your daily vocabulary focus</p>
            </div>
          </div>
          
          {dueCount > 0 && (
            <div className="text-center bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
              <div className="text-3xl font-bold text-white">{dueCount}</div>
              <div className="text-white/80 text-xs font-medium">Due Today</div>
            </div>
          )}
        </div>

        {/* Main Word Display */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
              {spotlightWord.text}
            </h1>
            {('speechSynthesis' in window) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePlayAudio(spotlightWord.text)}
                className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-2xl h-14 w-14 p-0 backdrop-blur-sm transition-all duration-300"
              >
                <Volume2 className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Word Info */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {spotlightWord.partOfSpeech && (
              <Badge className="bg-white/20 text-white border-white/30 text-sm backdrop-blur-sm rounded-lg px-3 py-1">
                {spotlightWord.partOfSpeech}
              </Badge>
            )}
            <Badge 
              className={cn(
                "text-sm backdrop-blur-sm rounded-lg px-3 py-1",
                spotlightWord.difficulty === 'beginner' && "bg-green-500/20 text-green-100 border-green-300/30",
                spotlightWord.difficulty === 'intermediate' && "bg-yellow-500/20 text-yellow-100 border-yellow-300/30",
                spotlightWord.difficulty === 'advanced' && "bg-red-500/20 text-red-100 border-red-300/30"
              )}
            >
              {spotlightWord.difficulty}
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30 text-sm backdrop-blur-sm rounded-lg px-3 py-1">
              {spotlightWord.learningStatus}
            </Badge>
          </div>

          {/* Definition */}
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            {spotlightWord.definition}
          </p>

          {/* Example Sentence with Animation */}
          {examples.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-8 mb-8 backdrop-blur-sm border border-white/20">
              <div className="text-center">
                <BookOpen className="h-6 w-6 text-white/60 mx-auto mb-3" />
                <p className="text-white/90 italic text-lg leading-relaxed transition-all duration-500 ease-in-out">
                  "{examples[currentExampleIndex]}"
                </p>
                {examples.length > 1 && (
                  <div className="flex justify-center mt-4 space-x-2">
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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
          <Button
            onClick={onStartSRS}
            size="lg"
            className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30 shadow-lg font-semibold px-8 py-4 text-lg rounded-2xl transition-all duration-300"
          >
            <Target className="h-6 w-6 mr-3" />
            Start SRS Review
            <ArrowRight className="h-6 w-6 ml-3" />
          </Button>
          
          <Button
            onClick={onDismiss}
            className="bg-transparent text-white hover:bg-white/20 font-medium px-8 py-4 border border-white/30 rounded-2xl transition-all duration-300"
          >
            Browse All Cards 📚
          </Button>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-center gap-8 pt-6 border-t border-white/20">
          <div className="text-center bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
            <TrendingUp className="h-5 w-5 text-white/60 mx-auto mb-1" />
            <div className="text-white/90 text-sm font-medium">
              {spotlightWord.timesPracticed} practices
            </div>
          </div>
          <div className="text-center bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
            <Clock className="h-5 w-5 text-white/60 mx-auto mb-1" />
            <div className="text-white/90 text-sm font-medium">
              {spotlightWord.intervalDays}d interval
            </div>
          </div>
          <div className="text-center bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
            <Lightbulb className="h-5 w-5 text-white/60 mx-auto mb-1" />
            <div className="text-white/90 text-sm font-medium">
              {Math.round(spotlightWord.easeFactor * 100)/100} ease
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VocabularySpotlight