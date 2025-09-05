'use client'

import { CheckCircle, XCircle, Clock, Play, TrendingUp } from 'lucide-react'
import { Badge } from '../../../ui/badge'
import { Button } from '../../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import { Separator } from '../../../ui/separator'
import { Alert, AlertDescription } from '../../../ui/alert'

interface QuestionResult {
  questionId: string
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation?: string
  timeStart?: number
  timeEnd?: number
  videoUrl?: string
}

interface QuestionReviewListProps {
  results: {
    results: QuestionResult[]
    totalQuestions: number
  }
}

export function QuestionReviewList({ results }: QuestionReviewListProps) {
  // Format video timestamp for display
  const formatVideoTimestamp = (seconds?: number) => {
    if (!seconds) return null
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Generate video link with timestamp
  const getVideoLink = (videoUrl?: string, startTime?: number) => {
    if (!videoUrl || !startTime) return null
    
    // Handle YouTube URLs
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.includes('youtu.be') 
        ? videoUrl.split('/').pop()?.split('?')[0]
        : new URLSearchParams(new URL(videoUrl).search).get('v')
      
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}s`
      }
    }
    
    // For other video formats, just return the original URL
    return videoUrl
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Question Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {results.results.filter((r: any) => r.isCorrect).length}
            </div>
            <div className="text-xs text-gray-600">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {results.results.filter((r: any) => !r.isCorrect).length}
            </div>
            <div className="text-xs text-gray-600">Incorrect</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{results.totalQuestions}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
        </div>

        {/* Questions List - Row based */}
        <div className="space-y-4">
          {results.results.map((result: QuestionResult, index: number) => {
            const timestamp = formatVideoTimestamp(result.timeStart)
            const videoLink = getVideoLink(result.videoUrl, result.timeStart)
            
            return (
              <div key={result.questionId} className="group">
                {/* Question Row */}
                <div className={`rounded-lg border-l-4 bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                  result.isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <div className="space-y-3">
                    {/* Header with question number, status, and timestamp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            result.isCorrect 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {index + 1}
                          </div>
                          {result.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        
                        <Badge variant={result.isCorrect ? 'default' : 'destructive'} className="text-xs">
                          {result.isCorrect ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </div>

                      {/* Video timestamp link */}
                      {timestamp && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            {timestamp}
                            {result.timeEnd && ` - ${formatVideoTimestamp(result.timeEnd)}`}
                          </Badge>
                          {videoLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              onClick={() => window.open(videoLink, '_blank')}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Watch
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Question Text */}
                    <div className="pl-10">
                      <p className="text-gray-900 font-medium leading-relaxed">
                        {result.question}
                      </p>
                    </div>

                    <Separator />

                    {/* Answer Analysis */}
                    <div className="pl-10 space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        {/* Your Answer */}
                        <div className={`rounded-lg p-3 ${
                          result.isCorrect 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-600">Your Answer:</span>
                            {result.isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <p className={`text-sm font-medium ${
                            result.isCorrect ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {result.userAnswer}
                          </p>
                        </div>

                        {/* Correct Answer (only show if user was wrong) */}
                        {!result.isCorrect && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-600">Correct Answer:</span>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-green-700">
                              {result.correctAnswer}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Explanation */}
                      {result.explanation && (
                        <Alert className="border-blue-200 bg-blue-50">
                          <AlertDescription className="text-blue-800">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-blue-700">Explanation:</p>
                              <p className="text-sm">{result.explanation}</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}