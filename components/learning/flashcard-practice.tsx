import React, { useCallback, useEffect, useState } from 'react'
import { CheckCircle, FlipHorizontal, Loader2, Volume2, XCircle } from 'lucide-react'
import {
  userVocabularyService,
  type UserVocabularyItem
} from '../../lib/services/user-vocabulary-service'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'

interface FlashcardPracticeProps {
  onComplete?: () => void
}

const FlashcardFront = ({ item, onShowAnswer, onSpeak }) => (
  <div className="flex h-full flex-col">
    <CardHeader className="flex-row items-center justify-between">
      <CardTitle>Term</CardTitle>
      <Button variant="ghost" size="icon" onClick={() => onSpeak(item.text)}>
        <Volume2 className="h-5 w-5" />
      </Button>
    </CardHeader>
    <CardContent className="flex flex-grow flex-col items-center justify-center p-6 text-center">
      <h2 className="text-4xl font-bold">{item.text}</h2>
      {item.pronunciation && (
        <p className="mt-2 font-mono text-lg text-muted-foreground">{item.pronunciation}</p>
      )}
    </CardContent>
    <div className="border-t p-4">
      <Button className="w-full" onClick={onShowAnswer}>
        <FlipHorizontal className="mr-2 h-4 w-4" /> Show Answer
      </Button>
    </div>
  </div>
)

const FlashcardBack = ({ item, onResponse, onSpeak }) => (
  <div className="flex h-full flex-col">
    <CardHeader className="flex-row items-center justify-between">
      <CardTitle>Definition</CardTitle>
      <Button variant="ghost" size="icon" onClick={() => onSpeak(item.text)}>
        <Volume2 className="h-5 w-5" />
      </Button>
    </CardHeader>
    <CardContent className="flex flex-grow flex-col justify-center space-y-4 p-6 text-center">
      <p className="text-xl">{item.definition}</p>
      {item.example && <p className="italic text-muted-foreground">e.g., "{item.example}"</p>}
      <div className="flex justify-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {item.itemType}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {item.difficulty}
        </Badge>
        {item.partOfSpeech && <Badge variant="outline">{item.partOfSpeech}</Badge>}
      </div>
    </CardContent>
    <div className="grid grid-cols-2 gap-4 border-t p-4">
      <Button variant="destructive" onClick={() => onResponse(false)}>
        <XCircle className="mr-2 h-4 w-4" /> Incorrect
      </Button>
      <Button
        variant="default"
        className="bg-green-600 hover:bg-green-700"
        onClick={() => onResponse(true)}
      >
        <CheckCircle className="mr-2 h-4 w-4" /> Correct
      </Button>
    </div>
  </div>
)

export const FlashcardPractice: React.FC<FlashcardPracticeProps> = ({ onComplete }) => {
  const [items, setItems] = useState<UserVocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const currentItem = items[currentIndex]

  useEffect(() => {
    const loadItems = async () => {
      setIsLoading(true)
      try {
        const reviewItems = await userVocabularyService.getItemsDueForReview()
        const itemsToPractice =
          reviewItems.length > 0
            ? reviewItems
            : await userVocabularyService.getUserVocabularyDeck({ limit: 10 })
        setItems(itemsToPractice.sort(() => Math.random() - 0.5))
      } catch (error) {
        console.error('Failed to load practice items:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadItems()
  }, [])

  const handleResponse = (correct: boolean) => {
    if (!isFlipped) return
    console.log(`User response for "${currentItem?.text}":`, correct ? 'Correct' : 'Incorrect')

    if (currentIndex + 1 >= items.length) {
      onComplete?.()
    } else {
      setIsFlipped(false)
      setCurrentIndex(currentIndex + 1)
    }
  }

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      speechSynthesis.speak(utterance)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-8">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Flashcards...</p>
        </div>
      </div>
    )
  }

  if (!currentItem) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <CardTitle className="mb-2">No Vocabulary to Practice</CardTitle>
        <CardContent>
          <p className="mb-4 text-muted-foreground">Add words to your deck to start practicing.</p>
          <Button onClick={onComplete}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = ((currentIndex + 1) / items.length) * 100

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Card {currentIndex + 1} of {items.length}
          </span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <Progress value={progressPercentage} />
      </div>

      <Card className="flex h-[450px] w-full flex-col transition-all duration-300">
        {isFlipped ? (
          <FlashcardBack item={currentItem} onResponse={handleResponse} onSpeak={speak} />
        ) : (
          <FlashcardFront
            item={currentItem}
            onShowAnswer={() => setIsFlipped(true)}
            onSpeak={speak}
          />
        )}
      </Card>

      <div className="mt-2 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleResponse(false)}
          className="text-muted-foreground"
        >
          Skip card
        </Button>
      </div>
    </div>
  )
}

export default FlashcardPractice
