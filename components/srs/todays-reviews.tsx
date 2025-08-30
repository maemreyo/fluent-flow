import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Target, ArrowRight, Sparkles, Clock, BookOpen, Volume2 } from 'lucide-react'
import { Button } from '../ui/button'
import { userVocabularyService, type UserVocabularyItem } from '../../lib/services/user-vocabulary-service'

interface TodaysReviewsProps {
  dueCount: number
  newCount: number
  onStartReview?: () => void
  onViewAllCards?: () => void
}

export const TodaysReviews: React.FC<TodaysReviewsProps> = ({
  dueCount,
  newCount,
  onStartReview,
  onViewAllCards
}) => {
  const [previewWord, setPreviewWord] = useState<UserVocabularyItem | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const totalDue = dueCount + newCount

  useEffect(() => {
    if (totalDue > 0) {
      loadPreviewWord()
    }
  }, [dueCount, newCount])

  const loadPreviewWord = async () => {
    setIsLoadingPreview(true)
    try {
      const dueItems = await userVocabularyService.getItemsDueForReview()
      if (dueItems.length > 0) {
        // Get a random interesting word from due items
        const randomItem = dueItems[Math.floor(Math.random() * dueItems.length)]
        setPreviewWord(randomItem)
      } else {
        // If no due items, get new items
        const newItems = await userVocabularyService.getUserVocabularyDeck({ 
          status: 'new', 
          limit: 5 
        })
        if (newItems.length > 0) {
          const randomItem = newItems[Math.floor(Math.random() * newItems.length)]
          setPreviewWord(randomItem)
        }
      }
    } catch (error) {
      console.error('Failed to load preview word:', error)
    } finally {
      setIsLoadingPreview(false)
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

  if (totalDue === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 shadow-lg"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5" />
        <div className="relative p-8 text-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="mb-4 inline-block"
          >
            <Sparkles className="h-12 w-12 text-emerald-500" />
          </motion.div>
          <h3 className="text-2xl font-bold text-emerald-700 mb-2">All Caught Up! 🎉</h3>
          <p className="text-emerald-600/80 text-lg">
            No reviews due today. Great job staying on top of your learning!
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 backdrop-blur-sm shadow-2xl"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-600 opacity-90" />
      
      {/* Animated Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="relative p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Today's Reviews ⚡</h2>
              <p className="text-white/80 text-sm">Ready to boost your memory?</p>
            </div>
          </div>
          
          <div className="text-center bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
            <div className="text-4xl font-bold text-white">{totalDue}</div>
            <div className="text-white/80 text-sm font-medium">Cards Due</div>
          </div>
        </div>

        {/* Preview Word Section */}
        {previewWord && !isLoadingPreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 rounded-2xl p-6 mb-6 backdrop-blur-sm border border-white/20"
          >
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="h-5 w-5 text-white/60 mr-2" />
              <span className="text-white/80 text-sm font-medium">Preview Word</span>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <h3 className="text-3xl font-bold text-white tracking-tight">
                  {previewWord.text}
                </h3>
                {('speechSynthesis' in window) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(previewWord.text)}
                    className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-xl h-10 w-10 p-0 backdrop-blur-sm transition-all duration-300"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-white/90 text-lg mb-4 max-w-md mx-auto">
                {previewWord.definition}
              </p>
              <div className="text-white/70 text-sm">
                ...and {totalDue - 1} more waiting for you! 
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={onStartReview}
            size="lg"
            className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30 shadow-lg font-semibold px-8 py-4 text-lg rounded-2xl transition-all duration-300 group"
          >
            <Target className="h-6 w-6 mr-3 group-hover:scale-110 transition-transform" />
            Start Review Session
            <ArrowRight className="h-6 w-6 ml-3 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          {onViewAllCards && (
            <Button
              onClick={onViewAllCards}
              className="bg-transparent text-white hover:bg-white/10 font-medium px-6 py-4 border border-white/30 rounded-2xl transition-all duration-300"
            >
              View All Cards 📚
            </Button>
          )}
        </div>

        {/* Stats Footer */}
        <div className="flex items-center justify-center gap-8 mt-6 pt-6 border-t border-white/20">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{dueCount}</div>
            <div className="text-white/70 text-sm flex items-center gap-1 justify-center">
              <Clock className="h-3 w-3" />
              Due Cards
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{newCount}</div>
            <div className="text-white/70 text-sm flex items-center gap-1 justify-center">
              <Sparkles className="h-3 w-3" />
              New Cards
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default TodaysReviews