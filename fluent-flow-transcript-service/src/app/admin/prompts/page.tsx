'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Eye, Star, StarOff, Filter, Search, MessageSquare } from 'lucide-react'
import { CustomPromptService } from '@/lib/services/custom-prompt-service'
import { 
  useAdminPrompts, 
  useDeletePrompt, 
  useTogglePromptStatus, 
  useToggleDefaultPrompt 
} from '@/hooks/use-prompts'

const CATEGORIES = [
  'listening_comprehension',
  'detail_focused', 
  'inference_implication',
  'tone_analysis',
  'vocabulary_context',
  'language_function',
  'general'
] as const

export default function PromptsManagement() {
  const { data: prompts = [], isLoading: loading, error } = useAdminPrompts()
  const deletePromptMutation = useDeletePrompt()
  const toggleStatusMutation = useTogglePromptStatus()
  const toggleDefaultMutation = useToggleDefaultPrompt()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Filter prompts based on search and filters
  const filteredPrompts = useMemo(() => {
    let filtered = prompts

    if (searchTerm) {
      filtered = filtered.filter(prompt => 
        prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(prompt => prompt.category === selectedCategory)
    }

    if (selectedStatus === 'active') {
      filtered = filtered.filter(prompt => prompt.is_active)
    } else if (selectedStatus === 'inactive') {
      filtered = filtered.filter(prompt => !prompt.is_active)
    } else if (selectedStatus === 'default') {
      filtered = filtered.filter(prompt => prompt.is_default)
    }

    return filtered
  }, [prompts, searchTerm, selectedCategory, selectedStatus])

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync({ 
        id, 
        is_active: !currentActive 
      })
    } catch (error) {
      console.error('Error toggling prompt status:', error)
      alert('Failed to toggle prompt status')
    }
  }

  const handleToggleDefault = async (id: string, currentDefault: boolean) => {
    try {
      await toggleDefaultMutation.mutateAsync({ 
        id, 
        is_default: !currentDefault 
      })
    } catch (error) {
      console.error('Error setting default prompt:', error)
      alert('Failed to set default prompt')
    }
  }

  const handleDeletePrompt = async (id: string) => {
    try {
      await deletePromptMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (error: any) {
      console.error('Error deleting prompt:', error)
      alert(error.message || 'Failed to delete prompt')
    }
  }

  const getCategoryDisplayName = (category: string) => {
    return CustomPromptService.getCategoryDisplayName(category)
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading prompts
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error.message}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Prompts</h1>
          <p className="mt-2 text-gray-600">
            Manage specialized question generation prompts for different learning objectives.
          </p>
        </div>
        <Link
          href="/admin/prompts/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              className="pl-10 w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {getCategoryDisplayName(category).en}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="default">Default</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-2" />
            {filteredPrompts.length} of {prompts.length} prompts
          </div>
        </div>
      </div>

      {/* Prompts List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredPrompts.map((prompt) => (
            <li key={prompt.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {prompt.name}
                        </h3>
                        
                        {/* Status Badges */}
                        <div className="flex space-x-1">
                          {prompt.is_default && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </span>
                          )}
                          
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            prompt.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {prompt.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span className="font-medium">
                          {getCategoryDisplayName(prompt.category).en}
                        </span>
                        <span>•</span>
                        <span>Used {prompt.usage_count} times</span>
                        <span>•</span>
                        <span>
                          Updated {new Date(prompt.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {prompt.description && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {prompt.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    href={`/admin/prompts/${prompt.id}`}
                    className="text-blue-600 hover:text-blue-900"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  
                  <Link
                    href={`/admin/prompts/${prompt.id}/edit`}
                    className="text-green-600 hover:text-green-900"
                    title="Edit prompt"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={() => handleToggleDefault(prompt.id, prompt.is_default)}
                    className={`${prompt.is_default ? 'text-yellow-600' : 'text-gray-400'} hover:text-yellow-900`}
                    title={prompt.is_default ? 'Remove as default' : 'Set as default'}
                    disabled={toggleDefaultMutation.isPending}
                  >
                    {prompt.is_default ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => handleToggleActive(prompt.id, prompt.is_active)}
                    className={`px-2 py-1 text-xs rounded ${
                      prompt.is_active 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } disabled:opacity-50`}
                    title={prompt.is_active ? 'Deactivate' : 'Activate'}
                    disabled={toggleStatusMutation.isPending}
                  >
                    {toggleStatusMutation.isPending ? 'Loading...' : prompt.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => setDeleteConfirm(prompt.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete prompt"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filteredPrompts.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No prompts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new custom prompt.'
              }
            </p>
            {!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && (
              <div className="mt-6">
                <Link
                  href="/admin/prompts/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Prompt
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Delete Prompt</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this prompt? This action cannot be undone.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => handleDeletePrompt(deleteConfirm)}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-600 disabled:opacity-50"
                  disabled={deletePromptMutation.isPending}
                >
                  {deletePromptMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}