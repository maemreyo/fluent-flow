'use client'

import { useEffect } from 'react'
import { useWordSelection } from '../../lib/hooks/use-word-selection'
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  RotateCcw, 
  Play, 
  TrendingUp,
  Award,
  Target,
  AlertTriangle
} from 'lucide-react'

interface EvaluationResult {
  questionId: string
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation: string
  points: number
}

interface ResultsSummaryProps {
  results: {
    sessionId: string
    score: number
    totalQuestions: number
    correctAnswers: number
    results: EvaluationResult[]
    submittedAt: string
    setIndex?: number
    difficulty?: string
  }
  onRestart: () => void
  videoTitle?: string
  videoUrl?: string
}

export function ResultsSummary({ results, onRestart, videoTitle, videoUrl }: ResultsSummaryProps) {
  const { enableSelection, disableSelection } = useWordSelection()
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600'
    if (score >= 60) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-red-600'
  }

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreMessage = (score: number) => {
    if (score >= 90) return '🌟 Outstanding! You have excellent comprehension skills!'
    if (score >= 80) return '🎉 Great job! You understood most of the content very well!'
    if (score >= 70) return '👍 Good work! You got most questions right!'
    if (score >= 60) return '📚 Not bad! Keep practicing to improve your understanding!'
    return '💪 Keep practicing! Review the explanations to learn more!'
  }


  // Add safety checks for results data
  if (!results || typeof results.score !== 'number' || typeof results.totalQuestions !== 'number') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 text-4xl">⚠️</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-800">Results Not Available</h1>
          <p className="mb-6 text-gray-600">There was an issue loading your quiz results.</p>
          <button
            onClick={onRestart}
            className="rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    )
  }

  // Ensure results.results exists and is an array
  const questionResults = Array.isArray(results.results) ? results.results : []

  // Enable word selection on mount
  useEffect(() => {
    enableSelection('results-summary', 'quiz', results.sessionId)
    return () => {
      disableSelection('results-summary')
    }
  }, [results.sessionId, enableSelection, disableSelection])

  const getPerformanceIcon = (score: number) => {
    if (score >= 90) return Trophy
    if (score >= 80) return Award
    if (score >= 70) return Target
    return TrendingUp
  }

  const PerformanceIcon = getPerformanceIcon(results.score)

  return (
    <div id="results-summary" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl p-6">
        {/* Enhanced Header */}
        <div className="mb-12 text-center">
          <div className="mb-8 inline-flex items-center justify-center">
            <div className="p-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 shadow-2xl animate-pulse">
              <PerformanceIcon className="w-16 h-16 text-indigo-600" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
            Quiz Complete!
          </h1>
          
          {videoTitle && (
            <div className="mx-auto max-w-3xl">
              <div className="relative">
                {/* Background blur effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-blue-50/50 rounded-3xl blur-3xl -z-10"></div>
                
                <div className="relative rounded-3xl border-2 border-white/20 shadow-xl bg-white/80 backdrop-blur-sm p-6">
                  <div className="flex items-center justify-center gap-3">
                    <Play className="w-6 h-6 text-indigo-600" />
                    <p className="text-xl font-semibold text-gray-800">{videoTitle}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Score Summary */}
        <div className="mb-12">
          <div className="relative">
            {/* Background blur effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-blue-50/50 rounded-3xl blur-3xl -z-10"></div>
            
            <div className="relative rounded-3xl border-2 border-white/20 shadow-2xl bg-white/80 backdrop-blur-sm p-10">
              <div className="text-center">
                {/* Score Circle */}
                <div className="relative mb-8">
                  <div className={`mx-auto mb-6 flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br ${getScoreColor(results.score)} shadow-2xl`}>
                    <div className="flex h-48 w-48 items-center justify-center rounded-full bg-white shadow-inner">
                      <div className="text-center">
                        <div className={`text-5xl font-black ${getScoreTextColor(results.score)} mb-2`}>
                          {results.score}%
                        </div>
                        <div className="text-sm font-medium text-gray-600">Final Score</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Message */}
                <div className="mb-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Target className="w-6 h-6 text-indigo-600" />
                    <span className="text-2xl font-bold text-gray-800">
                      {results.correctAnswers} out of {results.totalQuestions} questions correct
                    </span>
                  </div>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                    {getScoreMessage(results.score)}
                  </p>
                </div>

                {/* Enhanced Performance Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <div className="group transform rounded-3xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8 shadow-lg transition-all hover:scale-105 hover:shadow-2xl">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                      <div className="text-4xl font-black text-green-600">{results.correctAnswers}</div>
                    </div>
                    <div className="text-base font-bold text-green-700">Correct Answers</div>
                    <div className="text-sm text-green-600 mt-2">
                      {Math.round((results.correctAnswers / results.totalQuestions) * 100)}% accuracy
                    </div>
                  </div>
                  
                  <div className="group transform rounded-3xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-8 shadow-lg transition-all hover:scale-105 hover:shadow-2xl">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <XCircle className="w-8 h-8 text-red-600" />
                      <div className="text-4xl font-black text-red-600">
                        {results.totalQuestions - results.correctAnswers}
                      </div>
                    </div>
                    <div className="text-base font-bold text-red-700">Incorrect Answers</div>
                    <div className="text-sm text-red-600 mt-2">
                      Areas for improvement
                    </div>
                  </div>
                  
                  <div className="group transform rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 shadow-lg transition-all hover:scale-105 hover:shadow-2xl">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <BarChart3 className="w-8 h-8 text-blue-600" />
                      <div className="text-4xl font-black text-blue-600">{results.totalQuestions}</div>
                    </div>
                    <div className="text-base font-bold text-blue-700">Total Questions</div>
                    <div className="text-sm text-blue-600 mt-2">
                      Complete assessment
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Question Review - Only show if we have question results */}
        {questionResults.length > 0 && (
          <div className="mb-8 transform rounded-3xl border-2 border-white bg-white/90 p-8 shadow-2xl shadow-blue-500/20 backdrop-blur-sm">
            <h2 className="mb-8 text-center text-3xl font-bold text-gray-800">
              📋 Detailed Review
            </h2>

            <div className="space-y-6">
              {questionResults.map((result, index) => (
                <div key={result.questionId || index} className="transform rounded-2xl border-2 border-gray-100 bg-gradient-to-r from-gray-50 to-white p-6 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl">
                  <div className="mb-4 flex items-start justify-between">
                    <h3 className="flex-1 pr-4 text-xl font-bold text-gray-800">
                      #{index + 1} {result.question || 'Unknown question'}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-bold shadow-lg ${
                        result.isCorrect 
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
                          : 'bg-gradient-to-r from-red-400 to-red-500 text-white'
                      }`}
                    >
                      {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>

                  <div className="mb-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 flex items-center text-sm font-semibold text-gray-600">
                        👤 Your Answer:
                      </div>
                      <div
                        className={`transform rounded-2xl border-2 p-4 shadow-md transition-all ${
                          result.isCorrect
                            ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 text-green-800'
                            : 'border-red-300 bg-gradient-to-br from-red-50 to-rose-50 text-red-800'
                        }`}
                      >
                        <span className="font-semibold">{result.userAnswer || 'No answer'}</span>
                      </div>
                    </div>

                    {!result.isCorrect && (
                      <div>
                        <div className="mb-2 flex items-center text-sm font-semibold text-gray-600">
                          ✅ Correct Answer:
                        </div>
                        <div className="transform rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-4 text-green-800 shadow-md">
                          <span className="font-semibold">{result.correctAnswer || 'Unknown'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {result.explanation && (
                    <div className="transform rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-md">
                      <h4 className="mb-3 flex items-center text-lg font-bold text-blue-900">
                        💡 Explanation
                      </h4>
                      <p className="leading-relaxed text-blue-800">{result.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Action Buttons */}
        <div className="mb-8 flex flex-col justify-center gap-6 sm:flex-row">
          <button
            onClick={onRestart}
            className="transform rounded-3xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 hover:shadow-3xl"
          >
            🔄 Try Again
          </button>

          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transform rounded-3xl bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 px-8 py-4 text-center text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-purple-600 hover:via-purple-700 hover:to-pink-700 hover:shadow-3xl"
            >
              📺 Watch Video Again
            </a>
          )}

          <button
            onClick={() => window.print()}
            className="transform rounded-3xl bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 hover:shadow-3xl"
          >
            🖨️ Print Results
          </button>
        </div>

        {/* Enhanced Session Info */}
        {results.submittedAt && (
          <div className="transform rounded-3xl border border-gray-200 bg-white/70 p-6 text-center shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <span>⏰ {new Date(results.submittedAt).toLocaleString()}</span>
              <span className="text-gray-400">•</span>
              <span>🆔 {(results.sessionId || 'unknown').substring(0, 8)}...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export type { EvaluationResult }