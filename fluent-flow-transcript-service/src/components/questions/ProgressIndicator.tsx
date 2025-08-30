interface DifficultyGroup {
  difficulty: 'easy' | 'medium' | 'hard'
  questions: any[]
  completed: boolean
  score?: number
}

interface ProgressIndicatorProps {
  difficultyGroups: DifficultyGroup[]
  currentSetIndex: number
  currentQuestionIndex: number
  totalQuestionsInCurrentSet: number
}

export function ProgressIndicator({ 
  difficultyGroups, 
  currentSetIndex, 
  currentQuestionIndex, 
  totalQuestionsInCurrentSet 
}: ProgressIndicatorProps) {
  const getDifficultyColor = (difficulty: string, isActive: boolean, isCompleted: boolean) => {
    if (isCompleted) {
      return 'bg-green-500 text-white'
    }
    if (isActive) {
      switch (difficulty) {
        case 'easy': return 'bg-green-100 border-green-500 text-green-800 border-2'
        case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800 border-2'
        case 'hard': return 'bg-red-100 border-red-500 text-red-800 border-2'
        default: return 'bg-gray-100 border-gray-500 text-gray-800 border-2'
      }
    }
    return 'bg-gray-100 text-gray-500 border border-gray-300'
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Progress Overview</h2>
      
      <div className="space-y-4">
        {difficultyGroups.map((group, index) => {
          const isActive = index === currentSetIndex
          const isCompleted = group.completed
          
          return (
            <div key={index} className="flex items-center space-x-4">
              {/* Set Badge */}
              <div className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg min-w-0 flex-1
                ${getDifficultyColor(group.difficulty, isActive, isCompleted)}
              `}>
                <span className="text-lg">{getDifficultyIcon(group.difficulty)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">
                      {group.difficulty} Questions
                    </span>
                    <span className="text-sm">
                      Set {index + 1}
                    </span>
                  </div>
                  
                  {/* Progress Bar for Current Set */}
                  {isActive && !isCompleted && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Question {currentQuestionIndex + 1} of {totalQuestionsInCurrentSet}</span>
                        <span>{Math.round(((currentQuestionIndex + 1) / totalQuestionsInCurrentSet) * 100)}%</span>
                      </div>
                      <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                        <div 
                          className="bg-current h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((currentQuestionIndex + 1) / totalQuestionsInCurrentSet) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Score for Completed Sets */}
                  {isCompleted && group.score !== undefined && (
                    <div className="mt-1 text-sm">
                      Score: {group.score}%
                    </div>
                  )}
                </div>
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                    ✓
                  </div>
                ) : isActive ? (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                    {currentQuestionIndex + 1}
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">
                    {index + 1}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Overall Progress */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Overall Progress</span>
          <span>
            {difficultyGroups.filter(g => g.completed).length} of {difficultyGroups.length} sets completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${(difficultyGroups.filter(g => g.completed).length / difficultyGroups.length) * 100}%` 
            }}
          ></div>
        </div>
      </div>
    </div>
  )
}

export type { DifficultyGroup }