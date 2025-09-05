'use client'

import { toast } from 'sonner'
import { Button } from '../../ui/button'

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
    <div className="border-t border-gray-200 pt-8">
      <div className="space-y-4 text-center">
        <Button
          onClick={handleStartQuiz}
          className="rounded-lg bg-green-600 px-12 py-4 font-semibold text-white hover:bg-green-700"
        >
          Start Quiz
        </Button>
      </div>
    </div>
  )
}
