import { useEffect, useState } from 'react'
import { CheckCircle, Clock, Loader2, Play, Trash2, ExternalLink } from 'lucide-react'
import { useGenerateQuestionsMutation, useQuestionsQuery } from '../../lib/hooks/use-question-query'
import { useTranscriptQuery } from '../../lib/hooks/use-transcript-query'
import type {
  TranscriptSummary,
  VocabularyAnalysisResult
} from '../../lib/services/vocabulary-analysis-service'
import { createVocabularyAnalysisService } from '../../lib/services/vocabulary-analysis-service'
import { vocabularyDatabaseService } from '../../lib/services/vocabulary-database-service'
import type {
  ConversationQuestions,
  QuestionPracticeResult,
  SavedLoop
} from '../../lib/types/fluent-flow-types'
import { ConversationQuestionsPanel } from '../conversation-questions-panel'
import TranscriptSection from '../transcript/transcript-section'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface LoopCardProps {
  loop: SavedLoop
  integrationService: any
  onApply?: (loop: SavedLoop) => void
  onDelete?: (loopId: string) => void
  onOpenInApp?: (loop: SavedLoop) => void
  isApplying?: boolean
  className?: string
}

export function LoopCard({
  loop,
  integrationService,
  onApply,
  onDelete,
  onOpenInApp,
  isApplying = false,
  className = ''
}: LoopCardProps) {
  const [showTranscript, setShowTranscript] = useState(true)
  const [showQuestions, setShowQuestions] = useState(true)
  const [showVocabulary, setShowVocabulary] = useState(true)
  const [showSummary, setShowSummary] = useState(true)
  const [isShowingOverlay, setIsShowingOverlay] = useState(false)

  const [activeQuestions, setActiveQuestions] = useState<ConversationQuestions | null>(null)
  const [questionsCompleted, setQuestionsCompleted] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [vocabularyAnalysis, setVocabularyAnalysis] = useState<VocabularyAnalysisResult | null>(
    null
  )
  const [transcriptSummary, setTranscriptSummary] = useState<TranscriptSummary | null>(null)
  const [vocabularyLoading, setVocabularyLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Use React Query for transcript data
  const { data: transcriptData, isLoading: transcriptLoading } = useTranscriptQuery(
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

  const handleQuestionPractice = () => {
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
      // First check if we have cached analysis
      const cachedAnalysis = await vocabularyDatabaseService.getVocabularyAnalysis(loop.id)
      if (cachedAnalysis) {
        console.log('Using cached vocabulary analysis for loop', loop.id)
        setVocabularyAnalysis(cachedAnalysis)
        setShowVocabulary(true)
        return
      }

      // Generate new analysis
      const service = await createVocabularyAnalysisService()
      const analysis = await service.analyzeVocabulary(transcriptData.segments)

      // Save to database for future use
      await vocabularyDatabaseService.saveVocabularyAnalysis(loop.id, analysis, {
        transcriptLength: transcriptData.segments.reduce((acc, seg) => acc + seg.text.length, 0),
        transcriptLanguage: transcriptData.language,
        segmentCount: transcriptData.segments.length,
        generatedAt: new Date().toISOString()
      })

      setVocabularyAnalysis(analysis)
      setShowVocabulary(true)
    } catch (error) {
      console.error('Failed to analyze vocabulary:', error)
    } finally {
      setVocabularyLoading(false)
    }
  }

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

  const handleGenerateSummary = async () => {
    if (!transcriptData?.segments || transcriptData.segments.length === 0) {
      console.warn('No transcript data available for summary generation')
      return
    }

    setSummaryLoading(true)
    try {
      // First check if we have cached summary
      const cachedSummary = await vocabularyDatabaseService.getTranscriptSummary(loop.id)
      if (cachedSummary) {
        console.log('Using cached transcript summary for loop', loop.id)
        setTranscriptSummary(cachedSummary)
        setShowSummary(true)
        return
      }

      // Generate new summary
      const service = await createVocabularyAnalysisService()
      const summary = await service.generateSummary(transcriptData.segments)

      // Save to database for future use
      await vocabularyDatabaseService.saveTranscriptSummary(loop.id, summary, {
        transcriptLength: transcriptData.segments.reduce((acc, seg) => acc + seg.text.length, 0),
        transcriptLanguage: transcriptData.language,
        segmentCount: transcriptData.segments.length,
        generatedAt: new Date().toISOString()
      })

      setTranscriptSummary(summary)
      setShowSummary(true)
    } catch (error) {
      console.error('Failed to generate summary:', error)
    } finally {
      setSummaryLoading(false)
    }
  }

  useEffect(() => {
    if (transcriptData?.segments && !transcriptSummary && !summaryLoading) {
      handleGenerateSummary()
    }
  }, [transcriptData, transcriptSummary, summaryLoading])

  // Auto-load cached data when component mounts
  useEffect(() => {
    const loadCachedData = async () => {
      // Load cached vocabulary analysis
      if (!vocabularyAnalysis && !vocabularyLoading) {
        const cached = await vocabularyDatabaseService.getVocabularyAnalysis(loop.id)
        if (cached) {
          setVocabularyAnalysis(cached)
        }
      }

      // Load cached summary
      if (!transcriptSummary && !summaryLoading) {
        const cachedSummary = await vocabularyDatabaseService.getTranscriptSummary(loop.id)
        if (cachedSummary) {
          setTranscriptSummary(cachedSummary)
        }
      }
    }

    loadCachedData()
  }, [loop.id, vocabularyAnalysis, vocabularyLoading, transcriptSummary, summaryLoading])

  const handlePlayAudio = async (text: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('Failed to play audio:', error)
    }
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

        {/* Enhanced sections */}
        {showTranscript && transcriptData?.segments && (
          <div className="mt-4">
            <TranscriptSection
              segments={transcriptData.segments}
              language={transcriptData.language}
            />
          </div>
        )}

        {/* {showVocabulary && (
          <div className="mt-4">
            <VocabularySectionCollapsible
              analysis={vocabularyAnalysis}
              isLoading={vocabularyLoading}
              onAnalyze={handleAnalyzeVocabulary}
              onPlayAudio={handlePlayAudio}
              defaultExpanded={false}
            />
          </div>
        )} */}

        {/* Questions section - always visible */}
        {/* <div className="mt-4">
          <QuestionsSectionCollapsible
            questions={cachedQuestions}
            isLoading={questionsLoading || generateQuestionsMutation.isPending}
            error={questionsError || generateQuestionsMutation.error}
            onGenerate={handleGenerateQuestions}
            onPractice={handleQuestionPractice}
            integrationService={integrationService}
            loop={loop}
            defaultExpanded={false}
          />
        </div> */}

        {/* {showSummary && (
          <div className="mt-4">
            <TranscriptSummaryComponent
              summary={transcriptSummary}
              isLoading={summaryLoading}
              defaultExpanded={false}
            />
          </div>
        )} */}
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

          {onOpenInApp && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenInApp(loop)}
              title="Open this loop in the web application"
            >
              <ExternalLink className="h-4 w-4" />
              Open in App
            </Button>
          )}

          {/* Show Overlay Button */}
          {/* <Button
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
          </Button> */}

          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTranscript(!showTranscript)}
            title={showTranscript ? 'Hide transcript' : 'Show transcript'}
          >
            <Target className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
            title={showSummary ? 'Hide summary' : 'Show summary'}
          >
            <FileText className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVocabulary(!showVocabulary)}
            title={showVocabulary ? 'Hide vocabulary' : 'Show vocabulary'}
          >
            <BookOpen className="h-4 w-4" />
          </Button> */}

          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete?.(loop.id)}
            title="Delete this loop permanently"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Status indicators */}
        {/* <div className="mt-3 flex items-center gap-3 border-t pt-3">
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
        </div> */}

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

export default LoopCard
