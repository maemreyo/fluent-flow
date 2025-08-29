import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Keyboard,
  Loader2,
  Type,
  Volume2,
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
import { Input } from '../ui/input'
import { Progress } from '../ui/progress'

// Color System Helper
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

const getPartOfSpeechBadgeStyle = (partOfSpeech?: string) => {
  if (!partOfSpeech) return 'border-border bg-secondary text-secondary-foreground'
  const pos = partOfSpeech.toLowerCase()
  if (pos.includes('noun'))
    return 'border-sky-300 bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 dark:border-sky-700'
  if (pos.includes('verb'))
    return 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700'
  if (pos.includes('adjective'))
    return 'border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700'
  if (pos.includes('adverb'))
    return 'border-rose-300 bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 dark:border-rose-700'
  return 'border-border bg-secondary text-secondary-foreground'
}

interface SpellingPracticeProps {
  onComplete?: () => void
}

interface SpellingExercise {
  word: UserVocabularyItem
  userInput: string
  isCorrect?: boolean
  showAnswer: boolean
  mistakes: number[]
  hint: string
}

export const SpellingPractice: React.FC<SpellingPracticeProps> = ({ onComplete }) => {
  const [currentExercise, setCurrentExercise] = useState<SpellingExercise | null>(null)
  const [vocabularyQueue, setVocabularyQueue] = useState<UserVocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [exerciseComplete, setExerciseComplete] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showDefinition, setShowDefinition] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 3
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsSpeechSupported('speechSynthesis' in window)
    loadVocabularyForPractice()
  }, [])

  const loadVocabularyForPractice = async () => {
    setIsLoading(true)
    try {
      const vocabulary = (await userVocabularyService.getUserVocabularyDeck({ limit: 10 })).sort(
        () => Math.random() - 0.5
      )
      setVocabularyQueue(vocabulary)
      if (vocabulary.length > 0) {
        setupExercise(vocabulary[0])
      }
    } catch (error) {
      console.error('Failed to load vocabulary for practice:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setupExercise = (word: UserVocabularyItem) => {
    setCurrentExercise({
      word,
      userInput: '',
      showAnswer: false,
      mistakes: [],
      hint: `${word.text.length} letters, starts with "${word.text.charAt(0).toUpperCase()}"`
    })
    setExerciseComplete(false)
    setShowDefinition(false)
    setShowHint(false)
    setAttempts(0)
    setTimeout(() => speakWord(word.text), 500)
    inputRef.current?.focus()
  }

  const speakWord = useCallback(
    (text: string, speed = 0.8) => {
      if (!isSpeechSupported) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = speed
      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = () => setIsPlaying(false)
      window.speechSynthesis.speak(utterance)
    },
    [isSpeechSupported]
  )

  const checkSpelling = (input: string, correctWord: string) => {
    const normalizedInput = input.trim().toLowerCase()
    const normalizedCorrect = correctWord.toLowerCase()
    if (normalizedInput === normalizedCorrect) return { isCorrect: true, mistakes: [] }
    const mistakes: number[] = []
    for (let i = 0; i < normalizedCorrect.length; i++) {
      if (normalizedInput[i] !== normalizedCorrect[i]) mistakes.push(i)
    }
    return { isCorrect: false, mistakes }
  }

  const handleSubmitSpelling = () => {
    if (!currentExercise || !currentExercise.userInput.trim() || exerciseComplete) return
    const { isCorrect, mistakes } = checkSpelling(
      currentExercise.userInput,
      currentExercise.word.text
    )
    const newAttempts = attempts + 1
    setCurrentExercise(prev => ({
      ...prev!,
      isCorrect,
      mistakes,
      showAnswer: isCorrect || newAttempts >= maxAttempts
    }))
    setAttempts(newAttempts)
    if (isCorrect || newAttempts >= maxAttempts) {
      setExerciseComplete(true)
      setScore(prev => ({
        ...prev,
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1
      }))
      setTimeout(() => speakWord(currentExercise.word.text, 0.7), 500)
    } else {
      setShowHint(true)
    }
  }

  const handleNextExercise = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= vocabularyQueue.length) {
      onComplete?.()
      return
    }
    setCurrentIndex(nextIndex)
    setupExercise(vocabularyQueue[nextIndex])
  }

  const renderFeedbackText = () => {
    if (!currentExercise || !currentExercise.showAnswer) return null
    if (currentExercise.isCorrect)
      return (
        <p className="text-lg font-semibold text-green-600 dark:text-green-400">
          Perfect spelling!
        </p>
      )
    const correctWord = currentExercise.word.text
    const userInput = currentExercise.userInput
    return (
      <p className="rounded-md bg-muted p-2 font-mono text-lg">
        {correctWord.split('').map((char, index) => (
          <span
            key={index}
            className={cn(
              userInput[index] === char
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500 underline dark:text-red-400',
              'font-bold'
            )}
          >
            {char}
          </span>
        ))}
      </p>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-12">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Spelling Practice...</p>
        </div>
      </div>
    )
  }

  if (!currentExercise || vocabularyQueue.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <CardHeader>
          <Type className="mx-auto h-16 w-16 text-muted-foreground" />
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
            <h1 className="text-2xl font-bold">Spelling Practice</h1>
            <p className="text-muted-foreground">Listen and type the correct spelling.</p>
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

      <Card className="bg-muted/40 text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-3">
            <Volume2 className="h-6 w-6 text-primary" />
            Listen and Spell
          </CardTitle>
          <CardDescription>
            Listen to the pronunciation, then type the correct spelling below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center gap-4 pb-6">
          <Button
            size="lg"
            onClick={() => speakWord(currentExercise.word.text)}
            disabled={isPlaying}
            className="rounded-full px-8 py-6 shadow-lg"
          >
            <Volume2 className="mr-2 h-6 w-6" />
            {isPlaying ? 'Playing...' : 'Play Audio'}
          </Button>
          <Button
            variant="outline"
            onClick={() => speakWord(currentExercise.word.text, 0.5)}
            disabled={isPlaying}
          >
            Play Slowly
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Type the word:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            ref={inputRef}
            type="text"
            value={currentExercise.userInput}
            onChange={e => setCurrentExercise(p => ({ ...p!, userInput: e.target.value }))}
            onKeyPress={e => e.key === 'Enter' && !exerciseComplete && handleSubmitSpelling()}
            placeholder="Type the spelling here..."
            disabled={exerciseComplete}
            className={cn(
              'h-16 text-center font-mono text-2xl tracking-widest',
              exerciseComplete &&
                (currentExercise.isCorrect
                  ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20'
                  : 'border-red-500 bg-red-50/50 dark:bg-red-900/20')
            )}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!exerciseComplete && (
                <Button onClick={handleSubmitSpelling} disabled={!currentExercise.userInput.trim()}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Check Spelling
                </Button>
              )}
              {exerciseComplete && (
                <Button onClick={handleNextExercise}>
                  {currentIndex + 1 >= vocabularyQueue.length ? 'Complete Practice' : 'Next Word'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              <div className="text-sm text-muted-foreground">
                Attempts left: {maxAttempts - attempts}
              </div>
            </div>
            <Button variant="ghost" onClick={onComplete}>
              Exit Practice
            </Button>
          </div>
        </CardContent>
      </Card>

      {showHint && !exerciseComplete && (
        <div className="rounded-md border border-amber-200 bg-amber-100 p-3 dark:border-amber-800/50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3 text-sm text-amber-800 dark:text-amber-200">
            <p>
              <span className="font-semibold">Hint:</span> {currentExercise.hint}
            </p>
          </div>
        </div>
      )}

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
                  {currentExercise.isCorrect ? 'Perfect!' : 'Incorrect'}
                </h3>
                <div className="text-muted-foreground">Correct spelling:</div>
                {renderFeedbackText()}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setShowDefinition(!showDefinition)}>
                {showDefinition ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {showDefinition ? 'Hide' : 'Show'} Meaning
              </Button>
              <Button onClick={handleNextExercise}>
                {currentIndex + 1 >= vocabularyQueue.length ? 'Complete Practice' : 'Next Word'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {showDefinition && (
              <div className="mt-4 space-y-3 rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize',
                      getDifficultyBadgeStyle(currentExercise.word.difficulty)
                    )}
                  >
                    {currentExercise.word.difficulty}
                  </Badge>
                  {currentExercise.word.partOfSpeech && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'capitalize',
                        getPartOfSpeechBadgeStyle(currentExercise.word.partOfSpeech)
                      )}
                    >
                      {currentExercise.word.partOfSpeech}
                    </Badge>
                  )}
                </div>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SpellingPractice
