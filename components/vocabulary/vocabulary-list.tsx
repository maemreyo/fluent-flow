import React, { useState } from 'react'
import { BookOpen, MessageSquare, Search, Volume2 } from 'lucide-react'
import type { VocabularyAnalysisResult } from '../../lib/services/vocabulary-analysis-service'
import VocabularyCard from './vocabulary-card'

interface VocabularyListProps {
  analysis: VocabularyAnalysisResult | null
  isLoading?: boolean
  onPlayAudio?: (text: string) => void
  className?: string
}

export const VocabularyList: React.FC<VocabularyListProps> = ({
  analysis,
  isLoading = false,
  onPlayAudio,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<'all' | 'words' | 'phrases'>('all')

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span>Analyzing vocabulary...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className={`py-8 text-center text-gray-500 ${className}`}>
        <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No vocabulary analysis available</p>
      </div>
    )
  }

  // Filter items based on search and filters
  const filteredWords = analysis.words.filter(word => {
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDifficulty = selectedDifficulty === 'all' || word.difficulty === selectedDifficulty
    return matchesSearch && matchesDifficulty
  })

  const filteredPhrases = analysis.phrases.filter(phrase => {
    const matchesSearch = phrase.phrase.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDifficulty =
      selectedDifficulty === 'all' || phrase.difficulty === selectedDifficulty
    return matchesSearch && matchesDifficulty
  })

  const showWords = selectedType === 'all' || selectedType === 'words'
  const showPhrases = selectedType === 'all' || selectedType === 'phrases'

  const totalItems =
    (showWords ? filteredWords.length : 0) + (showPhrases ? filteredPhrases.length : 0)

  const handlePlayAudio = async (text: string) => {
    if (onPlayAudio) {
      onPlayAudio(text)
    } else {
      // Fallback to Web Speech API
      try {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = 0.8
        speechSynthesis.speak(utterance)
      } catch (error) {
        console.error('Failed to play audio:', error)
      }
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Vocabulary Analysis</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{analysis.totalWords} total words</span>
            <span>•</span>
            <span>{analysis.uniqueWords} unique words</span>
            <span>•</span>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                analysis.difficultyLevel === 'beginner'
                  ? 'bg-green-100 text-green-800'
                  : analysis.difficultyLevel === 'intermediate'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {analysis.difficultyLevel} level
            </span>
          </div>
        </div>
      </div>

      {/* Focus words suggestion */}
      {analysis.suggestedFocusWords.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <h4 className="mb-2 text-sm font-medium text-blue-900">📚 Suggested Focus Words</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.suggestedFocusWords.map((word, index) => (
              <button
                key={index}
                onClick={() => setSearchTerm(word)}
                className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 transition-colors hover:bg-blue-200"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <input
            type="text"
            placeholder="Search vocabulary..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as 'all' | 'words' | 'phrases')}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="words">Words Only</option>
            <option value="phrases">Phrases Only</option>
          </select>

          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {totalItems} items
        {searchTerm && ` matching "${searchTerm}"`}
        {selectedDifficulty !== 'all' && ` (${selectedDifficulty} level)`}
      </div>

      {/* Vocabulary items */}
      <div className="space-y-4">
        {/* Words section */}
        {showWords && filteredWords.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h4 className="text-md font-medium text-gray-900">Words ({filteredWords.length})</h4>
            </div>
            <div className="space-y-3">
              {filteredWords.map((word, index) => (
                <VocabularyCard
                  key={`word-${index}`}
                  item={word}
                  type="word"
                  onPlayAudio={handlePlayAudio}
                />
              ))}
            </div>
          </div>
        )}

        {/* Phrases section */}
        {showPhrases && filteredPhrases.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <h4 className="text-md font-medium text-gray-900">
                Phrases ({filteredPhrases.length})
              </h4>
            </div>
            <div className="space-y-3">
              {filteredPhrases.map((phrase, index) => (
                <VocabularyCard
                  key={`phrase-${index}`}
                  item={phrase}
                  type="phrase"
                  onPlayAudio={handlePlayAudio}
                />
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {totalItems === 0 && (
          <div className="py-8 text-center text-gray-500">
            <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No vocabulary items found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Audio button helper */}
      <div className="mt-6 rounded-lg bg-gray-50 p-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Volume2 className="h-4 w-4" />
          <span>Click the audio icon on any word or phrase to hear pronunciation</span>
        </div>
      </div>
    </div>
  )
}

export default VocabularyList
