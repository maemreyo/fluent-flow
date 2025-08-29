import React, { useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import type { VocabularyAnalysisResult } from '../../lib/services/vocabulary-analysis-service'
import { Button } from '../ui/button'
import VocabularyItemCompact from './vocabulary-item-compact'

interface VocabularySectionCollapsibleProps {
  analysis: VocabularyAnalysisResult | null
  isLoading: boolean
  onAnalyze: () => void
  onPlayAudio?: (text: string) => void
  defaultExpanded?: boolean
}

export const VocabularySectionCollapsible: React.FC<VocabularySectionCollapsibleProps> = ({
  analysis,
  isLoading,
  onAnalyze,
  onPlayAudio,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const totalItems = (analysis?.words?.length || 0) + (analysis?.phrases?.length || 0)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <BookOpen className="h-5 w-5 text-green-600" />
            <h3 className="font-medium text-gray-900">Vocabulary</h3>
          </div>

          {analysis && (
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-xs font-medium ${getDifficultyColor(analysis.difficultyLevel)}`}
              >
                {analysis.difficultyLevel}
              </span>
            </div>
          )}

          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          {analysis && (
            <>
              <span className="text-gray-300">•</span>
              <span>{analysis.totalWords} total words</span>
              <span className="text-gray-300">•</span>
            </>
          )}
          <span>{isExpanded ? 'Hide' : 'Show'}</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-sm text-gray-600">Analyzing vocabulary...</span>
            </div>
          )}

          {!analysis && !isLoading && (
            <div className="py-6 text-center">
              <p className="mb-3 text-sm text-gray-600">No vocabulary analysis available.</p>
              <Button variant="default" size="sm" onClick={onAnalyze}>
                <BookOpen className="h-4 w-4" />
                Analyze Vocabulary
              </Button>
            </div>
          )}

          {analysis && !isLoading && (
            <div className="space-y-4 pt-4">
              {/* Focus words suggestion */}
              {analysis.suggestedFocusWords.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <h4 className="mb-2 text-sm font-medium text-blue-900">
                    📚 Suggested Focus Words
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.suggestedFocusWords.map((word, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Vocabulary items */}
              <div className="space-y-2">
                {/* Words */}
                {analysis.words.map((word, index) => (
                  <VocabularyItemCompact
                    key={`word-${index}`}
                    item={word}
                    type="word"
                    onPlayAudio={onPlayAudio}
                  />
                ))}

                {/* Phrases */}
                {analysis.phrases.map((phrase, index) => (
                  <VocabularyItemCompact
                    key={`phrase-${index}`}
                    item={phrase}
                    type="phrase"
                    onPlayAudio={onPlayAudio}
                  />
                ))}
              </div>

              {/* Stats footer */}
              <div className="border-t border-gray-100 pt-3 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span>{analysis.words.length} words</span>
                    <span>{analysis.phrases.length} phrases</span>
                    <span>{analysis.uniqueWords} unique terms</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VocabularySectionCollapsible
