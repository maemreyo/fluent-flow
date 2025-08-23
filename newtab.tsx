import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NewTabContent } from './components/newtab/newtab-content'
import { newTabDataService } from './lib/services/newtab-data-service'
import type { NewTabData } from './lib/utils/newtab-analytics'
import './styles/newtab.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

function NewTabApp() {
  const [data, setData] = useState<NewTabData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const newTabData = await newTabDataService.getNewTabData()
      setData(newTabData)
    } catch (err) {
      console.error('Failed to load newtab data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = async (actionId: string, actionData?: any) => {
    try {
      await newTabDataService.executeQuickAction(actionId, actionData)
      // Refresh data after action
      setTimeout(loadData, 100)
    } catch (err) {
      console.error('Failed to execute quick action:', err)
    }
  }

  const handleBookmark = async (videoId: string, title: string, thumbnail: string) => {
    try {
      await newTabDataService.bookmarkVideo(videoId, title, thumbnail)
      await loadData() // Refresh data
    } catch (err) {
      console.error('Failed to bookmark video:', err)
    }
  }

  const handleRemoveBookmark = async (videoId: string) => {
    try {
      await newTabDataService.removeBookmark(videoId)
      await loadData() // Refresh data
    } catch (err) {
      console.error('Failed to remove bookmark:', err)
    }
  }

  const handleSaveNote = async (content: string, videoId?: string) => {
    try {
      await newTabDataService.savePracticeNote(content, videoId)
      await loadData() // Refresh data
    } catch (err) {
      console.error('Failed to save note:', err)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await newTabDataService.deletePracticeNote(noteId)
      await loadData() // Refresh data
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your learning dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error || 'Failed to load your learning data'}</p>
          <button 
            onClick={loadData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NewTabContent 
        data={data}
        onQuickAction={handleQuickAction}
        onBookmark={handleBookmark}
        onRemoveBookmark={handleRemoveBookmark}
        onSaveNote={handleSaveNote}
        onDeleteNote={handleDeleteNote}
        onRefresh={loadData}
      />
    </QueryClientProvider>
  )
}

export default NewTabApp