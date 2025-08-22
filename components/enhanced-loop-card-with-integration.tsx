import React, { useState } from 'react'
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
  CheckCircle,
  Download,
  Trash2,
  Settings,
  Brain
} from 'lucide-react'
import { useTranscriptQuery } from '../lib/hooks/use-transcript-query'
import { useQuestionsQuery, useGenerateQuestionsMutation } from '../lib/hooks/use-question-query'
import { ConversationQuestionsPanel } from './conversation-questions-panel'
import type { SavedLoop, ConversationQuestions, QuestionPracticeResult } from '../lib/types/fluent-flow-types'

interface EnhancedLoopCardWithIntegrationProps {
  loop: SavedLoop
  integrationService: any // ConversationLoopIntegrationService
  onApply?: (loop: SavedLoop) => void
  onDelete?: (loopId: string) => void
  onExport?: (loop: SavedLoop) => void
  isApplying?: boolean
  className?: string
}

export function EnhancedLoopCardWithIntegration({ 
  loop, 
  integrationService,
  onApply, 
  onDelete, 
  onExport,
  isApplying = false,
  className = ""
}: EnhancedLoopCardWithIntegrationProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  const [activeQuestions, setActiveQuestions] = useState<ConversationQuestions | null>(null)
  const [questionsCompleted, setQuestionsCompleted] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  
  // Use React Query for transcript data
  const {
    data: transcriptData,
    isLoading: transcriptLoading,
    error: transcriptError,
    refetch: refetchTranscript
  } = useTranscriptQuery(
    loop.videoId || '',
    loop.startTime,
    loop.endTime
  )

  // Use React Query for questions data (check if already cached)
  const {
    data: cachedQuestions,
    isLoading: questionsLoading,
    error: questionsError
  } = useQuestionsQuery(loop.id)

  // Use mutation for generating new questions
  const generateQuestionsMutation = useGenerateQuestionsMutation()

  const formatDuration = (start: number, end: number) => {
    const duration = Math.floor(end - start) // Round down to avoid decimals
    return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleGenerateQuestions = async () => {
    if (!integrationService) return

    try {
      const result = await generateQuestionsMutation.mutateAsync({
        loopId: loop.id,
        integrationService
      })
      
      setActiveQuestions(result)
      setShowQuestions(true)
    } catch (error) {
      console.error('Failed to generate questions:', error)
    }
  }

  const handleQuestionComplete = (results: QuestionPracticeResult[], score: number) => {
    console.log('Question practice completed:', { results, score })
    setShowQuestions(false)
    setActiveQuestions(null)
    setQuestionsCompleted(true)
    setLastScore(score)
    // Auto hide results after 10 seconds
    setTimeout(() => {
      setQuestionsCompleted(false)
      setLastScore(null)
    }, 10000)
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
    const questions = cachedQuestions || activeQuestions?.questions
    const isLoading = questionsLoading || generateQuestionsMutation.isPending

    return (
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Conversation Questions</h4>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {(questionsError || generateQuestionsMutation.error) && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Error</span>
              </div>
            )}
            {questions && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs">{questions.length} questions</span>
              </div>
            )}
          </div>
        </div>
        
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-gray-600">
              {generateQuestionsMutation.isPending ? 'Generating questions...' : 'Loading questions...'}
            </span>
          </div>
        )}
        
        {(questionsError || generateQuestionsMutation.error) && (
          <div className="text-red-600 text-sm py-2">
            <p>Failed to load questions</p>
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateQuestions}
                disabled={generateQuestionsMutation.isPending}
              >
                <Brain className="h-4 w-4 mr-1" />
                Generate
              </Button>
            </div>
          </div>
        )}
        
        {questions && questions.length > 0 && (
          <div className="space-y-2">
            {questions.slice(0, 3).map((question, index) => (
              <div key={index} className="p-2 bg-white rounded border text-sm">
                <p className="font-medium text-gray-800">{question.question}</p>
                {question.difficulty && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {question.difficulty}
                  </Badge>
                )}
              </div>
            ))}
            {questions.length > 3 && (
              <p className="text-xs text-gray-500 mt-2">
                +{questions.length - 3} more questions
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  if (cachedQuestions) {
                    setActiveQuestions({
                      loopId: loop.id,
                      questions: cachedQuestions,
                      metadata: {
                        totalQuestions: cachedQuestions.length,
                        analysisDate: new Date().toISOString(),
                        generatedFromTranscript: true,
                        canRegenerateQuestions: true
                      }
                    })
                  }
                  setShowQuestions(true)
                }}
              >
                <Play className="h-4 w-4 mr-1" />
                Start Practice
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateQuestions}
                disabled={generateQuestionsMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>
          </div>
        )}
        
        {questions && questions.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-3">
              No questions available for this segment.
            </p>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleGenerateQuestions}
              disabled={generateQuestionsMutation.isPending}
            >
              <Brain className="h-4 w-4 mr-1" />
              Generate Questions
            </Button>
          </div>
        )}

        {!questions && !isLoading && (
          <div className="text-center py-4">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleGenerateQuestions}
              disabled={generateQuestionsMutation.isPending || !integrationService}
            >
              <Brain className="h-4 w-4 mr-1" />
              Generate Questions
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Show questions panel if active
  if (showQuestions && activeQuestions) {
    return (
      <ConversationQuestionsPanel
        questions={activeQuestions}
        loop={loop}
        onClose={() => {
          setShowQuestions(false)
          setActiveQuestions(null)
        }}
        onComplete={handleQuestionComplete}
      />
    )
  }

  return (
    <Card className={`mb-4 hover:shadow-md transition-shadow ${className}`}>
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
        {showTranscript && renderTranscriptSection()}
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
            onClick={() => onExport?.(loop)}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete?.(loop.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
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
            {cachedQuestions && cachedQuestions.length > 0 ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : questionsLoading || generateQuestionsMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <AlertCircle className="h-3 w-3 text-gray-400" />
            )}
            <span>Questions ({cachedQuestions?.length || 0})</span>
          </div>

          {loop.hasAudioSegment && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <CheckCircle className="h-3 w-3 text-blue-500" />
              <span>Audio</span>
            </div>
          )}
        </div>

        {/* Show completion results */}
        {questionsCompleted && lastScore !== null && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Practice Completed!</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                Score: {Math.round(lastScore)}%
              </Badge>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Great job! Your results have been saved.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EnhancedLoopCardWithIntegration