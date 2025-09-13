'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import { getVideoLink } from '../../../../../../lib/utils/timeframe'

interface FillBlank {
  position: number
  answer: string
  alternatives?: string[]
  caseSensitive?: boolean
}

interface FillInTheBlankQuestionProps {
  question: {
    id: string
    type: 'fill_blank'
    transcript: string
    blanks: FillBlank[]
    explanation?: string
    audioSegment?: {
      start: number
      end: number
    }
  }
  currentAnswers: Record<string, string>
  onAnswerChange: (answers: Record<string, string>) => void
  disabled?: boolean
  videoUrl?: string // Add videoUrl prop
}

export function FillInTheBlankQuestion({
  question,
  currentAnswers,
  onAnswerChange,
  disabled = false,
  videoUrl
}: FillInTheBlankQuestionProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(currentAnswers || {})

  // Update local state when prop changes
  useEffect(() => {
    setAnswers(currentAnswers || {})
  }, [currentAnswers])

  const handleInputChange = (blankIndex: number, value: string) => {
    const newAnswers = { ...answers, [`blank_${blankIndex}`]: value }
    setAnswers(newAnswers)
    onAnswerChange(newAnswers)
  }

  const renderTranscriptWithBlanks = () => {
    if (!question.transcript || !question.blanks) {
      return <p className="text-gray-500">Invalid question format</p>
    }

    // Split transcript by [BLANK_N] pattern
    const parts = question.transcript.split(/(\[BLANK_\d+\])/)

    return (
      <div className="text-base leading-relaxed text-gray-800">
        {parts.map((part, index) => {
          const blankMatch = part.match(/\[BLANK_(\d+)\]/)
          if (blankMatch) {
            const blankNumber = parseInt(blankMatch[1])
            const blankIndex = blankNumber - 1
            const blank = question.blanks[blankIndex]

            if (!blank) {
              return (
                <span key={index} className="text-red-500">
                  [Invalid Blank]
                </span>
              )
            }

            return (
              <input
                key={index}
                type="text"
                value={answers[`blank_${blankIndex}`] || ''}
                onChange={e => handleInputChange(blankIndex, e.target.value)}
                placeholder="Type here..."
                disabled={disabled}
                className="mx-1 inline-block min-w-[100px] max-w-[150px] rounded-md border-2 border-blue-300 bg-white px-3 py-2 text-center font-medium text-blue-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
              />
            )
          }
          return <span key={index}>{part}</span>
        })}
      </div>
    )
  }

  const getCompletionStatus = () => {
    const totalBlanks = question.blanks?.length || 0
    const filledBlanks = Object.values(answers).filter(answer => answer.trim() !== '').length
    return { filled: filledBlanks, total: totalBlanks }
  }

  const { filled, total } = getCompletionStatus()

  // Debug logging for audio playback visibility (only on mount)
  useEffect(() => {
    if (!videoUrl && question.audioSegment) {
      console.log('⚠️ FillInTheBlankQuestion missing videoUrl but has audioSegment:', question.id)
    } else if (videoUrl && question.audioSegment) {
      console.log('✅ FillInTheBlankQuestion audio ready:', question.id)
    }
  }, []) // Empty dependency to run only on mount

  return (
    <div className="space-y-6">
      {/* Exercise Type Header */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-medium text-blue-600">Fill-in-the-Blank</span>
        <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
          Audio Exercise
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="mb-2 text-sm font-semibold text-blue-800">Instructions:</p>
        <p className="text-sm text-blue-700">
          Fill in the blanks with the missing words from the audio transcript. Listen carefully and
          type the exact words you hear.
        </p>
      </div>

      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs">
          <p><strong>Debug Info:</strong></p>
          <p>videoUrl: {videoUrl || 'null'}</p>
          <p>audioSegment: {question.audioSegment ? JSON.stringify(question.audioSegment) : 'null'}</p>
        </div>
      )}

      {/* Audio Playback Section */}
      {videoUrl && question.audioSegment && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">Listen to Audio</p>
                <p className="text-xs text-green-600">
                  Segment: {Math.floor(question.audioSegment.start / 60)}:
                  {(question.audioSegment.start % 60).toFixed(0).padStart(2, '0')} -{' '}
                  {Math.floor(question.audioSegment.end / 60)}:
                  {(question.audioSegment.end % 60).toFixed(0).padStart(2, '0')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const youtubeLink = getVideoLink(videoUrl, question.audioSegment!.start)
                if (youtubeLink) {
                  window.open(youtubeLink, '_blank')
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
            >
              <ExternalLink className="h-4 w-4" />
              Play on YouTube
            </button>
          </div>
        </div>
      )}

      {/* Transcript with Input Fields */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <p className="mb-4 text-sm font-semibold text-gray-700">Complete the transcript:</p>
        {renderTranscriptWithBlanks()}
      </div>
    </div>
  )
}
