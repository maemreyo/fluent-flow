import React, { useState, useEffect } from 'react'
import { Volume2, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import { userVocabularyService, type UserVocabularyItem } from '../../lib/services/user-vocabulary-service'
import { Badge } from '../ui/badge'

interface FlashcardPracticeProps {
  onComplete?: () => void
}

export const FlashcardPractice: React.FC<FlashcardPracticeProps> = ({ onComplete }) => {
  const [items, setItems] = useState<UserVocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showVietnamese, setShowVietnamese] = useState(false)

  const currentItem = items[currentIndex]

  // Load vocabulary items due for review
  useEffect(() => {
    const loadItems = async () => {
      setIsLoading(true)
      try {
        const reviewItems = await userVocabularyService.getItemsDueForReview()
        if (reviewItems.length === 0) {
          // If no items due for review, get some recent items
          const recentItems = await userVocabularyService.getUserVocabularyDeck({ limit: 10 })
          setItems(recentItems)
        } else {
          setItems(reviewItems)
        }
      } catch (error) {
        console.error('Failed to load practice items:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadItems()
  }, [])

  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  const handleResponse = (correct: boolean) => {
    // TODO: Implement SRS algorithm update based on user response
    console.log(`User response for "${currentItem?.text}":`, correct ? 'Correct' : 'Incorrect')
    
    // Move to next card or complete
    if (currentIndex + 1 >= items.length) {
      onComplete?.()
    } else {
      setCurrentIndex(currentIndex + 1)
      setShowAnswer(false)
      setShowVietnamese(false)
    }
  }

  const handlePlayAudio = () => {
    if (currentItem) {
      // Use Web Speech API for pronunciation
      const utterance = new SpeechSynthesisUtterance(currentItem.text)
      utterance.lang = 'en-US'
      speechSynthesis.speak(utterance)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vocabulary to Practice</h3>
          <p className="text-gray-600 mb-4">
            Start by watching videos and starring vocabulary words to add them to your personal deck.
          </p>
          <button
            onClick={onComplete}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Browse Vocabulary
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Card {currentIndex + 1} of {items.length}</span>
          <span>{Math.round(((currentIndex + 1) / items.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 min-h-[400px] flex flex-col">
        {/* Card Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-xs">
                {currentItem.itemType === 'word' ? 'Word' : 'Phrase'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {currentItem.difficulty}
              </Badge>
            </div>
            <button
              onClick={handlePlayAudio}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Play pronunciation"
            >
              <Volume2 className="h-5 w-5 text-blue-600" />
            </button>
          </div>
        </div>

        {/* Card Content */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
          {!showAnswer ? (
            // Question side
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{currentItem.text}</h2>
              {currentItem.itemType === 'word' && currentItem.partOfSpeech && (
                <Badge variant="secondary" className="mb-4">
                  {currentItem.partOfSpeech}
                </Badge>
              )}
              {currentItem.pronunciation && (
                <p className="text-lg text-blue-600 font-mono mb-6">{currentItem.pronunciation}</p>
              )}
              <p className="text-gray-600 text-lg mb-8">What does this mean?</p>
              <button
                onClick={handleShowAnswer}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Show Answer
              </button>
            </div>
          ) : (
            // Answer side
            <div className="w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{currentItem.text}</h2>
              
              {/* Definition */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-purple-600">Definition</h3>
                  <button
                    onClick={() => setShowVietnamese(!showVietnamese)}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{showVietnamese ? 'EN' : 'VI'}</span>
                  </button>
                </div>
                <p className="text-lg text-gray-800">
                  {showVietnamese && currentItem.definitionVi 
                    ? currentItem.definitionVi 
                    : currentItem.definition
                  }
                </p>
              </div>

              {/* Example */}
              {currentItem.example && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-blue-600 mb-2">Example</h3>
                  <p className="text-gray-700 italic">"{currentItem.example}"</p>
                </div>
              )}

              {/* Response buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => handleResponse(false)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-red-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                  <span>Hard</span>
                </button>
                <button
                  onClick={() => handleResponse(true)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Easy</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Skip button */}
      <div className="text-center mt-4">
        <button
          onClick={() => handleResponse(false)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          Skip this card
        </button>
      </div>
    </div>
  )
}

export default FlashcardPractice