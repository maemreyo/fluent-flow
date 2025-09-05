'use client'

import { useEffect } from 'react'
import { AlertTriangle, Clock, Rocket, Tv } from 'lucide-react'
import { useWordSelection } from '../../lib/hooks/use-word-selection'

export interface VocabularyItem {
  word: string
  definition: string
  example?: string
  type?: string // noun, verb, adjective, etc.
  level?: string // beginner, intermediate, advanced
}

interface QuestionSet {
  id: string
  title: string
  videoTitle: string
  videoUrl: string
  videoInfo?: {
    title: string
    thumbnail: string
    channel: string
  }
  startTime?: number
  endTime?: number
  questions: any[]
  vocabulary?: VocabularyItem[]
  transcript?: string
  metadata: {
    totalQuestions: number
    createdAt: string
    sharedBy: string
    difficulty: string
    topics: string[]
  }
  expirationInfo?: {
    expiresAt: number
    timeRemaining: number
    hoursRemaining: number
    minutesRemaining: number
  }
}

interface QuestionSetInfoProps {
  questionSet: QuestionSet
  onStart: () => void
  availableCounts?: {
    easy: number
    medium: number
    hard: number
  }
}

export function QuestionSetInfo({ questionSet, onStart, availableCounts }: QuestionSetInfoProps) {
  const { enableSelection, disableSelection } = useWordSelection()
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (startTime?: number, endTime?: number): string => {
    if (!startTime || !endTime) return ''
    const duration = endTime - startTime
    return formatTime(duration)
  }

  const getTimeRemainingColor = (hoursRemaining: number) => {
    if (hoursRemaining <= 1) return 'text-red-600 bg-red-50 border-red-200'
    if (hoursRemaining <= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  // Enable word selection on mount
  useEffect(() => {
    enableSelection('question-set-info', 'quiz', questionSet.id)
    return () => {
      disableSelection('question-set-info')
    }
  }, [questionSet.id, enableSelection, disableSelection])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-blob absolute left-10 top-10 h-72 w-72 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 mix-blend-multiply blur-xl filter"></div>
        <div className="animate-blob animation-delay-2000 absolute right-10 top-10 h-72 w-72 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 mix-blend-multiply blur-xl filter"></div>
        <div className="animate-blob animation-delay-4000 absolute -bottom-8 left-20 h-72 w-72 rounded-full bg-gradient-to-r from-pink-400/20 to-orange-400/20 mix-blend-multiply blur-xl filter"></div>
      </div>

      <div id="question-set-info" className="relative z-10 mx-auto max-w-4xl p-6">
        {/* Enhanced Main Content Card */}
        <div className="relative">
          {/* Background blur effect */}
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-blue-50/50 blur-3xl"></div>

          <div className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-white/80 shadow-2xl backdrop-blur-sm">
            {/* Enhanced Video Info Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-8 text-white">
              <h2 className="mb-4 text-center text-2xl font-bold">{questionSet.videoTitle}</h2>

              {questionSet.startTime !== undefined && questionSet.endTime !== undefined && (
                <div className="flex items-center justify-center space-x-6 text-white/90">
                  <div className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 backdrop-blur-sm">
                    <Tv className="h-4 w-4" />
                    <span className="font-medium">
                      {formatTime(questionSet.startTime)} - {formatTime(questionSet.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 backdrop-blur-sm">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {formatDuration(questionSet.startTime, questionSet.endTime)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Question Set Details */}
            <div className="p-8">
              {/* Topics */}
              {questionSet.metadata.topics && questionSet.metadata.topics.length > 0 && (
                <div className="mb-8">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <h3 className="text-xl font-bold text-gray-900">Topics Covered</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {questionSet.metadata.topics.map((topic, index) => (
                      <span
                        key={index}
                        className="rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm transition-shadow hover:shadow-md"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Expiration Warning */}
              {questionSet.expirationInfo && questionSet.expirationInfo.hoursRemaining <= 24 && (
                <div
                  className={`mb-8 rounded-2xl border-2 p-6 ${getTimeRemainingColor(questionSet.expirationInfo.hoursRemaining)} shadow-lg`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-current" />
                    <h3 className="text-lg font-bold">Time Sensitive</h3>
                  </div>
                  <p className="text-sm leading-relaxed">
                    This question set will expire in {questionSet.expirationInfo.hoursRemaining}{' '}
                    hours and {questionSet.expirationInfo.minutesRemaining} minutes. Complete it
                    soon to avoid losing access!
                  </p>
                </div>
              )}

              {/* Enhanced Start Button */}
              <div className="text-center">
                <button
                  onClick={onStart}
                  className="hover:shadow-3xl inline-flex transform items-center gap-3 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 px-12 py-4 text-xl font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-indigo-600 hover:via-purple-600 hover:to-blue-600"
                >
                  <Rocket className="h-6 w-6" />
                  Start Quiz
                </button>

                <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-500">
                  Take your time - there&apos;s no time limit for individual questions.
                  <span className="font-semibold text-indigo-600"> Focus on understanding!</span>
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export type { QuestionSet }
