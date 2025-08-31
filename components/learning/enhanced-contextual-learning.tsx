import React, { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  Brain,
  Copy,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  Volume2,
  Star
} from 'lucide-react'
import {
  type CollocationPattern,
  type UsageExample
} from '../../lib/services/contextual-learning-ai-service'
import {
  type UserVocabularyItem
} from '../../lib/services/user-vocabulary-service'
import { useVocabularyDeck } from '../../lib/hooks/use-vocabulary-queries'
import {
  useContextualData,
  useGenerateExamples,
  useGenerateCollocations,
  useGenerateContexts,
  useExamples,
  useCollocations,
  useContexts
} from '../../lib/hooks/use-contextual-learning-queries'
import { queryKeys } from '../../lib/services/query-client'
import { cn } from '../../lib/utils'
import { wordExplorerBridgeService } from '../../lib/services/word-explorer-bridge-service'

interface EnhancedContextualLearningProps {
  onNavigateToVideo?: (loopId: string) => void
}

export const EnhancedContextualLearning: React.FC<EnhancedContextualLearningProps> = () => {
  const [selectedWord, setSelectedWord] = useState<UserVocabularyItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('examples') // Changed default to 'examples'
  const [recentlyAddedWords, setRecentlyAddedWords] = useState<{ word: string; addedAt: Date }[]>([])
  
  // React Query client
  const queryClient = useQueryClient()

  // React Query hooks
  const { data: vocabularyItems = [], isLoading } = useVocabularyDeck(100)
  const { data: contextualData } = useContextualData(selectedWord)
  const { data: examples = [] } = useExamples(selectedWord)
  const { data: collocations = [] } = useCollocations(selectedWord)
  const { data: contexts = [] } = useContexts(selectedWord)
  
  // Mutation hooks for generating content
  const generateExamplesMutation = useGenerateExamples()
  const generateCollocationsMutation = useGenerateCollocations()
  const generateContextsMutation = useGenerateContexts()

  // Auto-select first word when vocabulary loads
  useEffect(() => {
    if (vocabularyItems.length > 0 && !selectedWord) {
      handleWordSelect(vocabularyItems[0])
    }
  }, [vocabularyItems, selectedWord])

  // Load recently added words from quiz pages
  useEffect(() => {
    const loadRecentlyAddedWords = async () => {
      try {
        const recentWords = await wordExplorerBridgeService.getRecentlyAddedWords()
        setRecentlyAddedWords(recentWords)
      } catch (error) {
        console.error('Failed to load recently added words:', error)
      }
    }

    loadRecentlyAddedWords()
    
    // Refresh every 30 seconds to catch new words
    const interval = setInterval(loadRecentlyAddedWords, 30000)
    return () => clearInterval(interval)
  }, [])

  const filteredVocabulary = vocabularyItems.filter(
    item =>
      item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const generateContent = useCallback(
    (type: 'examples' | 'collocations' | 'contexts') => {
      if (!selectedWord) return
      
      if (type === 'examples') {
        generateExamplesMutation.mutate({ vocabularyItem: selectedWord, maxExamples: 6 })
      } else if (type === 'collocations') {
        generateCollocationsMutation.mutate({ vocabularyItem: selectedWord, maxCollocations: 8 })
      } else if (type === 'contexts') {
        generateContextsMutation.mutate({ vocabularyItem: selectedWord, maxContexts: 5 })
      }
      setActiveTab(type)
    },
    [selectedWord, generateExamplesMutation, generateCollocationsMutation, generateContextsMutation]
  )
  
  // Handle contextual data loading and populate cache
  useEffect(() => {
    if (contextualData && selectedWord && queryClient) {
      if (contextualData.hasEnhancedData) {
        // Set examples data
        if (contextualData.examples.length > 0) {
          queryClient.setQueryData(
            queryKeys.contextualLearning.examples(selectedWord.id, selectedWord.text),
            contextualData.examples
          )
        }
        
        // Set collocations data
        if (contextualData.collocations.length > 0) {
          queryClient.setQueryData(
            queryKeys.contextualLearning.collocations(selectedWord.id, selectedWord.text),
            contextualData.collocations
          )
        }
        console.log('Loaded cached contextual data from database for:', selectedWord.text)
      } else {
        console.log('No enhanced data available for:', selectedWord.text, '- generating examples')
        generateContent('examples')
      }
    }
  }, [contextualData, selectedWord, queryClient, generateContent])

  const handleWordSelect = (item: UserVocabularyItem) => {
    setSelectedWord(item)
    setActiveTab('examples') // Always start with examples tab
    
    console.log('Selected word:', item.text)
  }

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
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-violet-500" />
          <p className="text-gray-600">Loading your vocabulary universe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 min-h-screen bg-gradient-to-br from-violet-50 via-sky-50 to-emerald-50">
      {/* Modern Search Bar */}
      <div className="relative mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search your vocabulary... ✨"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-lg bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all duration-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Vocabulary List - Brighter Design */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-emerald-500/10">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent">
                Your Vocabulary ({filteredVocabulary.length}) 📚
              </h2>
            </div>
            <div className="p-4">
              {filteredVocabulary.length > 0 ? (
                <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-2">
                  {filteredVocabulary.map(item => {
                    const isRecentlyAdded = recentlyAddedWords.some(
                      recent => recent.word.toLowerCase() === item.text.toLowerCase()
                    )
                    
                    const handleWordClick = async () => {
                      if (isRecentlyAdded) {
                        // Mark as seen when clicked
                        await wordExplorerBridgeService.markWordAsSeen(item.text)
                        setRecentlyAddedWords(prev => 
                          prev.filter(w => w.word.toLowerCase() !== item.text.toLowerCase())
                        )
                      }
                      handleWordSelect(item)
                    }
                    
                    return (
                      <div
                        key={item.id}
                        onClick={handleWordClick}
                        className={cn(
                          "cursor-pointer rounded-2xl p-4 transition-all duration-300 border relative",
                          selectedWord?.id === item.id 
                            ? "bg-gradient-to-r from-violet-100 via-blue-100 to-emerald-100 border-violet-200 shadow-md scale-105" 
                            : isRecentlyAdded
                            ? "bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 border-yellow-300 shadow-lg animate-pulse"
                            : "bg-white/50 hover:bg-white/80 border-transparent hover:border-white/40 hover:shadow-lg"
                        )}
                      >
                        {/* New Word Badge */}
                        {isRecentlyAdded && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            New!
                          </div>
                        )}
                        
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "truncate font-semibold",
                            isRecentlyAdded ? "text-orange-900" : "text-gray-900"
                          )}>
                            {item.text}
                          </p>
                          <p className={cn(
                            "truncate text-sm mt-1",
                            isRecentlyAdded ? "text-orange-700" : "text-gray-600"
                          )}>
                            {item.definition}
                          </p>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded-lg font-medium',
                              item.difficulty === 'beginner' && "bg-green-100 text-green-700",
                              item.difficulty === 'intermediate' && "bg-blue-100 text-blue-700", 
                              item.difficulty === 'advanced' && "bg-purple-100 text-purple-700"
                            )}
                          >
                            {item.difficulty}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-gray-600 font-medium">No vocabulary items found</p>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your search terms</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Word Details - Brighter Design */}
        <div className="lg:col-span-2">
          {selectedWord ? (
            <div className="space-y-6">
              {/* Word Header Card */}
              <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
                <div className="p-8 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-emerald-500/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent">
                        {selectedWord.text}
                      </h1>
                      {selectedWord.pronunciation && (
                        <p className="mt-2 font-mono text-violet-600 text-lg">{selectedWord.pronunciation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => speakText(selectedWord.text)}
                        className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-300"
                      >
                        <Volume2 className="h-5 w-5 text-violet-600" />
                      </button>
                      {selectedWord.partOfSpeech && (
                        <span className="px-3 py-1 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-sm font-medium text-violet-700">
                          {selectedWord.partOfSpeech}
                        </span>
                      )}
                      <span
                        className={cn(
                          'px-3 py-1 rounded-xl text-sm font-medium backdrop-blur-sm border',
                          selectedWord.difficulty === 'beginner' && "bg-green-100/70 text-green-700 border-green-200",
                          selectedWord.difficulty === 'intermediate' && "bg-blue-100/70 text-blue-700 border-blue-200",
                          selectedWord.difficulty === 'advanced' && "bg-purple-100/70 text-purple-700 border-purple-200"
                        )}
                      >
                        {selectedWord.difficulty}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-xl text-gray-700 leading-relaxed">
                    {selectedWord.definition}
                  </p>
                  {selectedWord.example && (
                    <div className="mt-4 p-4 rounded-xl bg-white/30 backdrop-blur-sm border border-white/40">
                      <p className="italic text-gray-700">"{selectedWord.example}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Tabs */}
              <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
                {/* Tab Navigation */}
                <div className="flex border-b border-white/20 bg-gradient-to-r from-violet-500/5 via-blue-500/5 to-emerald-500/5">
                  <button
                    onClick={() => setActiveTab('examples')}
                    className={cn(
                      "flex-1 py-4 px-6 font-semibold transition-all duration-300 flex items-center justify-center gap-2",
                      activeTab === 'examples' 
                        ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg" 
                        : "text-gray-600 hover:text-violet-600 hover:bg-white/30"
                    )}
                  >
                    <Lightbulb className="h-4 w-4" />
                    Examples
                  </button>
                  <button
                    onClick={() => setActiveTab('collocations')}
                    className={cn(
                      "flex-1 py-4 px-6 font-semibold transition-all duration-300 flex items-center justify-center gap-2",
                      activeTab === 'collocations'
                        ? "bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg"
                        : "text-gray-600 hover:text-emerald-600 hover:bg-white/30"
                    )}
                  >
                    <Brain className="h-4 w-4" />
                    Collocations
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-8">
                  {activeTab === 'examples' && (
                    <GeneratedContentContainer
                      title="Usage Examples"
                      onGenerate={() => generateContent('examples')}
                      isLoading={generateExamplesMutation.isPending}
                      hasContent={examples.length > 0}
                    >
                      {examples.map((ex: UsageExample) => (
                        <ContentItem
                          key={ex.id}
                          text={ex.sentence}
                          onSpeak={() => speakText(ex.sentence)}
                          onCopy={() => navigator.clipboard.writeText(ex.sentence)}
                        />
                      ))}
                    </GeneratedContentContainer>
                  )}
                  {activeTab === 'collocations' && (
                    <GeneratedContentContainer
                      title="Word Combinations"
                      onGenerate={() => generateContent('collocations')}
                      isLoading={generateCollocationsMutation.isPending}
                      hasContent={collocations.length > 0}
                    >
                      {collocations.map((col: CollocationPattern) => (
                        <div key={col.id} className="rounded-2xl bg-gradient-to-r from-white/50 to-white/30 backdrop-blur-sm border border-white/40 p-6 shadow-lg">
                          <div className="mb-4 flex items-center justify-between">
                            <h4 className="font-bold text-violet-700 text-lg">{col.pattern}</h4>
                            <div className="flex gap-2">
                              <span className="px-2 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-medium">
                                {col.type.replace('_', ' ')}
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium">
                                {col.frequency}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {col.examples.map((ex: string, i: number) => (
                              <ContentItem
                                key={i}
                                text={`"${ex}"`}
                                onSpeak={() => speakText(ex)}
                                onCopy={() => navigator.clipboard.writeText(ex)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </GeneratedContentContainer>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
              <div className="flex h-64 items-center justify-center p-8">
                <div className="text-center">
                  <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <p className="text-xl font-medium text-gray-600 mb-2">
                    Select a word to explore ✨
                  </p>
                  <p className="text-gray-500">
                    Choose from your vocabulary list to see examples and more
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const GeneratedContentContainer: React.FC<{
  title: string
  onGenerate: () => void
  isLoading: boolean
  hasContent: boolean
  children: React.ReactNode
}> = ({ title, onGenerate, isLoading, hasContent, children }) => {
  if (!hasContent) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-white/50 to-white/30 backdrop-blur-sm border border-white/40 p-12 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-violet-100 to-emerald-100 shadow-inner">
          <Sparkles className="h-8 w-8 text-violet-600" />
        </div>
        <p className="mx-auto mb-8 max-w-sm text-gray-600 text-lg">
          Want to see more examples? Let's find some for you!
        </p>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="bg-gradient-to-r from-violet-500 to-emerald-500 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {isLoading ? 'Finding...' : `Find ${title}`}
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="space-y-3">{children}</div>
    </div>
  )
}

const ContentItem: React.FC<{
  text: string
  onSpeak: () => void
  onCopy: () => void
}> = ({ text, onSpeak, onCopy }) => (
  <div className="rounded-2xl bg-gradient-to-r from-white/40 to-white/20 backdrop-blur-sm border border-white/30 p-4 shadow-md">
    <div className="flex items-center justify-between">
      <p className="flex-1 text-gray-700 leading-relaxed">{text}</p>
      <div className="ml-4 flex items-center gap-2">
        <button
          onClick={onSpeak}
          className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center hover:bg-white/30 transition-all duration-300"
        >
          <Volume2 className="h-4 w-4 text-violet-600" />
        </button>
        <button
          onClick={onCopy}
          className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center hover:bg-white/30 transition-all duration-300"
        >
          <Copy className="h-4 w-4 text-emerald-600" />
        </button>
      </div>
    </div>
  </div>
)

export default EnhancedContextualLearning