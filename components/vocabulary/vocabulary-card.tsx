import React, { useState } from 'react'
import { Volume2, Globe, BookOpen, Lightbulb, MessageSquare } from 'lucide-react'
import type { VocabularyWord, VocabularyPhrase } from '../../lib/services/vocabulary-analysis-service'

interface VocabularyCardProps {
  item: VocabularyWord | VocabularyPhrase
  type: 'word' | 'phrase'
  onPlayAudio?: (text: string) => void
  className?: string
}

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  item,
  type,
  onPlayAudio,
  className = ''
}) => {
  const [showVietnamese, setShowVietnamese] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const isWord = type === 'word'
  const word = isWord ? (item as VocabularyWord) : null
  const phrase = !isWord ? (item as VocabularyPhrase) : null

  const handlePlayAudio = () => {
    const text = isWord ? word!.word : phrase!.phrase
    onPlayAudio?.(text)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getFrequencyDots = (frequency: number) => {
    const dots = Math.min(frequency, 5)
    return '●'.repeat(dots) + '○'.repeat(5 - dots)
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {isWord ? word!.word : phrase!.phrase}
          </h3>
          <button
            onClick={handlePlayAudio}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            title="Play pronunciation"
          >
            <Volume2 className="h-4 w-4 text-blue-600" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(item.difficulty)}`}>
            {item.difficulty}
          </span>
          <span className="text-xs text-gray-500" title={`Appears ${item.frequency} times`}>
            {getFrequencyDots(item.frequency)}
          </span>
        </div>
      </div>

      {/* Word-specific content */}
      {isWord && word && (
        <>
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BookOpen className="h-4 w-4" />
              <span className="font-medium">{word.partOfSpeech}</span>
              <span className="text-gray-400">•</span>
              <span className="font-mono text-blue-600">{word.pronunciation}</span>
            </div>
          </div>
        </>
      )}

      {/* Phrase-specific content */}
      {!isWord && phrase && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium capitalize">{phrase.type}</span>
          </div>
        </div>
      )}

      {/* Definition */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-gray-700">Definition</span>
          <button
            onClick={() => setShowVietnamese(!showVietnamese)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title={showVietnamese ? "Show English definition" : "Show Vietnamese definition"}
          >
            <Globe className="h-3 w-3 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {showVietnamese ? (item.definitionVi || item.definition) : item.definition}
        </p>
      </div>

      {/* Synonyms/Antonyms for words */}
      {isWord && word && (word.synonyms.length > 0 || word.antonyms.length > 0) && (
        <div className="mb-3 space-y-2">
          {word.synonyms.length > 0 && (
            <div>
              <span className="text-xs font-medium text-green-600">Synonyms:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {word.synonyms.map((synonym, index) => (
                  <span key={index} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                    {synonym}
                  </span>
                ))}
              </div>
            </div>
          )}
          {word.antonyms.length > 0 && (
            <div>
              <span className="text-xs font-medium text-red-600">Antonyms:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {word.antonyms.map((antonym, index) => (
                  <span key={index} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">
                    {antonym}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Example */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium text-gray-700">Example</span>
        </div>
        <p className="text-sm text-gray-600 italic leading-relaxed">
          "{item.example}"
        </p>
      </div>

      {/* Expand toggle for more content */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        {isExpanded ? 'Show less' : 'Show more details'}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">Frequency in segment:</span> {item.frequency} times
          </div>
          <div>
            <span className="font-medium">Learning tip:</span> 
            {isWord 
              ? `Practice using "${word!.word}" in different contexts to master its usage.`
              : `Listen for "${phrase!.phrase}" in native speech to understand natural usage.`
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default VocabularyCard