import React, { useState } from 'react'
import type { SavedContent } from '../../lib/utils/newtab-analytics'

interface SavedContentCardProps {
  content: SavedContent
  onBookmark: (videoId: string, title: string, thumbnail: string) => void
  onRemoveBookmark: (videoId: string) => void
  onSaveNote: (content: string, videoId?: string) => void
  onDeleteNote: (noteId: string) => void
}

export function SavedContentCard({ 
  content, 
  onRemoveBookmark,
  onSaveNote,
  onDeleteNote 
}: SavedContentCardProps) {
  const [activeTab, setActiveTab] = useState<'loops' | 'bookmarks' | 'notes'>('loops')
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  const handleSaveNote = () => {
    if (newNote.trim()) {
      onSaveNote(newNote.trim())
      setNewNote('')
      setIsAddingNote(false)
    }
  }

  const openVideo = (videoId: string) => {
    chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${videoId}` })
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return 'Yesterday'
    return `${diffInDays} days ago`
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Saved Content</h2>
      
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-4">
        {[
          { id: 'loops', label: 'Loops', icon: '🔄' },
          { id: 'bookmarks', label: 'Videos', icon: '🔖' },
          { id: 'notes', label: 'Notes', icon: '📝' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-48">
        {/* Recent Loops */}
        {activeTab === 'loops' && (
          <div className="space-y-3">
            {content.recentLoops.length > 0 ? (
              content.recentLoops.map((loop) => (
                <div key={loop.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl">🔄</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 text-sm truncate">
                      {loop.title}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">{loop.videoTitle}</p>
                    <p className="text-xs text-gray-400">{formatTimeAgo(loop.createdAt)}</p>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    Play
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">🔄</div>
                <p className="text-sm">No loops saved yet</p>
              </div>
            )}
          </div>
        )}

        {/* Bookmarked Videos */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-3">
            {content.bookmarkedVideos.length > 0 ? (
              content.bookmarkedVideos.map((video) => (
                <div key={video.videoId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-12 h-9 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 text-sm truncate">
                      {video.title}
                    </h4>
                    <p className="text-xs text-gray-400">{formatTimeAgo(video.bookmarkedAt)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openVideo(video.videoId)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Open
                    </button>
                    <button 
                      onClick={() => onRemoveBookmark(video.videoId)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">🔖</div>
                <p className="text-sm">No bookmarked videos</p>
              </div>
            )}
          </div>
        )}

        {/* Practice Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            {content.practiceNotes.length > 0 ? (
              content.practiceNotes.map((note) => (
                <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {note.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTimeAgo(note.createdAt)}
                      </p>
                    </div>
                    <button 
                      onClick={() => onDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-sm">No practice notes</p>
              </div>
            )}

            {/* Add Note */}
            {isAddingNote ? (
              <div className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a practice note..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNote}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {setIsAddingNote(false); setNewNote('')}}
                    className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingNote(true)}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors duration-200 text-sm"
              >
                + Add Practice Note
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}