import React, { useState, useEffect } from 'react'
import { Download, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import ReactH5AudioPlayer from 'react-h5-audio-player'
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
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '16px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '16px'
    }}>
      {/* Recording Info */}
      <div style={{
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '12px',
        marginBottom: '16px'
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#111827',
          margin: '0 0 4px 0',
          lineHeight: '1.25'
        }}>
          {recording.title || `Recording ${recording.id.slice(-6)}`}
        </h4>
        <p style={{
          fontSize: '12px',
          color: '#6b7280',
          margin: '0'
        }}>
          {formatDate(recording.createdAt)} • {formatTime(recording.duration)}
        </p>
        {recording.description && (
          <p style={{
            fontSize: '12px',
            color: '#4b5563',
            margin: '8px 0 0 0',
            lineHeight: '1.4'
          }}>{recording.description}</p>
        )}
      </div>

      {/* React H5 Audio Player */}
      {audioURL && (
        <div style={{ marginBottom: '16px' }}>
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
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '12px'
            }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => onExport(recording)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            color: '#2563eb',
            backgroundColor: '#dbeafe'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#bfdbfe'
            e.currentTarget.style.color = '#1d4ed8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#dbeafe'
            e.currentTarget.style.color = '#2563eb'
          }}
          title="Export recording"
        >
          <Download size={16} />
          <span>Export</span>
        </button>
        
        <button
          onClick={() => setShowDeleteDialog(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            color: '#dc2626',
            backgroundColor: '#fef2f2'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fee2e2'
            e.currentTarget.style.color = '#b91c1c'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fef2f2'
            e.currentTarget.style.color = '#dc2626'
          }}
          title="Delete recording"
        >
          <Trash2 size={16} />
          <span>Delete</span>
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <Dialog.Portal>
          <Dialog.Overlay style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 50
          }} />
          <Dialog.Content style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 50,
            width: '384px',
            maxWidth: '90vw'
          }}>
            <Dialog.Title style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              Delete Recording
            </Dialog.Title>
            <Dialog.Description style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '16px',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete this recording? This action cannot be undone.
            </Dialog.Description>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <Dialog.Close asChild>
                <button style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  border: 'none',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                  e.currentTarget.style.color = '#374151'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                  e.currentTarget.style.color = '#6b7280'
                }}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={() => {
                  onDelete(recording.id)
                  setShowDeleteDialog(false)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626'
                }}
              >
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}