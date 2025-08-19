import React, { useState, useEffect } from 'react'
import { Download, Trash2 } from 'lucide-react'
import ReactH5AudioPlayer from 'react-h5-audio-player'
import { Button } from './ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from './ui/dialog'
import { Card, CardContent } from './ui/card'
import 'react-h5-audio-player/lib/styles.css'

interface FluentFlowAudioPlayerProps {
  recording: {
    id: string
    title?: string
    description?: string
    duration: number
    audioDataBase64: string
    createdAt: string
  }
  onDelete: (id: string) => void
  onExport: (recording: any) => void
  base64ToBlob: (base64: string, mimeType: string) => Blob
}

export function AudioPlayer({ recording, onDelete, onExport, base64ToBlob }: FluentFlowAudioPlayerProps) {
  return (
    <AudioPlayerErrorBoundary>
      <AudioPlayerContent 
        recording={recording} 
        onDelete={onDelete} 
        onExport={onExport} 
        base64ToBlob={base64ToBlob} 
      />
    </AudioPlayerErrorBoundary>
  )
}

function AudioPlayerContent({ recording, onDelete, onExport, base64ToBlob }: FluentFlowAudioPlayerProps) {
  const [audioURL, setAudioURL] = useState<string>('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (recording.audioDataBase64) {
      try {
        const audioBlob = base64ToBlob(recording.audioDataBase64, 'audio/webm')
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)

        return () => {
          URL.revokeObjectURL(url)
        }
      } catch (error) {
        console.error('Failed to create audio URL:', error)
      }
    }
  }, [recording.audioDataBase64, base64ToBlob])

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm mb-4">
      <div className="border-b border-border pb-3 mb-4">
        <h4 className="text-sm font-medium text-foreground mb-1 leading-tight">
          {recording.title || `Recording ${recording.id.slice(-6)}`}
        </h4>
        <p className="text-xs text-muted-foreground">
          {formatDate(recording.createdAt)} • {formatTime(recording.duration)}
        </p>
        {recording.description && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {recording.description}
          </p>
        )}
      </div>

      {audioURL && (
        <div className="mb-4">
          <ReactH5AudioPlayer
            src={audioURL}
            autoPlay={false}
            showJumpControls={true}
            showSkipControls={false}
            showDownloadProgress={false}
            showFilledProgress={true}
            showFilledVolume={true}
            preload="metadata"
            onError={(error: any) => console.error('FluentFlow: Audio error:', error)}
            layout="stacked-reverse"
            customProgressBarSection={[]}
            customControlsSection={[]}
            customVolumeControls={[]}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onExport(recording)}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg border border-border shadow-lg max-w-sm">
            <h3 className="font-semibold mb-2">Delete Recording</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete this recording? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(recording.id)
                  setShowDeleteDialog(false)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

class AudioPlayerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AudioPlayer Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-red-600">Audio player error occurred</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => this.setState({ hasError: false })}
              className="mt-2"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}