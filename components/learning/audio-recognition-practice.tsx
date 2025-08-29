import React, { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle,
  Eye,
  Headphones,
  Loader2,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  XCircle
} from 'lucide-react'
import {
  userVocabularyService,
  type UserVocabularyItem
} from '../../lib/services/user-vocabulary-service'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'

// Color System Helpers
const getDifficultyBadgeStyle = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
  switch (difficulty) {
    case 'beginner':
      return 'border-green-300 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700'
    case 'intermediate':
      return 'border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700'
    case 'advanced':
      return 'border-purple-300 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700'
    default:
      return 'border-border bg-secondary text-secondary-foreground'
  }
}

interface AudioRecognitionPracticeProps {
  onComplete?: () => void
}

interface AudioExercise {
  word: UserVocabularyItem
  options: string[]
  selectedAnswer?: string
  isCorrect?: boolean
  showAnswer: boolean
}

export const AudioRecognitionPractice: React.FC<AudioRecognitionPracticeProps> = ({
  onComplete
}) => {
  const [currentExercise, setCurrentExercise] = useState<AudioExercise | null>(null)
  const [vocabularyQueue, setVocabularyQueue] = useState<UserVocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [exerciseComplete, setExerciseComplete] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showDefinition, setShowDefinition] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)

  useEffect(() => {
    setIsSpeechSupported('speechSynthesis' in window)
    loadVocabularyForPractice()
  }, [])

  const loadVocabularyForPractice = async () => {
    setIsLoading(true)
    try {
      const vocabulary = await userVocabularyService.getUserVocabularyDeck({ limit: 10 })
      const shuffledVocab = vocabulary.sort(() => Math.random() - 0.5)
      setVocabularyQueue(shuffledVocab)
      if (shuffledVocab.length > 0) {
        setupExercise(shuffledVocab[0], shuffledVocab)
      }
    } catch (error) {
      console.error('Failed to load vocabulary for practice:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateDistractors = (
    correctWord: UserVocabularyItem,
    allWords: UserVocabularyItem[]
  ): string[] => {
    const distractors = new Set<string>()
    const allButCorrect = allWords.filter(w => w.id !== correctWord.id)
    const similarWords = allButCorrect.filter(
      w => w.difficulty === correctWord.difficulty || w.itemType === correctWord.itemType
    )
    similarWords.forEach(w => distractors.add(w.text))
    if (distractors.size >= 3) {
      return Array.from(distractors)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
    }
    allButCorrect.forEach(w => distractors.add(w.text))
    const finalDistractors = Array.from(distractors).sort(() => Math.random() - 0.5)
    return finalDistractors.slice(0, 3)
  }

  const setupExercise = (word: UserVocabularyItem, allWords: UserVocabularyItem[]) => {
    const distractors = generateDistractors(word, allWords)
    const options = [word.text, ...distractors].sort(() => Math.random() - 0.5)
    setCurrentExercise({ word, options, showAnswer: false })
    setExerciseComplete(false)
    setShowDefinition(false)
    setTimeout(() => speakWord(word.text), 500)
  }

  const speakWord = useCallback(
    (text: string, speed = playbackSpeed) => {
      if (!isSpeechSupported) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = speed
      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = () => setIsPlaying(false)
      window.speechSynthesis.speak(utterance)
    },
    [isSpeechSupported, playbackSpeed]
  )

  const handleAnswerSelect = (selectedAnswer: string) => {
    if (!currentExercise || exerciseComplete) return
    const isCorrect = selectedAnswer === currentExercise.word.text
    setCurrentExercise(prev => ({ ...prev!, selectedAnswer, isCorrect, showAnswer: true }))
    setExerciseComplete(true)
    setScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }))
    setTimeout(() => speakWord(currentExercise.word.text, 0.8), 500)
  }

  const handleNextExercise = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= vocabularyQueue.length) {
      onComplete?.()
      return
    }
    setCurrentIndex(nextIndex)
    setupExercise(vocabularyQueue[nextIndex], vocabularyQueue)
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-12">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Audio Practice...</p>
        </div>
      </div>
    )
  }

  if (!isSpeechSupported) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <CardHeader>
          <VolumeX className="mx-auto h-16 w-16 text-destructive" />
          <CardTitle>Audio Not Supported</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            Your browser does not support the required text-to-speech feature.
          </p>
          <Button onClick={onComplete}>Go Back</Button>
        </CardContent>
      </Card>
    )
  }

  if (!currentExercise || vocabularyQueue.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <CardHeader>
          <Headphones className="mx-auto h-16 w-16 text-muted-foreground" />
          <CardTitle>No Vocabulary Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            Add vocabulary to your deck to start practicing!
          </p>
          <Button onClick={onComplete}>Go Back</Button>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = ((currentIndex + 1) / vocabularyQueue.length) * 100

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Audio Recognition Practice</h1>
            <p className="text-muted-foreground">
              Listen carefully and identify the vocabulary word.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold text-primary">
              {currentIndex + 1} / {vocabularyQueue.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Score: {score.correct}/{score.total}
            </div>
          </div>
        </div>
        <Progress value={progressPercentage} />
      </header>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Headphones className="h-6 w-6 text-primary" />
              <span>Listen to the Word</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {currentExercise.word.itemType}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'capitalize',
                  getDifficultyBadgeStyle(currentExercise.word.difficulty)
                )}
              >
                {currentExercise.word.difficulty}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Click the play button, then select the correct word below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              size="lg"
              onClick={() => speakWord(currentExercise.word.text)}
              disabled={isPlaying}
              className="flex items-center gap-3 rounded-full px-8 py-6 text-lg shadow-lg"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-6 w-6" />
                  <span>Playing...</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-6 w-6" />
                  <span>Play Audio</span>
                </>
              )}
            </Button>
            {isPlaying && (
              <Button variant="ghost" size="icon" onClick={() => window.speechSynthesis.cancel()}>
                <VolumeX className="h-5 w-5" />
              </Button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Speed:</span>
            {[0.7, 1.0, 1.2].map(speed => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPlaybackSpeed(speed)}
                disabled={isPlaying}
                className="w-16"
              >
                {speed}x
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => speakWord(currentExercise.word.text)}
              disabled={isPlaying}
              title="Repeat"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select the word you heard:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {currentExercise.options.map((option, index) => {
              const isSelected = currentExercise.selectedAnswer === option
              const isCorrect = currentExercise.showAnswer && option === currentExercise.word.text
              const isWrong = currentExercise.showAnswer && isSelected && !isCorrect
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="lg"
                  onClick={() => handleAnswerSelect(option)}
                  disabled={exerciseComplete}
                  className={cn(
                    'h-auto justify-start p-4 text-left text-base',
                    exerciseComplete &&
                      isCorrect &&
                      'bg-success text-success-foreground hover:bg-success/90',
                    exerciseComplete &&
                      isWrong &&
                      'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                    exerciseComplete && !isSelected && 'opacity-50'
                  )}
                >
                  <span className="mr-3 rounded-md bg-muted px-2 py-1 font-mono text-sm">
                    {index + 1}
                  </span>
                  <span>{option}</span>
                  {exerciseComplete && isCorrect && <CheckCircle className="ml-auto h-5 w-5" />}
                  {exerciseComplete && isWrong && <XCircle className="ml-auto h-5 w-5" />}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {currentExercise.showAnswer && (
        <Card
          className={cn(
            'border-l-4',
            currentExercise.isCorrect
              ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20'
              : 'border-red-500 bg-red-50/50 dark:bg-red-900/20'
          )}
        >
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentExercise.isCorrect ? (
                  <CheckCircle className="h-7 w-7 text-green-600" />
                ) : (
                  <XCircle className="h-7 w-7 text-red-600" />
                )}
                <div>
                  <h3
                    className={cn(
                      'text-xl font-semibold',
                      currentExercise.isCorrect
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    )}
                  >
                    {currentExercise.isCorrect ? 'Correct!' : 'Incorrect'}
                  </h3>
                  <p
                    className={cn(
                      currentExercise.isCorrect
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    )}
                  >
                    The correct answer is: <strong>{currentExercise.word.text}</strong>
                  </p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setShowDefinition(!showDefinition)} size="sm">
                <Eye className="mr-2 h-4 w-4" />
                {showDefinition ? 'Hide' : 'Show'} Meaning
              </Button>
            </div>
            {showDefinition && (
              <div className="space-y-3 rounded-lg border bg-background p-4">
                <div>
                  <h4 className="mb-1 font-medium">Definition:</h4>
                  <p className="text-muted-foreground">{currentExercise.word.definition}</p>
                </div>
                {currentExercise.word.pronunciation && (
                  <div>
                    <h4 className="mb-1 font-medium">Pronunciation:</h4>
                    <p className="font-mono text-primary">{currentExercise.word.pronunciation}</p>
                  </div>
                )}
                {currentExercise.word.example && (
                  <div>
                    <h4 className="mb-1 font-medium">Example:</h4>
                    <p className="italic text-muted-foreground">"{currentExercise.word.example}"</p>
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => speakWord(currentExercise.word.text, 0.8)}>
                <Volume2 className="mr-2 h-4 w-4" />
                Play Again
              </Button>
              <Button onClick={handleNextExercise}>
                {currentIndex + 1 >= vocabularyQueue.length ? 'Complete Practice' : 'Next Word'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="pt-4 text-center">
        <Button variant="ghost" onClick={onComplete}>
          Exit Practice
        </Button>
      </div>
    </div>
  )
}

export default AudioRecognitionPractice
