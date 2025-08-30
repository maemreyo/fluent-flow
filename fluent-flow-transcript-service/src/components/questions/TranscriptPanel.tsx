import { useState } from 'react'

interface TranscriptPanelProps {
  transcript: string
  videoTitle: string
  startTime?: number
  endTime?: number
  isOpen: boolean
  onToggle: () => void
}

export function TranscriptPanel({ 
  transcript, 
  videoTitle, 
  startTime, 
  endTime, 
  isOpen, 
  onToggle 
}: TranscriptPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  if (!transcript) return null

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.round(timeInSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Highlight search terms in transcript
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed right-6 top-1/2 z-40 -translate-y-1/2 transform rounded-full bg-gradient-to-r from-green-500 to-blue-500 p-4 text-white shadow-2xl transition-all duration-200 hover:scale-110 hover:from-green-600 hover:to-blue-600"
        title="Toggle transcript panel"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </button>

      {/* Transcript Panel */}
      <div
        className={`fixed right-0 top-0 z-30 h-full w-96 transform bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">📝 Transcript</h2>
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
            {videoTitle}
          </p>

          {/* Time Range */}
          {startTime !== undefined && endTime !== undefined && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-gray-500">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                {formatTime(startTime)} - {formatTime(endTime)}
              </span>
            </div>
          )}

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search transcript..."
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

        {/* Transcript Content */}
        <div className="h-full overflow-y-auto pb-24">
          <div className="p-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="prose prose-sm max-w-none">
                <p className="leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {highlightText(transcript, searchTerm)}
                </p>
              </div>
            </div>

            {/* Word Count */}
            <div className="mt-4 text-center">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                📊 {transcript.split(' ').length} words
              </span>
            </div>
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