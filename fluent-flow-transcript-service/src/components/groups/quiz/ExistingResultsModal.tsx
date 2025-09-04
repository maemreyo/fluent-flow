'use client'

import { useState } from 'react'
import { ArrowLeft, Clock, RotateCcw, Target, Trophy } from 'lucide-react'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../ui/dialog'
import { Separator } from '../../ui/separator'

interface ExistingResultsModalProps {
  isOpen: boolean
  results: {
    score: number
    totalQuestions: number
    correctAnswers: number
    timeSpent: number
    completedAt: string
  }
  onGoBackToPresets: () => void
  onStartFresh: () => void
  onClose: () => void
}

export function ExistingResultsModal({
  isOpen,
  results,
  onGoBackToPresets,
  onStartFresh,
  onClose
}: ExistingResultsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleStartFresh = async () => {
    setIsDeleting(true)
    try {
      await onStartFresh()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Previous Results Found
          </DialogTitle>
          <DialogDescription>
            You've already completed this quiz. Here are your previous results:
          </DialogDescription>
        </DialogHeader>

        {/* Results Summary Cards */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Score Card */}
            <Card className="border-indigo-200 p-0">
              <CardHeader className="px-3 pb-2 pt-3">
                <CardTitle className="flex items-center gap-1 text-xs text-indigo-600">
                  <Trophy className="h-3 w-3" />
                  Score
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="text-2xl font-bold text-indigo-700">{results.score}%</div>
              </CardContent>
            </Card>

            {/* Correct Answers Card */}
            <Card className="border-green-200 p-0">
              <CardHeader className="px-3 pb-2 pt-3">
                <CardTitle className="flex items-center gap-1 text-xs text-green-600">
                  <Target className="h-3 w-3" />
                  Correct
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="text-2xl font-bold text-green-700">
                  {results.correctAnswers}/{results.totalQuestions}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time and Date Card */}
          <Card className="p-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Time: {formatTime(results.timeSpent)}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatDate(results.completedAt)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={onGoBackToPresets} variant="outline" className="w-full" size="lg">
            <ArrowLeft className="h-4 w-4" />
            Go Back to Preset Selection
          </Button>

          <Button
            onClick={handleStartFresh}
            disabled={isDeleting}
            size="lg"
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <RotateCcw className={`h-4 w-4 ${isDeleting ? 'animate-spin' : ''}`} />
            {isDeleting ? 'Starting Fresh...' : 'Start Fresh'}
          </Button>
        </div>

        <div className="text-center">
          <Badge variant="outline" className="border-orange-200 text-xs text-orange-600">
            Starting fresh will permanently delete your previous results
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}
