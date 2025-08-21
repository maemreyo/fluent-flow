import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Target,
  Volume2,
  X
} from 'lucide-react'
import type { 
  ConversationQuestions, 
  ConversationQuestion,
  QuestionPracticeResult,
  SavedLoop
} from '../lib/types/fluent-flow-types'

interface ConversationQuestionsPanelProps {
  questions: ConversationQuestions
  loop: SavedLoop
  onClose: () => void
  onComplete?: (results: QuestionPracticeResult[], score: number) => void
}

export const ConversationQuestionsPanel: React.FC<ConversationQuestionsPanelProps> = ({
  questions,
  loop,
  onClose,
  onComplete
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<QuestionPracticeResult[]>([])
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date())

  const currentQuestion = questions.questions[currentQuestionIndex]
  const totalQuestions = questions.questions.length
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100

  useEffect(() => {
    setQuestionStartTime(new Date())
  }, [currentQuestionIndex])

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }))
  }

  const handleNext = () => {
    if (!selectedAnswers[currentQuestion.id]) return

    // Record result for current question
    const timeSpent = (new Date().getTime() - questionStartTime.getTime()) / 1000
    const isCorrect = selectedAnswers[currentQuestion.id] === currentQuestion.correctAnswer
    
    const result: QuestionPracticeResult = {
      questionId: currentQuestion.id,
      selectedAnswer: selectedAnswers[currentQuestion.id],
      isCorrect,
      timeSpent,
      attemptedAt: new Date()
    }

    const newResults = [...results, result]
    setResults(newResults)

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Calculate final score and complete
      const correctAnswers = newResults.filter(r => r.isCorrect).length
      const score = Math.round((correctAnswers / totalQuestions) * 100)
      
      setShowResults(true)
      onComplete?.(newResults, score)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleRestart = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswers({})
    setShowResults(false)
    setResults([])
    setStartTime(new Date())
    setQuestionStartTime(new Date())
  }

  const getOptionLetter = (index: number): string => {
    return ['A', 'B', 'C', 'D'][index]
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'  
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'main_idea': return <Target className="w-3 h-3" />
      case 'detail': return <Brain className="w-3 h-3" />
      case 'vocabulary': return <Volume2 className="w-3 h-3" />
      default: return <Brain className="w-3 h-3" />
    }
  }

  if (showResults) {
    const correctAnswers = results.filter(r => r.isCorrect).length
    const score = Math.round((correctAnswers / totalQuestions) * 100)
    const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0)

    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Practice Complete!
            </CardTitle>
            <CardDescription>
              Questions for: {loop.title}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Score Summary */}
          <div className="text-center space-y-2">
            <div className="text-6xl font-bold text-green-600">{score}%</div>
            <p className="text-lg text-muted-foreground">
              {correctAnswers} out of {totalQuestions} correct
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.round(totalTime)}s total
              </span>
              <span>
                {Math.round(totalTime / totalQuestions)}s avg per question
              </span>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-3">
            <h3 className="font-semibold">Question Details:</h3>
            {questions.questions.map((question, index) => {
              const result = results[index]
              const isCorrect = result?.isCorrect ?? false
              
              return (
                <div 
                  key={question.id}
                  className={`p-3 rounded-lg border ${
                    isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getTypeIcon(question.type)}
                        {question.type}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(result?.timeSpent || 0)}s
                    </span>
                  </div>
                  
                  <p className="font-medium text-sm mb-2">{question.question}</p>
                  
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className={`p-1 rounded ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                      Your answer: {result?.selectedAnswer} - {
                        question.options.find(opt => opt.startsWith(result?.selectedAnswer))
                      }
                    </div>
                    {!isCorrect && (
                      <div className="p-1 rounded bg-green-100">
                        Correct answer: {question.correctAnswer} - {
                          question.options.find(opt => opt.startsWith(question.correctAnswer))
                        }
                      </div>
                    )}
                  </div>
                  
                  {!isCorrect && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {question.explanation}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-2">
            <Button onClick={handleRestart} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Question Practice UI
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Listening Comprehension
          </CardTitle>
          <CardDescription>
            {loop.title} • Question {currentQuestionIndex + 1} of {totalQuestions}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Question Meta */}
        <div className="flex items-center gap-2">
          <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
            {currentQuestion.difficulty}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {getTypeIcon(currentQuestion.type)}
            {currentQuestion.type.replace('_', ' ')}
          </Badge>
          {currentQuestion.timestamp && (
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {Math.round(currentQuestion.timestamp)}s
            </Badge>
          )}
        </div>

        {/* Question */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {currentQuestion.question}
          </h3>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const letter = getOptionLetter(index)
              const isSelected = selectedAnswers[currentQuestion.id] === letter
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(letter)}
                  className={`w-full p-4 text-left rounded-lg border transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                      isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'
                    }`}>
                      {letter}
                    </div>
                    <span>{option.substring(3)}</span> {/* Remove "A) " prefix */}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button 
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <Button 
            onClick={handleNext}
            disabled={!selectedAnswers[currentQuestion.id]}
          >
            {currentQuestionIndex === totalQuestions - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>

        {/* Question Navigation Dots */}
        <div className="flex justify-center gap-2">
          {questions.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-3 h-3 rounded-full ${
                index === currentQuestionIndex 
                  ? 'bg-blue-500' 
                  : selectedAnswers[questions.questions[index].id]
                    ? 'bg-green-500'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ConversationQuestionsPanel