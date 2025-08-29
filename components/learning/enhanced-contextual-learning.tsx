import React, { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Brain,
  Copy,
  ExternalLink,
  Lightbulb,
  Loader2,
  PlayCircle,
  Search,
  Sparkles,
  Target,
  Volume2
} from 'lucide-react'
import {
  contextualLearningAIService,
  type CollocationPattern,
  type LoopContext,
  type UsageExample
} from '../../lib/services/contextual-learning-ai-service'
import {
  userVocabularyService,
  type UserVocabularyItem
} from '../../lib/services/user-vocabulary-service'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

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

interface EnhancedContextualLearningProps {
  onNavigateToVideo?: (loopId: string) => void
}

export const EnhancedContextualLearning: React.FC<EnhancedContextualLearningProps> = ({
  onNavigateToVideo
}) => {
  const [vocabularyItems, setVocabularyItems] = useState<UserVocabularyItem[]>([])
  const [selectedWord, setSelectedWord] = useState<UserVocabularyItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const [aiContent, setAiContent] = useState<{
    examples: UsageExample[]
    collocations: CollocationPattern[]
    contexts: LoopContext[]
  }>({ examples: [], collocations: [], contexts: [] })
  const [generationState, setGenerationState] = useState({
    examples: false,
    collocations: false,
    contexts: false
  })

  useEffect(() => {
    const loadVocabulary = async () => {
      setIsLoading(true)
      try {
        const items = await userVocabularyService.getUserVocabularyDeck({ limit: 100 })
        setVocabularyItems(items)
        if (items.length > 0) {
          handleWordSelect(items[0])
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

  const handleWordSelect = (item: UserVocabularyItem) => {
    setSelectedWord(item)
    setActiveTab('overview')
    setAiContent({ examples: [], collocations: [], contexts: [] })
  }

  const generateContent = useCallback(
    async (type: 'examples' | 'collocations' | 'contexts') => {
      if (!selectedWord) return
      setGenerationState(prev => ({ ...prev, [type]: true }))
      try {
        let result
        if (type === 'examples') {
          result = await contextualLearningAIService.generateUsageExamples(selectedWord, 6)
          setAiContent(prev => ({ ...prev, examples: result }))
        } else if (type === 'collocations') {
          result = await contextualLearningAIService.generateCollocations(selectedWord, 8)
          setAiContent(prev => ({ ...prev, collocations: result }))
        } else if (type === 'contexts') {
          result = await contextualLearningAIService.findSimilarContexts(selectedWord, 5)
          setAiContent(prev => ({ ...prev, contexts: result }))
        }
        setActiveTab(type)
      } catch (error) {
        console.error(`Failed to generate ${type}:`, error)
      } finally {
        setGenerationState(prev => ({ ...prev, [type]: false }))
      }
    },
    [selectedWord]
  )

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-8">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Contextual Learning Environment...</p>
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
                    onClick={() => handleWordSelect(item)}
                    className="h-auto w-full justify-between p-3 text-left leading-normal"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.text}</p>
                      <p className="truncate text-sm text-muted-foreground">{item.definition}</p>
                    </div>
                    <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs capitalize',
                          getDifficultyBadgeStyle(item.difficulty)
                        )}
                      >
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
        <div className="lg:col-span-2">
          {selectedWord ? (
            <div className="space-y-6">
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
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => speakText(selectedWord.text)}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      {selectedWord.partOfSpeech && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'capitalize',
                            getPartOfSpeechBadgeStyle(selectedWord.partOfSpeech)
                          )}
                        >
                          {selectedWord.partOfSpeech}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          'capitalize',
                          getDifficultyBadgeStyle(selectedWord.difficulty)
                        )}
                      >
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-3">
                  <TabsTrigger value="overview" className="py-2">
                    <Target className="mr-2 h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="examples" className="py-2">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Examples
                  </TabsTrigger>
                  <TabsTrigger value="collocations" className="py-2">
                    <Brain className="mr-2 h-4 w-4" />
                    Collocations
                  </TabsTrigger>
                  {/* <TabsTrigger value="contexts" className="py-2">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Contexts
                  </TabsTrigger> */}
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FeatureCard
                      icon={Sparkles}
                      title="Usage Examples"
                      description="See how the word is used in different scenarios."
                      onClick={() => generateContent('examples')}
                      isLoading={generationState.examples}
                    />
                    <FeatureCard
                      icon={Brain}
                      title="Collocations"
                      description="Learn common word pairings and phrases."
                      onClick={() => generateContent('collocations')}
                      isLoading={generationState.collocations}
                    />
                    <FeatureCard
                      icon={PlayCircle}
                      title="Find in Videos"
                      description="Discover this word in your saved video loops."
                      onClick={() => generateContent('contexts')}
                      isLoading={generationState.contexts}
                    />
                    {selectedWord.sourceLoopId && (
                      <FeatureCard
                        icon={ExternalLink}
                        title="Original Context"
                        description="Go back to where you first found this word."
                        onClick={() => onNavigateToVideo?.(selectedWord.sourceLoopId!)}
                      />
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="examples" className="mt-4">
                  <GeneratedContentContainer
                    title="Usage Examples"
                    onGenerate={() => generateContent('examples')}
                    isLoading={generationState.examples}
                    hasContent={aiContent.examples.length > 0}
                  >
                    {aiContent.examples.map(ex => (
                      <ContentItem
                        key={ex.id}
                        text={ex.sentence}
                        badges={[ex.context, ex.domain]}
                        onSpeak={() => speakText(ex.sentence)}
                        onCopy={() => navigator.clipboard.writeText(ex.sentence)}
                      />
                    ))}
                  </GeneratedContentContainer>
                </TabsContent>
                <TabsContent value="collocations" className="mt-4">
                  <GeneratedContentContainer
                    title="Word Combinations (Collocations)"
                    onGenerate={() => generateContent('collocations')}
                    isLoading={generationState.collocations}
                    hasContent={aiContent.collocations.length > 0}
                  >
                    {aiContent.collocations.map(col => (
                      <Card key={col.id} className="border-l-4 border-primary/20 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="font-semibold text-primary">{col.pattern}</h4>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="capitalize">
                              {col.type.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary" className="capitalize">
                              {col.frequency}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 space-y-2">
                          {col.examples.map((ex, i) => (
                            <ContentItem
                              key={i}
                              text={`"${ex}"`}
                              onSpeak={() => speakText(ex)}
                              onCopy={() => navigator.clipboard.writeText(ex)}
                              isExample
                            />
                          ))}
                        </div>
                      </Card>
                    ))}
                  </GeneratedContentContainer>
                </TabsContent>
                {/* <TabsContent value="contexts" className="mt-4">
                  <GeneratedContentContainer
                    title="Video Contexts"
                    onGenerate={() => generateContent('contexts')}
                    isLoading={generationState.contexts}
                    hasContent={aiContent.contexts.length > 0}
                  >
                    {aiContent.contexts.map(ctx => (
                      <Card
                        key={ctx.loopId}
                        className="flex items-center justify-between border-l-4 border-primary/20 p-4"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{ctx.videoTitle}</p>
                          <p className="my-1 text-sm italic text-muted-foreground">
                            ...{ctx.sentence}...
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Timestamp: {Math.floor(ctx.timestamp / 60)}:
                            {(ctx.timestamp % 60).toString().padStart(2, '0')}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => onNavigateToVideo?.(ctx.loopId)}>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Watch
                        </Button>
                      </Card>
                    ))}
                  </GeneratedContentContainer>
                </TabsContent> */}
              </Tabs>
            </div>
          ) : (
            <Card className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center">
              <CardContent className="text-muted-foreground">
                <BookOpen className="mx-auto mb-4 h-16 w-16" />
                <h3 className="text-lg font-semibold text-foreground">Select a Vocabulary Item</h3>
                <p>Choose a word from the list to explore its contextual details.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

const FeatureCard = ({ icon: Icon, title, description, onClick, isLoading = false }) => (
  <Card
    className="group flex cursor-pointer flex-col p-4 transition-colors hover:bg-muted/80"
    onClick={onClick}
  >
    <div className="flex-grow space-y-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5 text-primary" />
        )}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="mt-4">
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </div>
  </Card>
)

const GeneratedContentContainer = ({ title, onGenerate, isLoading, hasContent, children }) => {
  if (!hasContent) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 text-center">
        <CardContent>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">{title}</h3>
          <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
            Unlock deeper understanding with AI-powered insights.
          </p>
          <Button onClick={onGenerate} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Generating...' : `Generate ${title}`}
          </Button>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">{title}</h3>
        <Button onClick={onGenerate} disabled={isLoading} variant="outline" size="sm">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate New
        </Button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

const ContentItem = ({ text, onSpeak, onCopy, isExample = false }) => (
  <div
    className={cn(
      'flex items-center justify-between rounded-md p-3',
      isExample ? 'bg-transparent' : 'bg-muted/50'
    )}
  >
    <p className={cn('flex-1', isExample ? 'text-muted-foreground' : 'text-foreground')}>{text}</p>
    <div className="ml-2 flex items-center gap-1">
      <Button size="icon" variant="ghost" onClick={onSpeak}>
        <Volume2 className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={onCopy}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  </div>
)

export default EnhancedContextualLearning
