import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'

interface DifficultyGroup {
  difficulty: string
  questions: any[]
}

interface QuestionInfoCardProps {
  difficultyGroups: DifficultyGroup[]
  onStart: () => void
  sessionTitle?: string
}

export function QuestionInfoCard({ 
  difficultyGroups, 
  onStart, 
  sessionTitle = 'Group Session' 
}: QuestionInfoCardProps) {
  const totalQuestions = difficultyGroups.reduce((sum, group) => sum + group.questions.length, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="border-white/20 bg-white/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-800">
              Ready to Start Quiz
            </CardTitle>
            <p className="text-gray-600">{sessionTitle}</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-blue-50 p-6">
              <h3 className="mb-4 text-center font-semibold text-blue-900">
                Question Summary
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                {difficultyGroups.map((group, index) => (
                  <div key={index} className="text-center">
                    <Badge 
                      variant="secondary" 
                      className={`mb-2 capitalize ${
                        group.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        group.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {group.difficulty}
                    </Badge>
                    <div className="text-2xl font-bold text-blue-600">
                      {group.questions.length}
                    </div>
                    <div className="text-xs text-gray-500">questions</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600">
                Total Questions: {' '}
                <span className="font-bold text-gray-800">
                  {totalQuestions}
                </span>
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={onStart}
                size="lg"
                className="px-8 py-4 text-lg font-semibold"
              >
                Start Quiz →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}