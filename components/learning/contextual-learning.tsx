import React, { useEffect, useState } from 'react'
import { BookOpen, ExternalLink, Loader2, PlayCircle, Search } from 'lucide-react'
import {
  userVocabularyService,
  type UserVocabularyItem
} from '../../lib/services/user-vocabulary-service'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'

interface ContextualLearningProps {
  onNavigateToVideo?: (loopId: string) => void
}

export const ContextualLearning: React.FC<ContextualLearningProps> = ({ onNavigateToVideo }) => {
  const [vocabularyItems, setVocabularyItems] = useState<UserVocabularyItem[]>([])
  const [selectedWord, setSelectedWord] = useState<UserVocabularyItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadVocabulary = async () => {
      setIsLoading(true)
      try {
        const items = await userVocabularyService.getUserVocabularyDeck({ limit: 100 })
        setVocabularyItems(items)
        if (items.length > 0) {
          setSelectedWord(items[0])
        }
      } catch (error) {
        console.error('Failed to load vocabulary:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadVocabulary()
  }, [])

  const filteredVocabulary = vocabularyItems.filter(
    item =>
      item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-8">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Vocabulary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search your vocabulary..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 text-base"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="h-fit lg:col-span-1">
          <CardHeader>
            <CardTitle>Your Vocabulary ({filteredVocabulary.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredVocabulary.length > 0 ? (
              <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-2">
                {filteredVocabulary.map(item => (
                  <Button
                    key={item.id}
                    variant={selectedWord?.id === item.id ? 'secondary' : 'ghost'}
                    onClick={() => setSelectedWord(item)}
                    className="h-auto w-full justify-between p-3 text-left leading-normal"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.text}</p>
                      <p className="truncate text-sm text-muted-foreground">{item.definition}</p>
                    </div>
                    <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.itemType}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.difficulty}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-4 h-12 w-12" />
                <p className="font-semibold">No vocabulary found</p>
                <p className="text-sm">Try adjusting your search terms.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {selectedWord ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-3xl font-bold">{selectedWord.text}</CardTitle>
                      {selectedWord.pronunciation && (
                        <p className="mt-1 font-mono text-primary">{selectedWord.pronunciation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedWord.partOfSpeech && (
                        <Badge variant="secondary">{selectedWord.partOfSpeech}</Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {selectedWord.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="pt-2 text-base">
                    {selectedWord.definition}
                  </CardDescription>
                  {selectedWord.example && (
                    <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm italic">
                      &ldquo;{selectedWord.example}&rdquo;
                    </div>
                  )}
                </CardHeader>
              </Card>

              {selectedWord.sourceLoopId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Original Context</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between rounded-b-lg bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-semibold">Found in a video</p>
                        <p className="text-sm text-muted-foreground">
                          This word appeared {selectedWord.frequency} time(s).
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => onNavigateToVideo?.(selectedWord.sourceLoopId!)}>
                      <ExternalLink className="mr-2 h-4 w-4" /> View in Video
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Learning Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="outline" className="capitalize">
                      {selectedWord.learningStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">Times Practiced</p>
                    <p className="font-semibold">{selectedWord.timesPracticed}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">Success Rate</p>
                    <p className="font-semibold">
                      {selectedWord.timesPracticed > 0
                        ? Math.round(
                            (selectedWord.timesCorrect / selectedWord.timesPracticed) * 100
                          )
                        : 0}
                      %
                    </p>
                  </div>
                  {selectedWord.nextReviewDate && selectedWord.learningStatus !== 'new' && (
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-muted-foreground">Next Review</p>
                      <p className="font-semibold">
                        {new Date(selectedWord.nextReviewDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center">
              <CardContent className="text-muted-foreground">
                <BookOpen className="mx-auto mb-4 h-16 w-16" />
                <h3 className="text-lg font-semibold text-foreground">Select a Word</h3>
                <p>Choose a vocabulary word from the list to see its details.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContextualLearning
