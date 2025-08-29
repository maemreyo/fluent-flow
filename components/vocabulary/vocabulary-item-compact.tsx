import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Globe, Volume2 } from 'lucide-react'
import type {
  VocabularyPhrase,
  VocabularyWord
} from '../../lib/services/vocabulary-analysis-service'
import { userVocabularyService } from '../../lib/services/user-vocabulary-service'
import { Badge } from '../ui/badge'

interface VocabularyItemCompactProps {
  item: VocabularyWord | VocabularyPhrase
  type: 'word' | 'phrase'
  onPlayAudio?: (text: string) => void
  sourceLoopId?: string
}

export const VocabularyItemCompact: React.FC<VocabularyItemCompactProps> = ({
  item,
  type,
  onPlayAudio,
  sourceLoopId
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showVietnamese, setShowVietnamese] = useState(false)
  const [isStarred, setIsStarred] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isWord = type === 'word'
  const word = isWord ? (item as VocabularyWord) : null
  const phrase = !isWord ? (item as VocabularyPhrase) : null
  const text = isWord ? word!.word : phrase!.phrase

  // Check if item is already starred when component mounts
  useEffect(() => {
    const checkStarStatus = async () => {
      const starred = await userVocabularyService.isInPersonalDeck(text, type)
      setIsStarred(starred)
    }
    checkStarStatus()
  }, [text, type])

  const handlePlayAudio = () => {
    onPlayAudio?.(text)
  }

  const handleStarClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLoading(true)

    try {
      if (isStarred) {
        // Remove from personal deck
        const success = await userVocabularyService.removeFromPersonalDeck(text, type)
        if (success) {
          setIsStarred(false)
          console.log('Removed from personal deck:', text)
        }
      } else {
        // Add to personal deck
        const result = await userVocabularyService.addToPersonalDeck(item, type, sourceLoopId)
        if (result) {
          setIsStarred(true)
          console.log('Added to personal deck:', text)
        }
      }
    } catch (error) {
      console.error('Failed to update star status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPartOfSpeechColor = (pos: string) => {
    const lowerPos = pos.toLowerCase()
    if (lowerPos.includes('noun')) return 'bg-blue-100 text-blue-800'
    if (lowerPos.includes('verb')) return 'bg-green-100 text-green-800'
    if (lowerPos.includes('adjective')) return 'bg-purple-100 text-purple-800'
    if (lowerPos.includes('adverb')) return 'bg-orange-100 text-orange-800'
    if (lowerPos.includes('preposition')) return 'bg-pink-100 text-pink-800'
    if (lowerPos.includes('conjunction')) return 'bg-indigo-100 text-indigo-800'
    if (lowerPos.includes('pronoun')) return 'bg-teal-100 text-teal-800'
    if (lowerPos.includes('interjection')) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Compact header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full flex-col items-start justify-between gap-2 p-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-row flex-wrap items-center gap-2">
              <span className="font-medium text-gray-900">{text}</span>

              {/* Part of speech and pronunciation for words */}
              {isWord && word && (
                <>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getPartOfSpeechColor(word.partOfSpeech)}`}
                  >
                    {word.partOfSpeech}
                  </Badge>
                  <span className="font-mono text-xs text-blue-600">{word.pronunciation}</span>
                </>
              )}

              {/* Type for phrases */}
              {!isWord && phrase && (
                <Badge variant="outline" className="text-xs capitalize">
                  {phrase.type}
                </Badge>
              )}

              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handlePlayAudio()
                  }}
                  className="rounded p-1 transition-colors hover:bg-gray-100"
                  title="Play pronunciation"
                >
                  <Volume2 className="h-3 w-3 text-blue-600" />
                </button>
                
                {/* Star button for saving to personal deck */}
                <button
                  onClick={handleStarClick}
                  disabled={isLoading}
                  className={`rounded p-1 transition-colors hover:bg-gray-100 ${
                    isStarred ? 'text-yellow-500' : 'text-gray-400'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isStarred ? 'Remove from personal deck' : 'Save to personal deck'}
                >
                  {isLoading ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <svg 
                      className="h-3 w-3" 
                      fill={isStarred ? 'currentColor' : 'none'} 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      viewBox="0 0 24 24"
                    >
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="space-y-4 border-t border-gray-100 px-3 pb-3">
          {/* Language toggle and difficulty level */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowVietnamese(!showVietnamese)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-gray-100"
                title={showVietnamese ? 'Show English definition' : 'Show Vietnamese definition'}
              >
                <Globe className="h-3 w-3 text-gray-500" />
                {showVietnamese ? 'EN' : 'VI'}
              </button>
            </div>

            <Badge variant="outline" className={`text-xs ${getDifficultyColor(item.difficulty)}`}>
              {item.difficulty}
            </Badge>
          </div>

          {/* Definition */}
          <div>
            <span className="text-xs font-semibold text-purple-600">Definition</span>
            <p className="mt-1 text-sm text-gray-700">
              {showVietnamese ? item.definitionVi || item.definition : item.definition}
            </p>
          </div>

          {/* Example */}
          <div>
            <span className="text-xs font-semibold text-blue-600">Example</span>
            <p className="mt-1 text-sm italic text-gray-600">"{item.example}"</p>
          </div>

          {/* Word-specific details: Synonyms and Antonyms in 2-column layout with separator */}
          {isWord && word && (word.synonyms.length > 0 || word.antonyms.length > 0) && (
            <div className="relative grid grid-cols-2 gap-4">
              {/* Synonyms column */}
              <div className="flex flex-col items-start gap-2">
                {word.synonyms.length > 0 && (
                  <>
                    <span className="text-xs font-semibold text-green-600">Synonyms</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {word.synonyms.map((synonym, index) => (
                        <span
                          key={index}
                          className="rounded bg-green-50 px-2 py-1 text-xs text-green-700"
                        >
                          {synonym}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Vertical separator */}
              <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 transform bg-gray-200"></div>

              {/* Antonyms column */}
              <div className="flex flex-col items-end gap-2">
                {word.antonyms.length > 0 && (
                  <>
                    <span className="text-right text-xs font-semibold text-red-600">Antonyms</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {word.antonyms.map((antonym, index) => (
                        <span
                          key={index}
                          className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                        >
                          {antonym}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Frequency indicator */}
          <div className="text-xs text-gray-500">
            <span>
              Appears {item.frequency} time{item.frequency !== 1 ? 's' : ''} in transcript
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default VocabularyItemCompact