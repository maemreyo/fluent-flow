import { Question } from './QuestionCard'

interface GridViewProps {
  questions: Question[]
  onClose: () => void
  videoTitle?: string
}

export function GridView({ questions, onClose, videoTitle }: GridViewProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200' 
      case 'hard': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢'
      case 'medium': return '🟡'
      case 'hard': return '🔴'
      default: return '⚪'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="bg-white rounded-3xl shadow-2xl mb-6 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Questions Preview</h1>
                {videoTitle && (
                  <p className="text-gray-600">{videoTitle}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Preview all questions before starting • Total: {questions.length} questions
                </p>
              </div>
              <button
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-2xl font-medium transition-colors shadow-lg"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Questions Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {questions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-3xl shadow-lg border-2 border-gray-100 p-6 hover:shadow-xl transition-shadow">
                {/* Question Header */}
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    #{index + 1}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getDifficultyIcon(question.difficulty)}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-lg font-semibold text-gray-900 mb-4 leading-relaxed">
                  {question.question}
                </h3>

                {/* Options - Preview Only (No Answers Shown) */}
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const optionLetter = String.fromCharCode(65 + optionIndex)
                    
                    return (
                      <div 
                        key={optionIndex}
                        className="flex items-center space-x-3 p-3 rounded-xl border-2 bg-gray-50 border-gray-200 text-gray-700"
                      >
                        <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-300 text-gray-700">
                          {optionLetter}
                        </span>
                        <span className="flex-1 text-sm">{option}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Note about answers */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-sm text-blue-700 font-medium">
                    💡 Answers will be revealed during the quiz
                  </p>
                </div>

                {/* Question Type */}
                <div className="mt-4 text-center">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                    {question.type.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all transform hover:scale-105"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}