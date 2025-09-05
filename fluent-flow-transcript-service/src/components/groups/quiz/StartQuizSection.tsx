'use client'

import { Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../ui/button'
import { Separator } from '../../ui/separator'

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

      <Button
        onClick={handleStartQuiz}
        size="lg"
        className="bg-green-600 px-12 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-green-700 hover:shadow-xl"
      >
        <Play className="mr-2 h-5 w-5" />
        Start Quiz Session
      </Button>
    </>
  )
}
