'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  difficulty: 'easy' | 'medium' | 'hard'
  type: string
  explanation?: string
}

interface QuestionSet {
  id: string
  title: string
  videoTitle: string
  videoUrl: string
  questions: Question[]
  metadata: {
    totalQuestions: number
    createdAt: string
    sharedBy: string
    difficulty: string
    topics: string[]
  }
}

interface QuestionResponse {
  questionIndex: number
  answer: string
}

interface EvaluationResult {
  questionId: string
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation: string
  points: number
}

export default function QuestionsPage() {
  const params = useParams()
  const token = params.token as string

  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // Load questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch(`/api/questions/${token}`)
        
        if (!response.ok) {
          throw new Error('Failed to load questions')
        }

        const data = await response.json()
        setQuestionSet(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadQuestions()
    }
  }, [token])

  const handleAnswerSelect = (answer: string) => {
    const newResponses = [...responses]
    const existingIndex = newResponses.findIndex(r => r.questionIndex === currentQuestionIndex)
    
    if (existingIndex >= 0) {
      newResponses[existingIndex] = { questionIndex: currentQuestionIndex, answer }
    } else {
      newResponses.push({ questionIndex: currentQuestionIndex, answer })
    }
    
    setResponses(newResponses)
  }

  const getCurrentResponse = () => {
    return responses.find(r => r.questionIndex === currentQuestionIndex)?.answer || ''
  }

  const canProceed = () => {
    return getCurrentResponse() !== ''
  }

  const nextQuestion = () => {
    if (questionSet && currentQuestionIndex < questionSet.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const submitAnswers = async () => {
    if (!questionSet) return

    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/questions/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responses })
      })

      if (!response.ok) {
        throw new Error('Failed to submit answers')
      }

      const result = await response.json()
      setResults(result)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answers')
    } finally {
      setSubmitting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'hard': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (error || !questionSet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Questions Not Found</h1>
          <p className="text-gray-600 mb-4">
            {error || 'The questions you\'re looking for may have expired or been removed.'}
          </p>
          <a href="/" className="text-blue-600 hover:text-blue-500">
            Go back to home
          </a>
        </div>
      </div>
    )
  }

  if (submitted && results) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
              <p className="text-gray-600">Here are your results</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className={`text-3xl font-bold ${getScoreColor(results.score)}`}>
                    {results.score}%
                  </div>
                  <div className="text-gray-600">Overall Score</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    {results.correctAnswers}
                  </div>
                  <div className="text-gray-600">Correct Answers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-600">
                    {results.totalQuestions}
                  </div>
                  <div className="text-gray-600">Total Questions</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Question Review</h2>
              {results.results.map((result: EvaluationResult, index: number) => (
                <div 
                  key={result.questionId} 
                  className={`border rounded-lg p-6 ${result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Question {index + 1}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                  
                  <p className="text-gray-800 mb-4">{result.question}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-600">Your answer:</span>
                      <span className={`font-medium ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {result.userAnswer}
                      </span>
                    </div>
                    
                    {!result.isCorrect && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-600">Correct answer:</span>
                        <span className="font-medium text-green-700">
                          {result.correctAnswer}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {result.explanation && (
                    <div className="bg-white border-l-4 border-blue-500 p-4 rounded">
                      <h4 className="font-medium text-gray-900 mb-1">Explanation:</h4>
                      <p className="text-gray-700">{result.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questionSet.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questionSet.questions.length) * 100
  const isLastQuestion = currentQuestionIndex === questionSet.questions.length - 1
  const allQuestionsAnswered = responses.length === questionSet.questions.length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{questionSet.title}</h1>
              <p className="text-gray-600">📺 {questionSet.videoTitle}</p>
              <p className="text-sm text-gray-500">
                Shared by {questionSet.metadata.sharedBy} • {new Date(questionSet.metadata.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="text-lg font-semibold text-gray-900">
                {currentQuestionIndex + 1} / {questionSet.questions.length}
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Question {currentQuestionIndex + 1}
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}>
              {currentQuestion.difficulty} • {currentQuestion.type}
            </span>
          </div>
          
          <p className="text-lg text-gray-800 mb-6 leading-relaxed">
            {currentQuestion.question}
          </p>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                  getCurrentResponse() === option
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-500">
              {responses.length} / {questionSet.questions.length} questions answered
            </div>

            {isLastQuestion ? (
              <button
                onClick={submitAnswers}
                disabled={!allQuestionsAnswered || submitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                disabled={!canProceed()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}