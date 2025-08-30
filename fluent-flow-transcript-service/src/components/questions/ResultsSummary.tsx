interface EvaluationResult {
  questionId: string
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation: string
  points: number
}

interface ResultsSummaryProps {
  results: {
    sessionId: string
    score: number
    totalQuestions: number
    correctAnswers: number
    results: EvaluationResult[]
    submittedAt: string
    setIndex?: number
    difficulty?: string
  }
  onRestart: () => void
  videoTitle?: string
  videoUrl?: string
}

export function ResultsSummary({ results, onRestart, videoTitle, videoUrl }: ResultsSummaryProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Outstanding! You have excellent comprehension skills!'
    if (score >= 80) return 'Great job! You understood most of the content very well!'
    if (score >= 70) return 'Good work! You got most questions right!'
    if (score >= 60) return 'Not bad! Keep practicing to improve your understanding!'
    return 'Keep practicing! Review the explanations to learn more!'
  }

  // Note: getDifficultyStats removed as it's not currently used
  // In a future implementation, we could add difficulty-based statistics

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-800">Quiz Complete!</h1>
        {videoTitle && (
          <p className="mb-4 text-gray-600">
            Results for: <span className="font-medium">{videoTitle}</span>
          </p>
        )}
      </div>

      {/* Score Summary */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-8">
        <div className="text-center">
          <div className={`mb-4 text-6xl font-bold ${getScoreColor(results.score)}`}>
            {results.score}%
          </div>

          <div className="mb-4 text-lg text-gray-600">
            {results.correctAnswers} out of {results.totalQuestions} questions correct
          </div>

          <div className="mb-6 text-gray-700">{getScoreMessage(results.score)}</div>

          {/* Performance Breakdown */}
          <div className="mx-auto grid max-w-md grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{results.correctAnswers}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {results.totalQuestions - results.correctAnswers}
              </div>
              <div className="text-sm text-gray-600">Incorrect</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{results.totalQuestions}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Question by Question Review */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-xl font-semibold text-gray-800">Question Review</h2>

        <div className="space-y-6">
          {results.results.map((result, index) => (
            <div key={result.questionId} className="border-b border-gray-100 pb-6 last:border-b-0">
              <div className="mb-3 flex items-start justify-between">
                <h3 className="flex-1 pr-4 text-lg font-medium text-gray-800">
                  Question {index + 1}: {result.question}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm text-gray-600">Your Answer:</div>
                  <div
                    className={`rounded-lg p-3 ${
                      result.isCorrect
                        ? 'border border-green-200 bg-green-50 text-green-800'
                        : 'border border-red-200 bg-red-50 text-red-800'
                    }`}
                  >
                    {result.userAnswer}
                  </div>
                </div>

                {!result.isCorrect && (
                  <div>
                    <div className="mb-1 text-sm text-gray-600">Correct Answer:</div>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
                      {result.correctAnswer}
                    </div>
                  </div>
                )}
              </div>

              {result.explanation && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-blue-900">Explanation</h4>
                  <p className="text-sm text-blue-800">{result.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <button
          onClick={onRestart}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          Try Again
        </button>

        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-gray-600 px-6 py-3 text-center text-white transition-colors hover:bg-gray-700"
          >
            Watch Video Again
          </a>
        )}

        <button
          onClick={() => window.print()}
          className="rounded-lg bg-green-600 px-6 py-3 text-white transition-colors hover:bg-green-700"
        >
          Print Results
        </button>
      </div>

      {/* Session Info */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Session completed at {new Date(results.submittedAt).toLocaleString()}</p>
        <p>Session ID: {results.sessionId}</p>
      </div>
    </div>
  )
}

export type { EvaluationResult }
