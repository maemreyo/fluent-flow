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
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Ready to Practice?</h1>
        <p className="text-gray-600">
          Let&apos;s test your understanding of the video content
        </p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Video Info Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {questionSet.videoTitle}
          </h2>
          
          {(questionSet.startTime !== undefined && questionSet.endTime !== undefined) && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>📺 Segment: {formatTime(questionSet.startTime)} - {formatTime(questionSet.endTime)}</span>
              <span>⏱️ Duration: {formatDuration(questionSet.startTime, questionSet.endTime)}</span>
            </div>
          )}
        </div>

        {/* Question Set Details */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Left Column */}
            <div>
              <h3 className="text-lg font-medium mb-4">Question Set Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Total Questions:</span>
                  <span className="font-medium">{questionSet.metadata.totalQuestions}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Difficulty Level:</span>
                  <span className="font-medium capitalize">{questionSet.metadata.difficulty}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Created By:</span>
                  <span className="font-medium">{questionSet.metadata.sharedBy}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">
                    {new Date(questionSet.metadata.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h3 className="text-lg font-medium mb-4">Question Breakdown</h3>
              {availableCounts ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                      <span className="text-gray-600">Easy Questions</span>
                    </span>
                    <span className="font-medium">{availableCounts.easy}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                      <span className="text-gray-600">Medium Questions</span>
                    </span>
                    <span className="font-medium">{availableCounts.medium}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                      <span className="text-gray-600">Hard Questions</span>
                    </span>
                    <span className="font-medium">{availableCounts.hard}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
                  Question breakdown will be shown after loading
                </div>
              )}
            </div>
          </div>

          {/* Topics */}
          {questionSet.metadata.topics && questionSet.metadata.topics.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Topics Covered</h3>
              <div className="flex flex-wrap gap-2">
                {questionSet.metadata.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expiration Warning */}
          {questionSet.expirationInfo && questionSet.expirationInfo.hoursRemaining <= 24 && (
            <div className={`mb-6 p-4 rounded-lg border ${getTimeRemainingColor(questionSet.expirationInfo.hoursRemaining)}`}>
              <h3 className="font-medium mb-2">⏰ Time Sensitive</h3>
              <p className="text-sm">
                This question set will expire in {questionSet.expirationInfo.hoursRemaining} hours 
                and {questionSet.expirationInfo.minutesRemaining} minutes. 
                Complete it soon to avoid losing access!
              </p>
            </div>
          )}

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={onStart}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
            >
              Start Quiz
            </button>
            
            <p className="text-sm text-gray-500 mt-3">
              You can take your time - there&apos;s no time limit for individual questions
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-3">💡 Tips for Success</h3>
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