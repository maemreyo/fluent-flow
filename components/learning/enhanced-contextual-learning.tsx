import React, { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  Brain,
  Copy,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
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

interface EnhancedContextualLearningProps {
  onNavigateToVideo?: (loopId: string) => void
}

export const EnhancedContextualLearning: React.FC<EnhancedContextualLearningProps> = () => {
  const [vocabularyItems, setVocabularyItems] = useState<UserVocabularyItem[]>([])
  const [selectedWord, setSelectedWord] = useState<UserVocabularyItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('examples') // Changed default to 'examples'

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

  const handleWordSelect = async (item: UserVocabularyItem) => {
    setSelectedWord(item)
    setActiveTab('examples') // Always start with examples tab

    // Clear current content
    setAiContent({ examples: [], collocations: [], contexts: [] })

    // Try to load cached contextual data and show examples immediately
    try {
      const cachedData = await contextualLearningAIService.getContextualDataForSRS(
        item,
        undefined,
        {
          generateIfMissing: false, // Don't generate automatically, just load cached data
          maxExamples: 6,
          maxCollocations: 8
        }
      )

      console.log('Cached data result:', {
        hasEnhancedData: cachedData.hasEnhancedData,
        exampleCount: cachedData.examples.length,
        collocationCount: cachedData.collocations.length,
        examples: cachedData.examples,
        collocations: cachedData.collocations
      })

      if (cachedData.hasEnhancedData) {
        setAiContent(prev => ({
          ...prev,
          examples: cachedData.examples,
          collocations: cachedData.collocations
        }))
        console.log('Loaded cached contextual data for:', item.text)
      } else {
        // If no cached data, automatically generate examples
        console.log('No enhanced data available for:', item.text, '- generating examples')
        generateContent('examples')
      }
    } catch (error) {
      console.error('Failed to load cached contextual data:', error)
      // On error, also generate examples
      generateContent('examples')
    }
  }

  const generateContent = useCallback(
    async (type: 'examples' | 'collocations' | 'contexts') => {
      if (!selectedWord) return
      setGenerationState(prev => ({ ...prev, [type]: true }))
      try {
        if (type === 'examples') {
          // Use the contextual learning service which handles caching internally
          const result = await contextualLearningAIService.generateUsageExamples(selectedWord, 6)
          setAiContent(prev => ({ ...prev, examples: result }))
        } else if (type === 'collocations') {
          // Use the contextual learning service which handles caching internally
          const result = await contextualLearningAIService.generateCollocations(selectedWord, 8)
          setAiContent(prev => ({ ...prev, collocations: result }))
        } else if (type === 'contexts') {
          const result = await contextualLearningAIService.findSimilarContexts(selectedWord, 5)
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
                  {filteredVocabulary.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleWordSelect(item)}
                      className={cn(
                        "cursor-pointer rounded-2xl p-4 transition-all duration-300 border",
                        selectedWord?.id === item.id 
                          ? "bg-gradient-to-r from-violet-100 via-blue-100 to-emerald-100 border-violet-200 shadow-md scale-105" 
                          : "bg-white/50 hover:bg-white/80 border-transparent hover:border-white/40 hover:shadow-lg"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{item.text}</p>
                        <p className="truncate text-sm text-gray-600 mt-1">{item.definition}</p>
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
                  ))}
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
                      isLoading={generationState.examples}
                      hasContent={aiContent.examples.length > 0}
                    >
                      {aiContent.examples.map(ex => (
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
                      isLoading={generationState.collocations}
                      hasContent={aiContent.collocations.length > 0}
                    >
                      {aiContent.collocations.map(col => (
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
  isExample?: boolean
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