import { useEffect, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Monitor,
  Play,
  RotateCcw,
  Target,
  Trash2
} from 'lucide-react'
import { useGenerateQuestionsMutation, useQuestionsQuery } from '../lib/hooks/use-question-query'
import { useTranscriptQuery } from '../lib/hooks/use-transcript-query'
import type {
  TranscriptSummary,
  VocabularyAnalysisResult
} from '../lib/services/vocabulary-analysis-service'
import { createVocabularyAnalysisService } from '../lib/services/vocabulary-analysis-service'
import type {
  ConversationQuestions,
  QuestionPracticeResult,
  SavedLoop
} from '../lib/types/fluent-flow-types'
import { ConversationQuestionsPanel } from './conversation-questions-panel'
import { QuestionShareButton } from './question-share-button'
import TranscriptSummaryComponent from './summary/transcript-summary'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import VocabularyList from './vocabulary/vocabulary-list'

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
  className = ''
}: EnhancedLoopCardWithIntegrationProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  const [showVocabulary, setShowVocabulary] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [activeQuestions, setActiveQuestions] = useState<ConversationQuestions | null>(null)
  const [questionsCompleted, setQuestionsCompleted] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [vocabularyAnalysis, setVocabularyAnalysis] = useState<VocabularyAnalysisResult | null>(
    null
  )
  const [transcriptSummary, setTranscriptSummary] = useState<TranscriptSummary | null>(null)
  const [vocabularyLoading, setVocabularyLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [isShowingOverlay, setIsShowingOverlay] = useState(false)

  // Use React Query for transcript data
  const {
    data: transcriptData,
    isLoading: transcriptLoading,
    error: transcriptError,
    refetch: refetchTranscript
  } = useTranscriptQuery(loop.videoId || '', loop.startTime, loop.endTime)

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

  const handleAnalyzeVocabulary = async () => {
    if (!transcriptData?.segments || transcriptData.segments.length === 0) {
      console.warn('No transcript data available for vocabulary analysis')
      return
    }

    setVocabularyLoading(true)
    try {
      const service = await createVocabularyAnalysisService()
      const analysis = await service.analyzeVocabulary(transcriptData.segments)
      setVocabularyAnalysis(analysis)
      setShowVocabulary(true)
    } catch (error) {
      console.error('Failed to analyze vocabulary:', error)
    } finally {
      setVocabularyLoading(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (!transcriptData?.segments || transcriptData.segments.length === 0) {
      console.warn('No transcript data available for summary generation')
      return
    }

    setSummaryLoading(true)
    try {
      const service = await createVocabularyAnalysisService()
      const summary = await service.generateSummary(transcriptData.segments)
      setTranscriptSummary(summary)
      setShowSummary(true)
    } catch (error) {
      console.error('Failed to generate summary:', error)
    } finally {
      setSummaryLoading(false)
    }
  }

  // Auto-generate summary when transcript loads (optional)
  useEffect(() => {
    if (transcriptData?.segments && !transcriptSummary && !summaryLoading) {
      handleGenerateSummary()
    }
  }, [transcriptData, transcriptSummary, summaryLoading])

  const handleShowOverlay = async () => {
    let questionsToShow = cachedQuestions || activeQuestions

    // Generate questions first if not available
    if (!questionsToShow) {
      if (!integrationService) {
        alert('Integration service not available.')
        return
      }

      setIsShowingOverlay(true)
      try {
        const result = await generateQuestionsMutation.mutateAsync({
          loopId: loop.id,
          integrationService
        })
        questionsToShow = result
      } catch (error) {
        console.error('Failed to generate questions for overlay:', error)
        alert('Failed to generate questions. Please try again.')
        setIsShowingOverlay(false)
        return
      }
    }

    setIsShowingOverlay(true)
    try {
      // Send questions to overlay on YouTube tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs[0]

      if (activeTab && activeTab.url?.includes('youtube.com/watch')) {
        const questionsArray = Array.isArray(questionsToShow)
          ? questionsToShow
          : questionsToShow.questions || []
        await chrome.tabs.sendMessage(activeTab.id!, {
          type: 'SHOW_QUESTION_OVERLAY',
          questions: {
            loopId: loop.id,
            questions: questionsArray,
            metadata: {
              totalQuestions: questionsArray.length,
              analysisDate: new Date().toISOString(),
              generatedFromTranscript: true,
              canRegenerateQuestions: true
            }
          }
        })
        console.log('FluentFlow: Questions sent to overlay from loop card')
      } else {
        console.log('FluentFlow: No YouTube tab found for overlay')
        alert('Please make sure you have a YouTube video tab open to show the question overlay.')
      }
    } catch (error) {
      console.error('FluentFlow: Failed to show overlay:', error)
      alert('Failed to show overlay. Make sure you have a YouTube video open.')
    } finally {
      setIsShowingOverlay(false)
    }
  }

  const renderTranscriptSection = () => {
    if (!showTranscript) return null

    return (
      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Transcript</h4>
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
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-sm text-gray-600">Loading transcript...</span>
          </div>
        )}

        {transcriptError && (
          <div className="py-2 text-sm text-red-600">
            <p>Failed to load transcript</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTranscript()}
              className="mt-2"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {transcriptData && (
          <div className="space-y-2">
            <div className="max-h-32 overflow-y-auto rounded border border-gray-200 bg-white p-3">
              <div className="space-y-2">
                {transcriptData.segments.map((segment: any, index: number) => (
                  <div key={index} className="flex gap-3 text-sm">
                    <span className="min-w-[45px] flex-shrink-0 font-mono text-xs text-blue-600">
                      {Math.floor(segment.start / 60)}:
                      {(Math.round(segment.start) % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="leading-relaxed text-gray-700">{segment.text}</span>
                  </div>
                ))}
              </div>
            </div>
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
      <div className="mt-4 rounded-lg bg-blue-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Conversation Questions</h4>
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
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-sm text-gray-600">
              {generateQuestionsMutation.isPending
                ? 'Generating questions...'
                : 'Loading questions...'}
            </span>
          </div>
        )}

        {(questionsError || generateQuestionsMutation.error) && (
          <div className="py-2 text-sm text-red-600">
            <p>Failed to load questions</p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateQuestions}
                disabled={generateQuestionsMutation.isPending}
              >
                <Brain className="h-4 w-4" />
                Generate
              </Button>
            </div>
          </div>
        )}

        {questions && questions.length > 0 && (
          <div className="space-y-2">
            {questions.slice(0, 2).map((question, index) => (
              <div key={index} className="rounded border bg-white p-2 text-sm">
                <p className="font-medium text-gray-800">{question.question}</p>
                {question.difficulty && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {question.difficulty}
                  </Badge>
                )}
              </div>
            ))}
            {questions.length > 2 && (
              <p className="mt-2 text-xs text-gray-500">+{questions.length - 2} more questions</p>
            )}
            <div className="mt-3 flex gap-2">
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
                title="Start interactive practice session with generated questions"
              >
                <Play className="h-4 w-4" />
                Practice
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateQuestions}
                disabled={generateQuestionsMutation.isPending}
                title="Generate new questions from the transcript"
              >
                <RotateCcw className="h-4 w-4" />
                Regenerate
              </Button> */}
              <QuestionShareButton
                questions={{
                  loopId: loop.id,
                  questions: questions,
                  metadata: {
                    totalQuestions: questions.length,
                    analysisDate: new Date().toISOString(),
                    generatedFromTranscript: true,
                    canRegenerateQuestions: true
                  }
                }}
                loop={loop}
                className="flex-shrink-0"
                backendUrl="http://localhost:3838"
              />
            </div>
          </div>
        )}

        {questions && questions.length === 0 && (
          <div className="py-4 text-center">
            <p className="mb-3 text-sm text-gray-600">No questions available for this segment.</p>
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateQuestions}
              disabled={generateQuestionsMutation.isPending}
            >
              <Brain className="h-4 w-4" />
              Generate Questions
            </Button>
          </div>
        )}

        {!questions && !isLoading && (
          <div className="py-4 text-center">
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateQuestions}
              disabled={generateQuestionsMutation.isPending || !integrationService}
            >
              <Brain className="h-4 w-4" />
              Generate Questions
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderSummarySection = () => {
    return (
      <div className="mt-4 rounded-lg bg-yellow-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {summaryLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!summaryLoading && !transcriptSummary && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={!transcriptData?.segments}
              >
                <FileText className="h-4 w-4" />
                Generate
              </Button>
            )}
          </div>
        </div>

        {summaryLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-sm text-gray-600">Generating summary...</span>
          </div>
        )}

        {transcriptSummary && (
          <TranscriptSummaryComponent
            summary={transcriptSummary}
            isLoading={summaryLoading}
            defaultExpanded={false}
          />
        )}

        {!transcriptSummary && !summaryLoading && (
          <div className="py-4 text-center">
            <p className="mb-3 text-sm text-gray-600">No summary available.</p>
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateSummary}
              disabled={!transcriptData?.segments}
            >
              <FileText className="h-4 w-4" />
              Generate Summary
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderVocabularySection = () => {
    return (
      <div className="mt-4 rounded-lg bg-green-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {vocabularyLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!vocabularyLoading && !vocabularyAnalysis && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyzeVocabulary}
                disabled={!transcriptData?.segments}
              >
                <BookOpen className="h-4 w-4" />
                Analyze
              </Button>
            )}
          </div>
        </div>

        {vocabularyLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-sm text-gray-600">Analyzing vocabulary...</span>
          </div>
        )}

        {vocabularyAnalysis && (
          <VocabularyList analysis={vocabularyAnalysis} isLoading={vocabularyLoading} />
        )}

        {!vocabularyAnalysis && !vocabularyLoading && (
          <div className="py-4 text-center">
            <p className="mb-3 text-sm text-gray-600">No vocabulary analysis available.</p>
            <Button
              variant="default"
              size="sm"
              onClick={handleAnalyzeVocabulary}
              disabled={!transcriptData?.segments}
            >
              <BookOpen className="h-4 w-4" />
              Analyze Vocabulary
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
    <Card className={`mb-4 transition-shadow hover:shadow-md ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="w-[100%] flex-1">
            <CardTitle className="truncate text-base font-semibold">{loop.title}</CardTitle>
            <CardDescription className="mt-1 truncate text-sm text-gray-600">
              {loop.videoTitle}
            </CardDescription>
          </div>
          {/* <div className="ml-2 flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-xs">
              {formatDuration(loop.startTime, loop.endTime)}
            </Badge>
          </div> */}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {formatTime(loop.startTime)} - {formatTime(loop.endTime)}
              </span>
            </div>
          </div>
        </div>

        {loop.description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-700">{loop.description}</p>
        )}

        {/* Enhanced sections with React Query */}
        {showTranscript && renderTranscriptSection()}
        {showSummary && renderSummarySection()}
        {showVocabulary && renderVocabularySection()}
        {renderQuestionsSection()}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => onApply?.(loop)}
            disabled={isApplying}
            className="flex-1"
            title="Navigate to the video and apply this loop's time segment"
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isApplying ? 'Applying...' : 'Apply Loop'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTranscript(!showTranscript)}
            title={showTranscript ? 'Hide transcript' : 'Show transcript'}
          >
            <Target className="h-4 w-4" />
            {/* Transcript */}
          </Button>

          {/* Show Overlay Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowOverlay}
            disabled={
              isShowingOverlay || generateQuestionsMutation.isPending || !integrationService
            }
            title={
              cachedQuestions || activeQuestions
                ? 'Show questions on YouTube tab'
                : 'Generate and show questions on YouTube tab'
            }
          >
            {isShowingOverlay ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
            {/* {cachedQuestions || activeQuestions ? 'Overlay' : 'Gen & Show'} */}
          </Button>

          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.(loop)}
            title="Export loop data as JSON file"
          >
            <Download className="h-4 w-4" />
            Export
          </Button> */}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
            title={showSummary ? 'Hide summary' : 'Show summary'}
          >
            <FileText className="h-4 w-4" />
            {/* Summary */}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVocabulary(!showVocabulary)}
            title={showVocabulary ? 'Hide vocabulary' : 'Show vocabulary'}
          >
            <BookOpen className="h-4 w-4" />
            {/* Vocabulary */}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete?.(loop.id)}
            title="Delete this loop permanently"
          >
            <Trash2 className="h-4 w-4" />
            {/* Delete */}
          </Button>
        </div>

        {/* Status indicators */}
        <div className="mt-3 flex items-center gap-3 border-t pt-3">
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
        </div>

        {/* Show completion results */}
        {questionsCompleted && lastScore !== null && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Practice Completed!</span>
              </div>
              <Badge className="border-green-300 bg-green-100 text-green-800">
                Score: {Math.round(lastScore)}%
              </Badge>
            </div>
            <p className="mt-1 text-xs text-green-700">Great job! Your results have been saved.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EnhancedLoopCardWithIntegration
