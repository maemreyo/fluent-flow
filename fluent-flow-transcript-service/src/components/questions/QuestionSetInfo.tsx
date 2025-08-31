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

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold">Ready to Practice?</h1>
        <p className="text-gray-600">Let&apos;s test your understanding of the video content</p>
      </div>

      {/* Main Content Card */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Video Info Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">{questionSet.videoTitle}</h2>

          {questionSet.startTime !== undefined && questionSet.endTime !== undefined && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>
                📺 Segment: {formatTime(questionSet.startTime)} - {formatTime(questionSet.endTime)}
              </span>
              <span>⏱️ Duration: {formatDuration(questionSet.startTime, questionSet.endTime)}</span>
            </div>
          )}
        </div>

        {/* Question Set Details */}
        <div className="p-6">
          {/* Topics */}
          {questionSet.metadata.topics && questionSet.metadata.topics.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-medium">Topics Covered</h3>
              <div className="flex flex-wrap gap-2">
                {questionSet.metadata.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expiration Warning */}
          {questionSet.expirationInfo && questionSet.expirationInfo.hoursRemaining <= 24 && (
            <div
              className={`mb-6 rounded-lg border p-4 ${getTimeRemainingColor(questionSet.expirationInfo.hoursRemaining)}`}
            >
              <h3 className="mb-2 font-medium">⏰ Time Sensitive</h3>
              <p className="text-sm">
                This question set will expire in {questionSet.expirationInfo.hoursRemaining} hours
                and {questionSet.expirationInfo.minutesRemaining} minutes. Complete it soon to avoid
                losing access!
              </p>
            </div>
          )}

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={onStart}
              className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-medium text-white transition-colors hover:bg-blue-700"
            >
              Start Quiz
            </button>

            <p className="mt-3 text-sm text-gray-500">
              You can take your time - there&apos;s no time limit for individual questions
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-3 text-lg font-medium text-blue-900">💡 Tips for Success</h3>
        <ul className="space-y-2 text-blue-800">
          <li>• Read each question carefully before looking at the options</li>
          <li>• Think about what you heard in the video segment</li>
          <li>• Don&apos;t overthink - your first instinct is often correct</li>
          <li>• Review the explanations to learn from any mistakes</li>
        </ul>
      </div>
    </div>
  )
}

export type { QuestionSet }
