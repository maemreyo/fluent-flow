/**
 * Vocabulary Manager Component with delete functionality
 * Can be used in newtab or word explorer to manage vocabulary items
 */

import React, { useState, useEffect } from 'react'
import { Trash2, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface VocabularyItem {
  id: string
  text: string
  definition: string
  definition_vi?: string
  context?: string
  created_at: string
  difficulty: string
  learning_status: string
}

interface VocabularyManagerProps {
  onItemDeleted?: (itemId: string) => void
  maxItems?: number
  showBulkActions?: boolean
}

export const VocabularyManager: React.FC<VocabularyManagerProps> = ({
  onItemDeleted,
  maxItems = 20,
  showBulkActions = true
}) => {
  const [items, setItems] = useState<VocabularyItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load vocabulary items
  const loadItems = async () => {
    setIsLoading(true)
    try {
      if (window.vocabularyApiBridge) {
        const vocabularyData = await window.vocabularyApiBridge.getUserVocabulary({ 
          limit: maxItems,
          order: 'desc'
        })
        setItems(vocabularyData)
      }
    } catch (error) {
      console.error('Failed to load vocabulary items:', error)
      showMessage('error', 'Failed to load vocabulary items')
    } finally {
      setIsLoading(false)
    }
  }

  // Delete single item
  const deleteItem = async (itemId: string) => {
    setIsDeleting(true)
    try {
      if (window.vocabularyApiBridge) {
        const success = await window.vocabularyApiBridge.deleteVocabularyItem(itemId)
        if (success) {
          setItems(prev => prev.filter(item => item.id !== itemId))
          onItemDeleted?.(itemId)
          showMessage('success', 'Word deleted successfully')
        } else {
          showMessage('error', 'Failed to delete word')
        }
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
      showMessage('error', 'Failed to delete word')
    } finally {
      setIsDeleting(false)
    }
  }

  // Delete multiple items
  const deleteSelected = async () => {
    if (selectedItems.size === 0) return
    
    setIsDeleting(true)
    try {
      if (window.vocabularyApiBridge) {
        const results = await window.vocabularyApiBridge.deleteMultipleVocabularyItems(
          Array.from(selectedItems)
        )
        
        if (results.success > 0) {
          setItems(prev => prev.filter(item => !selectedItems.has(item.id)))
          selectedItems.forEach(id => onItemDeleted?.(id))
          setSelectedItems(new Set())
          showMessage('success', `Deleted ${results.success} words successfully`)
        }
        
        if (results.failed > 0) {
          showMessage('error', `Failed to delete ${results.failed} words`)
        }
      }
    } catch (error) {
      console.error('Failed to delete items:', error)
      showMessage('error', 'Failed to delete selected words')
    } finally {
      setIsDeleting(false)
    }
  }

  // Show message with auto-hide
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.id)))
    }
  }

  // Load items on mount
  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Vocabulary Manager</h3>
          <p className="text-sm text-gray-500">{items.length} words in your collection</p>
        </div>
        
        <div className="flex items-center gap-2">
          {showBulkActions && selectedItems.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedItems.size})
            </button>
          )}
          
          <button
            onClick={loadItems}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Message display */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-current hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk selection */}
      {showBulkActions && items.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selectedItems.size === items.length && items.length > 0}
            onChange={toggleSelectAll}
            className="rounded border-gray-300"
          />
          <span className="text-gray-600">
            Select all ({items.length} items)
          </span>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Loading vocabulary...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No vocabulary items found</p>
          </div>
        ) : (
          items.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={`p-4 border rounded-lg bg-white hover:shadow-md transition-all ${
                selectedItems.has(item.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {showBulkActions && (
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="mt-1 rounded border-gray-300"
                    />
                  )}
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{item.text}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        item.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.difficulty}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600">{item.definition}</p>
                    
                    {item.definition_vi && (
                      <p className="text-sm text-blue-600 italic">{item.definition_vi}</p>
                    )}
                    
                    {item.context && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        Context: {item.context}
                      </p>
                    )}
                    
                    <div className="text-xs text-gray-400">
                      Added {new Date(item.created_at).toLocaleDateString()} • Status: {item.learning_status}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => deleteItem(item.id)}
                  disabled={isDeleting}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete word"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

export default VocabularyManager