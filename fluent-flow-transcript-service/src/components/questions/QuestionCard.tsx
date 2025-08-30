interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  difficulty: 'easy' | 'medium' | 'hard'
  type: string
  explanation?: string
}

interface QuestionResponse {
  questionIndex: number
  answer: string
}

interface QuestionCardProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  currentSetIndex: number
  totalSets: number
  responses: QuestionResponse[]
  onAnswerSelect: (questionIndex: number, answer: string) => void
  showResults?: boolean
  evaluationResult?: any
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  currentSetIndex,
  totalSets,
  responses,
  onAnswerSelect,
  showResults = false,
  evaluationResult
}: QuestionCardProps) {
  const selectedAnswer = responses.find(r => r.questionIndex === questionIndex)?.answer

  // getDifficultyColor removed as difficulty is now hidden from users

  const getOptionStatus = (optionLetter: string) => {
    if (!showResults) return 'default'
    if (!evaluationResult) return 'default'

    if (optionLetter === evaluationResult.correctAnswer) return 'correct'
    if (selectedAnswer === optionLetter && !evaluationResult.isCorrect) return 'incorrect'
    return 'default'
  }

  const getOptionClasses = (optionLetter: string, isSelected: boolean) => {
    const status = getOptionStatus(optionLetter)
    const baseClasses =
      'block w-full text-left p-5 rounded-2xl border-2 transition-all duration-200'

    if (showResults) {
      switch (status) {
        case 'correct':
          return `${baseClasses} bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-800 shadow-lg`
        case 'incorrect':
          return `${baseClasses} bg-gradient-to-r from-red-50 to-rose-50 border-red-300 text-red-800 shadow-lg`
        default:
          return `${baseClasses} bg-gray-50 border-gray-200 text-gray-600`
      }
    }

    if (isSelected) {
      return `${baseClasses} bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 text-blue-900 shadow-lg`
    }

    return `${baseClasses} bg-white border-gray-200 text-gray-800 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md`
  }

  return (
    <div className="rounded-3xl border-2 border-blue-100 bg-white p-8 shadow-xl shadow-blue-500/5">
      {/* Question Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-bold text-white">
            Set {currentSetIndex + 1} of {totalSets} • Question {questionIndex + 1} of{' '}
            {totalQuestions}
          </div>
        </div>
      </div>

      {/* Question Text */}
      <div className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-gray-50 to-blue-50 p-6">
        <h3 className="text-xl font-semibold leading-relaxed text-gray-900">{question.question}</h3>
      </div>

      {/* Answer Options */}
      <div className="mb-8 space-y-4">
        {question.options.map((option, index) => {
          const optionLetter = String.fromCharCode(65 + index) // A, B, C, D
          const isSelected = selectedAnswer === optionLetter

          return (
            <button
              key={index}
              className={`${getOptionClasses(optionLetter, isSelected)} hover:scale-102 transition-all duration-200`}
              onClick={() => !showResults && onAnswerSelect(questionIndex, optionLetter)}
              disabled={showResults}
            >
              <div className="flex items-start space-x-4">
                <span
                  className={`flex h-12 w-12 flex-shrink-0 transform items-center justify-center rounded-2xl text-lg font-bold shadow-lg transition-transform ${
                    isSelected
                      ? 'scale-110 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white shadow-blue-500/30'
                      : 'bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 text-gray-700 hover:scale-105'
                  }`}
                >
                  {optionLetter}
                </span>
                <span className="flex-1 py-2 text-lg leading-relaxed text-gray-800">{option}</span>
                {showResults && getOptionStatus(optionLetter) === 'correct' && (
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 font-bold text-white shadow-lg">
                    ✓
                  </span>
                )}
                {showResults && getOptionStatus(optionLetter) === 'incorrect' && (
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500 font-bold text-white shadow-lg">
                    ✗
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Results/Explanation Section */}
      {showResults && evaluationResult && (
        <div className="border-t border-gray-200 pt-4">
          <div className="mb-3 flex items-center space-x-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-medium ${
                evaluationResult.isCorrect
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {evaluationResult.isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
            <span className="text-sm text-gray-600">
              +{evaluationResult.points} {evaluationResult.points === 1 ? 'point' : 'points'}
            </span>
          </div>

          {evaluationResult.explanation && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 text-sm font-medium text-blue-900">Explanation</h4>
              <p className="text-sm text-blue-800">{evaluationResult.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export type { Question, QuestionResponse }
