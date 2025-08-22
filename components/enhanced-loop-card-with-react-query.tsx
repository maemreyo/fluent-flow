import React from 'react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  MessageSquare, 
  Clock, 
  Target,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useTranscriptQuery } from '../lib/hooks/use-transcript-query'
import { useQuestionsQuery } from '../lib/hooks/use-question-query'
import type { SavedLoop } from '../lib/types/fluent-flow-types'

interface EnhancedLoopCardWithReactQueryProps {
  loop: SavedLoop
  onApply?: (loop: SavedLoop) => void
  onDelete?: (loopId: string) => void
  isApplying?: boolean
}

export function EnhancedLoopCardWithReactQuery({ 
  loop, 
  onApply, 
  onDelete, 
  isApplying = false 
}: EnhancedLoopCardWithReactQueryProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  
  // Use React Query for transcript data
  const {
    data: transcriptData,
    isLoading: transcriptLoading,
    error: transcriptError,
    refetch: refetchTranscript
  } = useTranscriptQuery(
    loop.videoId,
    loop.startTime,
    loop.endTime
  )

  // Use React Query for questions data - assuming we have a segment ID
  const segmentId = loop.id // In real implementation, this would be the actual segment ID
  const {
    data: questionsData,
    isLoading: questionsLoading,
    error: questionsError,
    refetch: refetchQuestions
  } = useQuestionsQuery(segmentId)

  const formatDuration = (start: number, end: number) => {
    const duration = end - start
    return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const renderTranscriptSection = () => {
    if (!showTranscript) return null

    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Transcript</h4>
          <div className="flex items-center gap-2">
            {transcriptLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {transcriptError && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Error</span>
              </div>
            )}
            {transcriptData && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs">Loaded</span>
              </div>
            )}
          </div>
        </div>
        
        {transcriptLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Loading transcript...</span>
          </div>
        )}
        
        {transcriptError && (
          <div className="text-red-600 text-sm py-2">
            <p>Failed to load transcript</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchTranscript()}
              className="mt-2"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        )}
        
        {transcriptData && (
          <div className="space-y-2">
            <p className="text-sm text-gray-700 leading-relaxed">
              {transcriptData.fullText}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{transcriptData.segments.length} segments</span>
              <span>•</span>
              <span>Language: {transcriptData.language}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderQuestionsSection = () => {
    if (!showQuestions) return null

    return (
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Conversation Questions</h4>
          <div className="flex items-center gap-2">
            {questionsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {questionsError && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Error</span>
              </div>
            )}
            {questionsData && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs">{questionsData.length} questions</span>
              </div>
            )}
          </div>
        </div>
        
        {questionsLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Loading questions...</span>
          </div>
        )}
        
        {questionsError && (
          <div className="text-red-600 text-sm py-2">
            <p>Failed to load questions</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchQuestions()}
              className="mt-2"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        )}
        
        {questionsData && questionsData.length > 0 && (
          <div className="space-y-2">
            {questionsData.slice(0, 3).map((question, index) => (
              <div key={index} className="p-2 bg-white rounded border text-sm">
                <p className="font-medium text-gray-800">{question.question}</p>
                {question.difficulty && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {question.difficulty}
                  </Badge>
                )}
              </div>
            ))}
            {questionsData.length > 3 && (
              <p className="text-xs text-gray-500 mt-2">
                +{questionsData.length - 3} more questions
              </p>
            )}
          </div>
        )}
        
        {questionsData && questionsData.length === 0 && (
          <p className="text-sm text-gray-600 py-2">
            No questions available for this segment.
          </p>
        )}
      </div>
    )
  }

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold truncate">
              {loop.title}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1 truncate">
              {loop.videoTitle}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            <Badge variant="outline" className="text-xs">
              {formatDuration(loop.startTime, loop.endTime)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatTime(loop.startTime)} - {formatTime(loop.endTime)}</span>
            </div>
          </div>
        </div>

        {loop.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {loop.description}
          </p>
        )}

        {/* Enhanced sections with React Query */}
        {renderTranscriptSection()}
        {renderQuestionsSection()}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="default"
            size="sm"
            onClick={() => onApply?.(loop)}
            disabled={isApplying}
            className="flex-1"
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            {isApplying ? 'Applying...' : 'Apply Loop'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            <Target className="h-4 w-4 mr-1" />
            Transcript
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuestions(!showQuestions)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Questions
          </Button>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {transcriptData ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : transcriptLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <AlertCircle className="h-3 w-3 text-gray-400" />
            )}
            <span>Transcript</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {questionsData ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : questionsLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <AlertCircle className="h-3 w-3 text-gray-400" />
            )}
            <span>Questions</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}