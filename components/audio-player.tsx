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
  const [audioURL, setAudioURL] = useState<string>('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Initialize audio URL when component mounts
  useEffect(() => {
    if (recording.audioDataBase64) {
      try {
        const audioBlob = base64ToBlob(recording.audioDataBase64, 'audio/webm')
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)

        // Cleanup function to revoke URL when component unmounts
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
      {/* Recording Info */}
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

      {/* React H5 Audio Player */}
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
            onPlay={() => console.log('FluentFlow: Audio playing')}
            onPause={() => console.log('FluentFlow: Audio paused')}
            onEnded={() => console.log('FluentFlow: Audio ended')}
            onError={(error: any) => console.error('FluentFlow: Audio error:', error)}
            onLoadedData={() => console.log('FluentFlow: Audio loaded')}
            layout="stacked-reverse"
            className="bg-muted rounded-lg border border-border p-3"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <Button
          onClick={() => onExport(recording)}
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        
        <Button
          onClick={() => setShowDeleteDialog(true)}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Recording</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recording? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(recording.id)
                setShowDeleteDialog(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}