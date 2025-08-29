import React, { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle,
  Lightbulb,
  Loader2,
  RefreshCw,
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
import { Progress } from '../ui/progress'
import { Textarea } from '../ui/textarea'

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

interface ContextualUsagePracticeProps {
  onComplete?: () => void
}

interface UsageExercise {
  word: UserVocabularyItem
  userSentence: string
  feedback?: string
  isCorrect?: boolean
  suggestedSentences: string[]
  hints: string[]
}

export const ContextualUsagePractice: React.FC<ContextualUsagePracticeProps> = ({ onComplete }) => {
  const [currentExercise, setCurrentExercise] = useState<UsageExercise | null>(null)
  const [vocabularyQueue, setVocabularyQueue] = useState<UserVocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userSentence, setUserSentence] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [exerciseComplete, setExerciseComplete] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  useEffect(() => {
    loadVocabularyForPractice()
  }, [])

  const loadVocabularyForPractice = async () => {
    setIsLoading(true)
    try {
      const vocabulary = await userVocabularyService.getUserVocabularyDeck({ limit: 10 })
      const shuffledVocab = vocabulary.sort(() => Math.random() - 0.5)
      setVocabularyQueue(shuffledVocab)
      if (shuffledVocab.length > 0) {
        setupExercise(shuffledVocab[0])
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
      userSentence: '',
      suggestedSentences: generateSuggestedSentences(word),
      hints: generateHints(word)
    })
    setUserSentence('')
    setShowFeedback(false)
    setShowHint(false)
    setExerciseComplete(false)
  }

  const generateSuggestedSentences = (word: UserVocabularyItem): string[] => {
    const examples = [
      `The ${word.text} was evident in his presentation style.`,
      `She demonstrated great ${word.text} during the challenging project.`,
      `Understanding ${word.text} is crucial for effective communication.`
    ]
    if (word.example) examples.unshift(word.example)
    return examples.slice(0, 3)
  }

  const generateHints = (word: UserVocabularyItem): string[] => {
    const hints = [
      `Try using "${word.text}" as a ${word.partOfSpeech || 'word'}.`,
      `Think about its meaning: "${word.definition}"`
    ]
    if (word.synonyms && word.synonyms.length > 0) {
      hints.push(`Similar words include: ${word.synonyms.slice(0, 2).join(', ')}.`)
    }
    return hints
  }

  const evaluateSentence = (sentence: string, word: UserVocabularyItem) => {
    const normalizedSentence = sentence.toLowerCase().trim()
    const normalizedWord = word.text.toLowerCase()
    if (!normalizedSentence.includes(normalizedWord))
      return {
        isCorrect: false,
        feedback: `Please make sure to include the word "${word.text}" in your sentence.`
      }
    if (normalizedSentence.split(' ').length < 5)
      return {
        isCorrect: false,
        feedback:
          'Your sentence is a bit short. Try to write a more complete thought (at least 5 words).'
      }
    if (!normalizedSentence.match(/[.!?]$/))
      return {
        isCorrect: false,
        feedback:
          "Don't forget to end your sentence with punctuation like a period (.) or question mark (?)."
      }
    return { isCorrect: true, feedback: `Great sentence! You\'ve used "${word.text}" effectively.` }
  }

  const handleSubmitSentence = () => {
    if (!currentExercise || !userSentence.trim()) return
    const evaluation = evaluateSentence(userSentence, currentExercise.word)
    setCurrentExercise(prev => ({ ...prev!, userSentence, ...evaluation }))
    setShowFeedback(true)
    setExerciseComplete(true)
    setScore(prev => ({
      correct: prev.correct + (evaluation.isCorrect ? 1 : 0),
      total: prev.total + 1
    }))
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

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-12">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Practice...</p>
        </div>
      </div>
    )
  }

  if (!currentExercise || vocabularyQueue.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <CardHeader>
          <Lightbulb className="mx-auto h-16 w-16 text-muted-foreground" />
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
            <h1 className="text-2xl font-bold">Contextual Usage Practice</h1>
            <p className="text-muted-foreground">Create sentences using your vocabulary words.</p>
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

      <Card className="border-l-4 border-primary/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-3xl font-bold">{currentExercise.word.text}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => speak(currentExercise.word.text)}>
                <Volume2 className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex gap-2">
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
          </div>
          <CardDescription className="pt-1 text-base">
            {currentExercise.word.definition}
          </CardDescription>
          {currentExercise.word.pronunciation && (
            <p className="font-mono text-primary">{currentExercise.word.pronunciation}</p>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Create a Sentence
          </CardTitle>
          <CardDescription>
            Write a sentence that uses "{currentExercise.word.text}" in the correct context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={userSentence}
            onChange={e => setUserSentence(e.target.value)}
            placeholder={`e.g., "Her ${currentExercise.word.text} was clear from her confident speech."`}
            className="min-h-[100px] text-base focus:ring-2 focus:ring-primary/50"
            disabled={exerciseComplete}
          />
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex gap-3">
              {!exerciseComplete && (
                <>
                  <Button onClick={handleSubmitSentence} disabled={!userSentence.trim()}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Check Sentence
                  </Button>
                  <Button variant="outline" onClick={() => setShowHint(!showHint)}>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    {showHint ? 'Hide' : 'Show'} Hint
                  </Button>
                </>
              )}
              {exerciseComplete && (
                <Button onClick={handleNextExercise}>
                  {currentIndex + 1 >= vocabularyQueue.length ? 'Complete Practice' : 'Next Word'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
            <Button variant="ghost" onClick={onComplete}>
              Exit Practice
            </Button>
          </div>
          {showHint && !exerciseComplete && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20">
              <CardContent className="space-y-2 p-4">
                <h4 className="flex items-center font-medium text-amber-800 dark:text-amber-200">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Hints
                </h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  {currentExercise.hints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {showFeedback && currentExercise.feedback && (
            <div
              className={cn(
                'flex items-start gap-3 rounded-lg border-l-4 p-4',
                currentExercise.isCorrect
                  ? 'border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-200'
                  : 'border-red-500 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200'
              )}
            >
              {currentExercise.isCorrect ? (
                <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold">
                  {currentExercise.isCorrect ? 'Excellent!' : 'Needs Improvement'}
                </h4>
                <p className="text-sm">{currentExercise.feedback}</p>
              </div>
            </div>
          )}
          {exerciseComplete && currentExercise.isCorrect && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="h-4 w-4" />
                  Example Sentences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentExercise.suggestedSentences.map((sentence, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <p className="flex-1 italic">"{sentence}"</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => speak(sentence)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {score.total > 0 && !showFeedback && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-1.5 font-medium text-green-600">
                <CheckCircle size={14} /> {score.correct} Correct
              </div>
              <div className="flex items-center gap-1.5 font-medium text-red-500">
                <XCircle size={14} /> {score.total - score.correct} Incorrect
              </div>
              <div className="font-medium text-blue-600">
                {Math.round((score.correct / score.total) * 100)}% Accuracy
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ContextualUsagePractice
