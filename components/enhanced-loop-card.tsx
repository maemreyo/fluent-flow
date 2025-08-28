import React, { useState } from 'react'
import {
  Brain,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  Monitor,
  Play,
  Settings,
  Trash2,
  Volume2
} from 'lucide-react'
import type {
  ConversationQuestions,
  QuestionPracticeResult,
  SavedLoop
} from '../lib/types/fluent-flow-types'
import ConversationQuestionsPanel from './conversation-questions-panel'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface EnhancedLoopCardProps {
  loop: SavedLoop
  onApply: (loop: SavedLoop) => void
  onDelete: (loopId: string) => void
  onExport: (loop: SavedLoop) => void
  onGenerateQuestions?: (loop: SavedLoop) => Promise<ConversationQuestions>
  onUpdateRetentionPolicy?: (loopId: string, policy: 'temporary' | 'keep' | 'auto-cleanup') => void
  onRecaptureAudio?: (loopId: string) => Promise<boolean>
  onCleanupAudio?: (loopId: string) => Promise<boolean>
  isApplying?: boolean
  className?: string
}

export const EnhancedLoopCard: React.FC<EnhancedLoopCardProps> = ({
  loop,
  onApply,
  onDelete,
  onExport,
  onGenerateQuestions,
  onUpdateRetentionPolicy,
  onRecaptureAudio,
  onCleanupAudio,
  isApplying = false,
  className = ''
}) => {
  const [questions, setQuestions] = useState<ConversationQuestions | null>(null)
  const [showQuestions, setShowQuestions] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRecapturing, setIsRecapturing] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isShowingOverlay, setIsShowingOverlay] = useState(false)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 KB'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleGenerateQuestions = async () => {
    if (!onGenerateQuestions) return

    // Check if we can generate questions (either audio or transcript available)
    const canGenerateQuestions = loop.videoId
    if (!canGenerateQuestions) return

    setIsGenerating(true)
    try {
      const generatedQuestions = await onGenerateQuestions(loop)
      setQuestions(generatedQuestions)
      setShowQuestions(true)
    } catch (error) {
      console.error('Failed to generate questions:', error)
      // You might want to show a toast notification here
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRetentionPolicyChange = async (newPolicy: string) => {
    const policy = newPolicy as 'temporary' | 'keep' | 'auto-cleanup'

    if (onUpdateRetentionPolicy) {
      try {
        onUpdateRetentionPolicy(loop.id, policy)
      } catch (error) {
        console.error('Failed to update retention policy:', error)
      }
    }
  }

  const handleRecaptureAudio = async () => {
    if (!onRecaptureAudio) return

    setIsRecapturing(true)
    try {
      await onRecaptureAudio(loop.id)
    } catch (error) {
      console.error('Failed to recapture audio:', error)
    } finally {
      setIsRecapturing(false)
    }
  }

  const handleCleanupAudio = async () => {
    if (!onCleanupAudio) return

    const confirmed = confirm(
      'Are you sure you want to remove the audio data? You can regenerate questions later if needed.'
    )
    if (!confirmed) return

    setIsCleaning(true)
    try {
      await onCleanupAudio(loop.id)
    } catch (error) {
      console.error('Failed to cleanup audio:', error)
    } finally {
      setIsCleaning(false)
    }
  }

  const handleQuestionComplete = (results: QuestionPracticeResult[], score: number) => {
    console.log('Question practice completed:', { results, score })
    // You might want to save results to storage here
  }

  const handleShowOverlay = async () => {
    let questionsToShow = questions

    // Generate questions first if not available
    if (!questionsToShow) {
      if (!onGenerateQuestions || !loop.videoId) {
        alert('No audio or transcript data available to generate questions.')
        return
      }

      setIsShowingOverlay(true)
      try {
        questionsToShow = await onGenerateQuestions(loop)
        setQuestions(questionsToShow)
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
        await chrome.tabs.sendMessage(activeTab.id!, {
          type: 'SHOW_QUESTION_OVERLAY',
          questions: questionsToShow
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

  if (showQuestions && questions) {
    return (
      <ConversationQuestionsPanel
        questions={questions}
        loop={loop}
        onClose={() => setShowQuestions(false)}
        onComplete={handleQuestionComplete}
      />
    )
  }

  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{loop.title}</CardTitle>

              {loop.videoId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  Transcript
                </Badge>
              )}
              {loop.questionsGenerated && (
                <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
                  <Brain className="h-3 w-3" />
                  {loop.totalQuestionsGenerated || 0} Questions
                </Badge>
              )}
            </div>

            <CardDescription className="text-sm">{loop.videoTitle}</CardDescription>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(loop.startTime)} - {formatTime(loop.endTime)}
              </span>
              <span>Duration: {formatTime(loop.endTime - loop.startTime)}</span>
            </div>

            <div className="text-xs text-muted-foreground">
              Created: {formatDate(new Date(loop.createdAt))}
            </div>

            {loop.description && (
              <p className="text-sm text-muted-foreground">{loop.description}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onApply(loop)} disabled={isApplying} className="min-w-0 flex-1">
            {isApplying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isApplying ? 'Applying...' : 'Practice'}
          </Button>

          <Button
            onClick={handleGenerateQuestions}
            disabled={!loop.videoId || isGenerating}
            variant="outline"
            className="min-w-0 flex-1"
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? 'Analyzing...' : 'Questions'}
          </Button>

          {/* Show Overlay Button */}
          <Button
            onClick={handleShowOverlay}
            disabled={isShowingOverlay || !loop.videoId || !onGenerateQuestions}
            variant="outline"
            className="flex items-center gap-1 px-3"
            title={
              questions
                ? 'Show questions on YouTube tab (perfect for screen sharing)'
                : 'Generate and show questions on YouTube tab'
            }
          >
            {isShowingOverlay ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{questions ? 'Overlay' : 'Gen & Show'}</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Audio Management - Show if has audio or advanced mode */}
        {showAdvanced && (
          <div className="space-y-3 rounded-lg bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Audio Management</span>
            </div>
          </div>
        )}

        {/* Question Status */}
        {loop.questionsGenerated && loop.questionsGeneratedAt && (
          <div className="flex items-center gap-2 rounded bg-green-50 p-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>
              {loop.totalQuestionsGenerated} questions generated on{' '}
              {formatDate(loop.questionsGeneratedAt)}
            </span>
          </div>
        )}

        {/* Standard Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport(loop)}>
            <Download className="h-4 w-4" />
          </Button>

          <Button variant="destructive" size="sm" onClick={() => onDelete(loop.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedLoopCard
