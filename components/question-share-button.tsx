import React, { useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, Share2 } from 'lucide-react'
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

  // If no questions available
  if (!questions || !loop) {
    return (
      <button
        disabled
        className={`inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-400 ${className}`}
      >
        <Share2 className="h-4 w-4" />
        Share Questions
      </button>
    )
  }

  // If not shared yet
  if (!shareUrl) {
    return (
      <div className={className}>
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="inline-flex items-center gap-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSharing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {isSharing ? 'Sharing...' : 'Share Questions'}
        </button>

        {error && (
          <div className="mt-2 rounded-md border border-red-300 bg-red-100 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    )
  }

  // If shared successfully
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="rounded-md border border-green-200 bg-green-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm text-green-800">
          <Check className="h-4 w-4" />
          Questions shared successfully!
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>

          <button
            onClick={handleOpenLink}
            className="inline-flex items-center gap-1 rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        <p>
          🎯 <strong>{questions.questions.length} questions</strong> ready for practice
        </p>
        <p>📺 From: {loop.videoTitle}</p>
        <p>
          ⏱️ Duration: {Math.round((loop.endTime - loop.startTime) / 60)}m{' '}
          {Math.round((loop.endTime - loop.startTime) % 60)}s
        </p>
      </div>
    </div>
  )
}

export default QuestionShareButton
