import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Progress } from '../../ui/progress'
import { Separator } from '../../ui/separator'
import { Avatar, AvatarFallback } from '../../ui/avatar'
import { 
  PlayCircle, 
  Clock, 
  Users, 
  Trophy, 
  Target,
  Zap,
  Brain,
  Flame,
  CheckCircle2,
  Timer
} from 'lucide-react'

interface DifficultyGroup {
  difficulty: string
  questions: any[]
}

interface QuestionInfoCardProps {
  difficultyGroups: DifficultyGroup[]
  onStart: () => void
  sessionTitle?: string
}

const getDifficultyIcon = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy': return <Zap className="h-4 w-4" />
    case 'medium': return <Brain className="h-4 w-4" />
    case 'hard': return <Flame className="h-4 w-4" />
    default: return <Target className="h-4 w-4" />
  }
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'bg-emerald-50 border-emerald-200 text-emerald-700'
    case 'medium': return 'bg-amber-50 border-amber-200 text-amber-700'
    case 'hard': return 'bg-rose-50 border-rose-200 text-rose-700'
    default: return 'bg-gray-50 border-gray-200 text-gray-700'
  }
}

const getEstimatedTime = (totalQuestions: number) => {
  // Estimate 30 seconds per question
  const minutes = Math.ceil((totalQuestions * 30) / 60)
  return minutes
}

export function QuestionInfoCard({ 
  difficultyGroups, 
  onStart, 
  sessionTitle = 'Group Session' 
}: QuestionInfoCardProps) {
  const totalQuestions = difficultyGroups.reduce((sum, group) => sum + group.questions.length, 0)
  const estimatedTime = getEstimatedTime(totalQuestions)

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Avatar className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600">
              <AvatarFallback className="bg-transparent text-white">
                <Trophy className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
          </div>
          <h1 className="mb-2 text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Ready to Start Quiz
          </h1>
          <p className="text-lg text-gray-600">{sessionTitle}</p>
        </div>

        {/* Main Content Card */}
        <Card className="border-white/20 bg-white/90 shadow-2xl backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Group Quiz</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span>~{estimatedTime} minutes</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span>{totalQuestions} questions</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Quiz Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
                <CardContent className="p-6 text-center">
                  <div className="mb-3 flex justify-center">
                    <div className="rounded-full bg-indigo-100 p-3">
                      <Target className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-indigo-700">{totalQuestions}</div>
                  <div className="text-sm text-indigo-600">Total Questions</div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="p-6 text-center">
                  <div className="mb-3 flex justify-center">
                    <div className="rounded-full bg-purple-100 p-3">
                      <Clock className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-700">~{estimatedTime}</div>
                  <div className="text-sm text-purple-600">Minutes</div>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
                <CardContent className="p-6 text-center">
                  <div className="mb-3 flex justify-center">
                    <div className="rounded-full bg-emerald-100 p-3">
                      <Trophy className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">{difficultyGroups.length}</div>
                  <div className="text-sm text-emerald-600">Difficulty Levels</div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Difficulty Breakdown */}
            <div className="space-y-4">
              <h3 className="text-center text-xl font-semibold text-gray-800 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Question Breakdown
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {difficultyGroups.map((group, index) => {
                  const percentage = (group.questions.length / totalQuestions) * 100
                  
                  return (
                    <Card key={index} className={`border-2 transition-all hover:scale-105 ${getDifficultyColor(group.difficulty)}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <Badge 
                            variant="outline" 
                            className={`capitalize font-medium ${getDifficultyColor(group.difficulty)} border-current`}
                          >
                            {getDifficultyIcon(group.difficulty)}
                            <span className="ml-1">{group.difficulty}</span>
                          </Badge>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{group.questions.length}</div>
                            <div className="text-xs opacity-75">questions</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{Math.round(percentage)}%</span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className="h-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Start Button Section */}
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <p className="text-gray-600">
                  You're about to start a quiz with <span className="font-semibold text-gray-800">{totalQuestions} questions</span>
                </p>
                <p className="text-sm text-gray-500">
                  Take your time and do your best! Good luck! 🍀
                </p>
              </div>

              <Button
                onClick={onStart}
                size="lg"
                className="group px-8 py-4 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <PlayCircle className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                Start Quiz
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Tips */}
        {/* <div className="mt-8 text-center">
          <Card className="border-amber-200 bg-amber-50/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2 text-amber-700">
                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></div>
                <span className="text-sm font-medium">
                  💡 Tip: Read each question carefully and take your time to think before answering
                </span>
              </div>
            </CardContent>
          </Card>
        </div> */}
      </div>
    </div>
  )
}