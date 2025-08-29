import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Globe, Volume2 } from 'lucide-react'
import type {
  VocabularyPhrase,
  VocabularyWord
} from '../../lib/services/vocabulary-analysis-service'
import { Badge } from '../ui/badge'

interface VocabularyItemCompactProps {
  item: VocabularyWord | VocabularyPhrase
  type: 'word' | 'phrase'
  onPlayAudio?: (text: string) => void
}

export const VocabularyItemCompact: React.FC<VocabularyItemCompactProps> = ({
  item,
  type,
  onPlayAudio
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showVietnamese, setShowVietnamese] = useState(false)

  const isWord = type === 'word'
  const word = isWord ? (item as VocabularyWord) : null
  const phrase = !isWord ? (item as VocabularyPhrase) : null
  const text = isWord ? word!.word : phrase!.phrase

  const handlePlayAudio = () => {
    onPlayAudio?.(text)
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
                  <Badge variant="secondary" className="text-xs">{word.partOfSpeech}</Badge>
                  <span className="font-mono text-xs text-blue-600">{word.pronunciation}</span>
                </>
              )}
              
              {/* Type for phrases */}
              {!isWord && phrase && (
                <Badge variant="outline" className="text-xs capitalize">{phrase.type}</Badge>
              )}
              
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setShowVietnamese(!showVietnamese)
                  }}
                  className="rounded p-1 transition-colors hover:bg-gray-100"
                  title={showVietnamese ? 'Show English definition' : 'Show Vietnamese definition'}
                >
                  <Globe className="h-3 w-3 text-gray-500" />
                </button>

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

                <Badge 
                  variant="outline"
                  className={`text-xs ${getDifficultyColor(item.difficulty)}`}
                >
                  {item.difficulty}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="space-y-3 border-t border-gray-100 px-3 pb-3">
          {/* Definition */}
          <div>
            <span className="text-xs font-medium text-purple-600">Definition:</span>
            <p className="mt-1 text-sm text-gray-700">
              {showVietnamese ? item.definitionVi || item.definition : item.definition}
            </p>
          </div>

          {/* Example */}
          <div>
            <span className="text-xs font-medium text-blue-600">Example:</span>
            <p className="mt-1 text-sm italic text-gray-600">"{item.example}"</p>
          </div>

          {/* Word-specific details: Synonyms and Antonyms in 2-column layout */}
          {isWord && word && (word.synonyms.length > 0 || word.antonyms.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {/* Synonyms column */}
              <div>
                {word.synonyms.length > 0 && (
                  <>
                    <span className="text-xs font-medium text-green-600">Synonyms:</span>
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

              {/* Antonyms column */}
              <div>
                {word.antonyms.length > 0 && (
                  <>
                    <span className="text-xs font-medium text-red-600">Antonyms:</span>
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
