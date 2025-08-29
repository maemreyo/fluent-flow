import React, { useEffect, useState } from 'react'
import { BookOpen, ExternalLink, PlayCircle, Search, Target } from 'lucide-react'
import {
  userVocabularyService,
  type UserVocabularyItem
} from '../../lib/services/user-vocabulary-service'
import { Badge } from '../ui/badge'

interface ContextualLearningProps {
  onNavigateToVideo?: (loopId: string) => void
}

export const ContextualLearning: React.FC<ContextualLearningProps> = ({ onNavigateToVideo }) => {
  const [vocabularyItems, setVocabularyItems] = useState<UserVocabularyItem[]>([])
  const [selectedWord, setSelectedWord] = useState<UserVocabularyItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Load user's vocabulary deck
  useEffect(() => {
    const loadVocabulary = async () => {
      setIsLoading(true)
      try {
        const items = await userVocabularyService.getUserVocabularyDeck({ limit: 100 })
        setVocabularyItems(items)
      } catch (error) {
        console.error('Failed to load vocabulary:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadVocabulary()
  }, [])

  // Filter vocabulary based on search term
  const filteredVocabulary = vocabularyItems.filter(
    item =>
      item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleWordSelect = (item: UserVocabularyItem) => {
    setSelectedWord(item)
  }

  const handleNavigateToSource = () => {
    if (selectedWord?.sourceLoopId && onNavigateToVideo) {
      onNavigateToVideo(selectedWord.sourceLoopId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading vocabulary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search your vocabulary..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Vocabulary List */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Your Vocabulary ({filteredVocabulary.length})
          </h3>

          {filteredVocabulary.length === 0 && !isLoading && (
            <div className="rounded-lg bg-gray-50 p-6 text-center">
              <BookOpen className="mx-auto mb-2 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">No vocabulary found</p>
              {searchTerm && (
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms</p>
              )}
            </div>
          )}

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {filteredVocabulary.map(item => (
              <button
                key={item.id}
                onClick={() => handleWordSelect(item)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedWord?.id === item.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{item.text}</div>
                    <div className="truncate text-sm text-gray-600">{item.definition}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      {item.itemType}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {item.difficulty}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Context Details */}
        <div className="lg:col-span-2">
          {selectedWord ? (
            <div className="space-y-6">
              {/* Word Header */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedWord.text}</h2>
                    {selectedWord.pronunciation && (
                      <p className="mt-1 font-mono text-blue-600">{selectedWord.pronunciation}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedWord.partOfSpeech && (
                      <Badge variant="secondary">{selectedWord.partOfSpeech}</Badge>
                    )}
                    <Badge variant="outline">{selectedWord.difficulty}</Badge>
                  </div>
                </div>

                <p className="mb-4 text-gray-700">{selectedWord.definition}</p>

                {selectedWord.example && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="mb-1 text-sm font-medium text-gray-700">Example Usage:</p>
                    <p className="italic text-gray-800">"{selectedWord.example}"</p>
                  </div>
                )}
              </div>

              {/* Source Context */}
              {selectedWord.sourceLoopId && (
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Original Context</h3>
                    <button
                      onClick={handleNavigateToSource}
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View in Video
                    </button>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Video Segment</span>
                      <Badge variant="outline" className="text-xs">
                        Loop ID: {selectedWord.sourceLoopId.slice(0, 8)}...
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-700">
                      This word appeared {selectedWord.frequency} time
                      {selectedWord.frequency !== 1 ? 's' : ''} in this video segment.
                    </p>
                  </div>
                </div>
              )}

              {/* Contextual Practice Features */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Usage Examples */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-gray-900">More Examples</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-sm text-green-800">
                        "Generate more usage examples for better understanding"
                      </p>
                      <p className="mt-1 text-xs text-green-600">Coming Soon - AI Generated</p>
                    </div>
                  </div>
                </div>

                {/* Collocation Practice */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Search className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Word Combinations</h4>
                  </div>
                  <div className="space-y-3">
                    {selectedWord.itemType === 'word' &&
                      selectedWord.synonyms &&
                      selectedWord.synonyms.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-purple-600">Related Words:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedWord.synonyms.slice(0, 3).map((synonym, index) => (
                              <span
                                key={index}
                                className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700"
                              >
                                {synonym}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    <div className="rounded-lg bg-purple-50 p-3">
                      <p className="text-sm text-purple-800">
                        "Common phrases and combinations with this word"
                      </p>
                      <p className="mt-1 text-xs text-purple-600">Coming Soon - AI Generated</p>
                    </div>
                  </div>
                </div>

                {/* Similar Context */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-orange-600" />
                    <h4 className="font-semibold text-gray-900">Find in Other Videos</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-lg bg-orange-50 p-3">
                      <p className="text-sm text-orange-800">
                        "Search for this word in other FluentFlow video analyses"
                      </p>
                      <p className="mt-1 text-xs text-orange-600">
                        Coming Soon - Cross-Video Search
                      </p>
                    </div>
                  </div>
                </div>

                {/* Learning Progress */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-600" />
                    <h4 className="font-semibold text-gray-900">Learning Progress</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge variant="outline" className="capitalize">
                        {selectedWord.learningStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Times Practiced</span>
                      <span className="font-medium">{selectedWord.timesPracticed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="font-medium">
                        {selectedWord.timesPracticed > 0
                          ? Math.round(
                              (selectedWord.timesCorrect / selectedWord.timesPracticed) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    {selectedWord.nextReviewDate && selectedWord.learningStatus !== 'new' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Next Review</span>
                        <span className="text-sm font-medium">
                          {new Date(selectedWord.nextReviewDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Select a Word</h3>
              <p className="text-gray-600">
                Choose a vocabulary word from the list to see its contextual learning options.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features Overview */}
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <PlayCircle className="mx-auto mb-3 h-8 w-8 text-yellow-600" />
          <h4 className="mb-2 font-semibold text-yellow-800">Save to Loop</h4>
          <p className="text-sm text-yellow-700">
            Associate words with specific video segments for contextual review
          </p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-green-600" />
          <h4 className="mb-2 font-semibold text-green-800">Usage Examples</h4>
          <p className="text-sm text-green-700">
            Get more examples from real content and similar contexts
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-blue-600" />
          <h4 className="mb-2 font-semibold text-blue-800">Collocation Practice</h4>
          <p className="text-sm text-blue-700">
            Learn common word combinations and natural usage patterns
          </p>
        </div>

        <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 text-center">
          <ExternalLink className="mx-auto mb-3 h-8 w-8 text-purple-600" />
          <h4 className="mb-2 font-semibold text-purple-800">Similar Context</h4>
          <p className="text-sm text-purple-700">
            Find this word in other videos for diverse learning contexts
          </p>
        </div>
      </div>
    </div>
  )
}

export default ContextualLearning
