import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Clock, Hash, Lightbulb, Tag } from 'lucide-react'
import type { TranscriptSummary } from '../../lib/services/vocabulary-analysis-service'

interface TranscriptSummaryProps {
  summary: TranscriptSummary | null
  isLoading?: boolean
  className?: string
  defaultExpanded?: boolean
}

export const TranscriptSummaryComponent: React.FC<TranscriptSummaryProps> = ({
  summary,
  isLoading = false,
  className = '',
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Generating summary...</span>
        </div>
      </div>
    )
  }

  if (!summary) {
    return null
  }

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
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
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
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <h3 className="font-medium text-gray-900">Summary</h3>
          </div>
          <span
            className={`rounded-full border px-2 py-1 text-xs font-medium ${getDifficultyColor(summary.difficulty)}`}
          >
            {summary.difficulty} level
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{summary.estimatedReadingTime} min read</span>
          </div>
          <span className="text-gray-300">•</span>
          <span>{isExpanded ? 'Hide' : 'Show'} details</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-4 border-t border-gray-100 px-4 pb-4">
          {/* Main summary */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Overview</h4>
            <p className="text-sm leading-relaxed text-gray-700">{summary.summary}</p>
          </div>

          {/* Key points */}
          {summary.keyPoints.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-medium text-gray-900">Key Points</h4>
              </div>
              <ul className="space-y-2">
                {summary.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-800">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Topics */}
          {summary.topics.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-600" />
                <h4 className="text-sm font-medium text-gray-900">Topics Covered</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reading stats */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>~{summary.estimatedReadingTime} minute read</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  <span>Difficulty: {summary.difficulty}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TranscriptSummaryComponent
