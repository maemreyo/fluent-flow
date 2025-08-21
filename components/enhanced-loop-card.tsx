import React, { useState } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { 
  Play,
  Brain,
  Mic,
  Download,
  Trash2,
  Loader2,
  RefreshCw,
  Settings,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Volume2
} from 'lucide-react'
import ConversationQuestionsPanel from './conversation-questions-panel'
import type { 
  SavedLoop, 
  ConversationQuestions,
  QuestionPracticeResult
} from '../lib/types/fluent-flow-types'

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
  className = ""
}) => {
  const [questions, setQuestions] = useState<ConversationQuestions | null>(null)
  const [showQuestions, setShowQuestions] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRecapturing, setIsRecapturing] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [retentionPolicy, setRetentionPolicy] = useState(loop.audioRetentionPolicy || 'auto-cleanup')
  const [showAdvanced, setShowAdvanced] = useState(false)

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
    if (!onGenerateQuestions || !loop.hasAudioSegment) return

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
    setRetentionPolicy(policy)
    
    if (onUpdateRetentionPolicy) {
      try {
        await onUpdateRetentionPolicy(loop.id, policy)
      } catch (error) {
        console.error('Failed to update retention policy:', error)
        // Revert on error
        setRetentionPolicy(loop.audioRetentionPolicy || 'auto-cleanup')
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

  const getRetentionPolicyBadge = () => {
    switch (retentionPolicy) {
      case 'keep':
        return <Badge className="bg-green-100 text-green-800">Keep</Badge>
      case 'temporary':
        return <Badge className="bg-red-100 text-red-800">Temporary</Badge>
      case 'auto-cleanup':
        return <Badge className="bg-blue-100 text-blue-800">Auto</Badge>
      default:
        return <Badge variant="secondary">Auto</Badge>
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
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{loop.title}</CardTitle>
              {loop.hasAudioSegment && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  Audio
                </Badge>
              )}
              {loop.questionsGenerated && (
                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  {loop.totalQuestionsGenerated || 0} Questions
                </Badge>
              )}
              {loop.cleanupScheduledAt && (
                <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Cleanup Scheduled
                </Badge>
              )}
            </div>
            
            <CardDescription className="text-sm">{loop.videoTitle}</CardDescription>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(loop.startTime)} - {formatTime(loop.endTime)}
              </span>
              <span>Duration: {formatTime(loop.endTime - loop.startTime)}</span>
              {loop.hasAudioSegment && loop.audioSize && (
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  {formatFileSize(loop.audioSize)}
                </span>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              Created: {formatDate(new Date(loop.createdAt))}
              {loop.audioLastUsed && (
                <span className="ml-2">• Audio used: {formatDate(loop.audioLastUsed)}</span>
              )}
            </div>

            {loop.description && (
              <p className="text-sm text-muted-foreground">{loop.description}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => onApply(loop)}
            disabled={isApplying}
            className="flex-1 min-w-0"
          >
            {isApplying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isApplying ? 'Applying...' : 'Practice'}
          </Button>

          <Button
            onClick={handleGenerateQuestions}
            disabled={!loop.hasAudioSegment || isGenerating}
            variant="outline"
            className="flex-1 min-w-0"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Analyzing...' : 'Questions'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Audio Management - Show if has audio or advanced mode */}
        {(loop.hasAudioSegment || showAdvanced) && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Audio Management</span>
              {loop.hasAudioSegment && getRetentionPolicyBadge()}
            </div>

            {loop.hasAudioSegment ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Select value={retentionPolicy} onValueChange={handleRetentionPolicyChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep">Keep</SelectItem>
                      <SelectItem value="auto-cleanup">Auto</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecaptureAudio}
                    disabled={isRecapturing}
                  >
                    {isRecapturing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCleanupAudio}
                    disabled={isCleaning}
                  >
                    {isCleaning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {loop.audioCreatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Audio captured: {formatDate(loop.audioCreatedAt)} • 
                    Format: {loop.audioFormat?.toUpperCase()}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">
                  No audio available for question generation
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecaptureAudio}
                  disabled={isRecapturing}
                >
                  {isRecapturing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4 mr-2" />
                  )}
                  Capture Audio
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Question Status */}
        {loop.questionsGenerated && loop.questionsGeneratedAt && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>
              {loop.totalQuestionsGenerated} questions generated on{' '}
              {formatDate(loop.questionsGeneratedAt)}
            </span>
          </div>
        )}

        {/* Standard Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport(loop)}
          >
            <Download className="w-4 h-4" />
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(loop.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedLoopCard