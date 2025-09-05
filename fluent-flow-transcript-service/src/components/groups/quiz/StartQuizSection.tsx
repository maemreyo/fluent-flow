'use client'

import { toast } from 'sonner'
import { Button } from '../../ui/button'
import { Card, CardContent } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Separator } from '../../ui/separator'
import { Play, Users, Clock } from 'lucide-react'

interface StartQuizSectionProps {
  totalGenerated: number
  shareTokens: Record<string, string>
  onStartQuiz?: (shareTokens: Record<string, string>) => void
}

export function StartQuizSection({
  totalGenerated,
  shareTokens,
  onStartQuiz
}: StartQuizSectionProps) {
  if (totalGenerated === 0) return null

  const handleStartQuiz = () => {
    if (onStartQuiz) {
      onStartQuiz(shareTokens)
    } else {
      console.error('onStartQuiz not available')
      toast.error('Unable to start quiz. Please try refreshing the page.')
    }
  }

  return (
    <>
      <Separator className="my-8" />
      
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Users className="h-5 w-5" />
                <span className="font-semibold">Ready to Start</span>
              </div>
              <h3 className="text-2xl font-bold text-green-800">Quiz Session</h3>
              <p className="text-green-600 max-w-md mx-auto">
                All questions have been generated and are ready for your group session.
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-4">
              <Badge variant="secondary" className="bg-green-100 text-green-700 px-3 py-1">
                {totalGenerated} Questions Ready
              </Badge>
              <Badge variant="outline" className="border-green-200 text-green-700 px-3 py-1">
                <Clock className="h-3 w-3 mr-1" />
                ~{Math.ceil(totalGenerated / 2)} min
              </Badge>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleStartQuiz}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Play className="mr-2 h-5 w-5" />
              Start Quiz Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
