import React, { useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, Share2, X } from 'lucide-react'
import { QuestionSharingService } from '../lib/services/question-sharing-service'
import type { ConversationQuestions, SavedLoop } from '../lib/types/fluent-flow-types'

interface QuestionShareButtonProps {
  questions: ConversationQuestions | null
  loop: SavedLoop | null
  className?: string
  backendUrl?: string
}

export const QuestionShareButton: React.FC<QuestionShareButtonProps> = ({
  questions,
  loop,
  className = '',
  backendUrl = process.env.PLASMO_PUBLIC_BACKEND_URL || 'http://localhost:3838'
}) => {
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const sharingService = new QuestionSharingService({ backendUrl })

  const handleShare = async () => {
    if (!questions || !loop) {
      setError('No questions or loop data available to share')
      return
    }

    setIsSharing(true)
    setError(null)

    try {
      const result = await sharingService.shareQuestions(questions, loop, {
        title: `${loop.videoTitle} - Practice Questions`,
        isPublic: true,
        sharedBy: 'FluentFlow User'
      })

      setShareUrl(result.shareUrl)
      setShowDialog(true)
      console.log('Questions shared successfully:', result.shareUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share questions')
      console.error('Share error:', err)
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return

    const success = await sharingService.copyToClipboard(shareUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenLink = () => {
    if (shareUrl) {
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isSharing || !questions || !loop}
        className={`inline-flex items-center gap-2 rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        title="Share questions as a public link"
      >
        {isSharing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
        {isSharing ? 'Sharing...' : 'Share'}
      </button>

      {error && (
        <div className="mt-2 rounded-md border border-red-300 bg-red-100 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success Dialog */}
      {showDialog && shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative max-w-md w-full mx-4 bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Questions Shared Successfully!</h3>
                <button
                  onClick={() => setShowDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-green-800 mb-3">
                  <Check className="h-4 w-4" />
                  <span>🎯 <strong>{questions?.questions.length} questions</strong> ready for practice</span>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <p>📺 From: {loop?.videoTitle}</p>
                  {loop && (
                    <p>⏱️ Duration: {Math.floor(Math.round(loop.endTime - loop.startTime) / 60)}m {Math.round(loop.endTime - loop.startTime) % 60}s</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenLink}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Quiz
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default QuestionShareButton
