import { useState, useEffect, useRef } from 'react'
import { VocabularyItem } from './QuestionSetInfo'
import { useWordSelection } from '../../lib/hooks/use-word-selection'

interface VocabularyPanelProps {
  vocabulary: VocabularyItem[]
  isOpen: boolean
  onToggle: () => void
  enableWordSelection?: boolean
}

export function VocabularyPanel({ vocabulary, isOpen, onToggle, enableWordSelection = true }: VocabularyPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const { enableSelection, disableSelection } = useWordSelection()
  
  if (!vocabulary || vocabulary.length === 0) return null

  // Enable word selection when panel is open
  useEffect(() => {
    if (enableWordSelection && isOpen && panelRef.current) {
      enableSelection('vocabulary-panel', 'vocabulary', 'vocabulary-panel')
    }

    return () => {
      disableSelection('vocabulary-panel')
    }
  }, [enableWordSelection, isOpen, enableSelection, disableSelection])

  const filteredVocabulary = vocabulary.filter(item =>
    item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getLevelColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'noun': return '📝'
      case 'verb': return '🚀'
      case 'adjective': return '🎨'
      case 'adverb': return '⚡'
      default: return '💭'
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed left-6 top-1/2 z-40 -translate-y-1/2 transform rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white shadow-2xl transition-all duration-200 hover:scale-110 hover:from-blue-600 hover:to-purple-700"
        title="Toggle vocabulary panel"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </button>

      {/* Vocabulary Panel */}
      <div
        className={`fixed left-0 top-0 z-30 h-full w-96 transform bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">📚 Vocabulary</h2>
            <button
              onClick={onToggle}
              className="rounded-full p-2 text-gray-500 hover:bg-white hover:text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="mt-2 text-sm text-gray-600">
            {vocabulary.length} words from this video
          </p>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search vocabulary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Vocabulary List */}
        <div 
          id="vocabulary-panel" 
          ref={panelRef}
          className={`h-full overflow-y-auto pb-24 ${enableWordSelection ? 'select-text' : ''}`}
        >
          <div className="space-y-4 p-4">
            {enableWordSelection && (
              <div className="mb-4 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                💡 Select any word to add to your personal vocabulary
              </div>
            )}
            {filteredVocabulary.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                {searchTerm ? 'No vocabulary found matching your search.' : 'No vocabulary available.'}
              </div>
            ) : (
              filteredVocabulary.map((item, index) => (
                <div
                  key={index}
                  className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${
                    enableWordSelection ? 'cursor-text' : ''
                  }`}
                >
                  {/* Word Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTypeIcon(item.type)}</span>
                      <h3 className="text-lg font-bold text-gray-900">{item.word}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.type && (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {item.type}
                        </span>
                      )}
                      {item.level && (
                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${getLevelColor(item.level)}`}>
                          {item.level}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Definition */}
                  <p className="mb-3 leading-relaxed text-gray-700">{item.definition}</p>

                  {/* Example */}
                  {item.example && (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Example:</span> <em>"{item.example}"</em>
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-30"
          onClick={onToggle}
        />
      )}
    </>
  )
}