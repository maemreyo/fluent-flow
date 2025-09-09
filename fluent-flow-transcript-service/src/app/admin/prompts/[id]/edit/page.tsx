'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { CustomPromptService } from '@/lib/services/custom-prompt-service'
import { usePromptDetail, useUpdatePrompt } from '@/hooks/use-prompts'

const CATEGORIES = [
  'listening_comprehension',
  'detail_focused', 
  'inference_implication',
  'tone_analysis',
  'vocabulary_context',
  'language_function',
  'general'
] as const

interface FormData {
  name: string
  description: string
  category: string
  system_prompt: string
  user_template: string
  is_active: boolean
  maxTokens: number
  temperature: number
}

export default function EditPrompt() {
  const params = useParams()
  const router = useRouter()
  const promptId = params.id as string
  
  const { data: prompt, isLoading, error } = usePromptDetail(promptId)
  const updatePromptMutation = useUpdatePrompt()
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'general',
    system_prompt: '',
    user_template: '',
    is_active: true,
    maxTokens: 16000,
    temperature: 0.3
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form when prompt data loads
  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name || '',
        description: prompt.description || '',
        category: prompt.category || 'general',
        system_prompt: prompt.system_prompt || '',
        user_template: prompt.user_template || '',
        is_active: prompt.is_active ?? true,
        maxTokens: prompt.config?.maxTokens || 16000,
        temperature: prompt.config?.temperature || 0.3
      })
    }
  }, [prompt])

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.system_prompt.trim()) {
      newErrors.system_prompt = 'System prompt is required'
    }

    if (!formData.user_template.trim()) {
      newErrors.user_template = 'User template is required'
    }

    if (formData.maxTokens < 1000 || formData.maxTokens > 50000) {
      newErrors.maxTokens = 'Max tokens must be between 1,000 and 50,000'
    }

    if (formData.temperature < 0 || formData.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await updatePromptMutation.mutateAsync({
        id: promptId,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          category: formData.category,
          system_prompt: formData.system_prompt,
          user_template: formData.user_template,
          is_active: formData.is_active,
          config: {
            maxTokens: formData.maxTokens,
            temperature: formData.temperature
          }
        }
      })

      router.push('/admin/prompts')
    } catch (error: any) {
      console.error('Error updating prompt:', error)
      if (error.message) {
        setErrors({ submit: error.message })
      } else {
        setErrors({ submit: 'Failed to update prompt. Please try again.' })
      }
    }
  }

  const getCategoryDisplayName = (category: string) => {
    return CustomPromptService.getCategoryDisplayName(category)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !prompt) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading prompt
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error?.message || 'Prompt not found'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/admin/prompts"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Prompts
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Prompt</h1>
          <p className="mt-2 text-gray-600">
            Update the prompt template configuration.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">{errors.submit}</div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`mt-1 block w-full rounded-md border ${errors.name ? 'border-red-300' : 'border-gray-300'} py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                placeholder="e.g., Advanced Inference Questions"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`mt-1 block w-full rounded-md border ${errors.category ? 'border-red-300' : 'border-gray-300'} py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {getCategoryDisplayName(category).en}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional description of this prompt's purpose and use case..."
            />
          </div>

          {/* AI Configuration */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Max Tokens
              </label>
              <input
                type="number"
                min="1000"
                max="50000"
                value={formData.maxTokens}
                onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
                className={`mt-1 block w-full rounded-md border ${errors.maxTokens ? 'border-red-300' : 'border-gray-300'} py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
              {errors.maxTokens && (
                <p className="mt-1 text-sm text-red-600">{errors.maxTokens}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Maximum number of tokens for AI response (1,000 - 50,000)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Temperature
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={formData.temperature}
                onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                className={`mt-1 block w-full rounded-md border ${errors.temperature ? 'border-red-300' : 'border-gray-300'} py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
              {errors.temperature && (
                <p className="mt-1 text-sm text-red-600">{errors.temperature}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Controls randomness: 0 (focused) to 2 (creative)
              </p>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              id="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active (users can select this prompt)
            </label>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-white shadow rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt *
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Instructions for the AI about its role and behavior when generating questions.
            </p>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => handleInputChange('system_prompt', e.target.value)}
              rows={8}
              className={`block w-full rounded-md border ${errors.system_prompt ? 'border-red-300' : 'border-gray-300'} py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm`}
            />
            {errors.system_prompt && (
              <p className="mt-1 text-sm text-red-600">{errors.system_prompt}</p>
            )}
          </div>
        </div>

        {/* User Template */}
        <div className="bg-white shadow rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Template *
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Template for the user message. Use variables like {`{{transcript}}`}, {`{{videoTitle}}`}, {`{{totalQuestions}}`}, etc.
            </p>
            <textarea
              value={formData.user_template}
              onChange={(e) => handleInputChange('user_template', e.target.value)}
              rows={10}
              className={`block w-full rounded-md border ${errors.user_template ? 'border-red-300' : 'border-gray-300'} py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm`}
            />
            {errors.user_template && (
              <p className="mt-1 text-sm text-red-600">{errors.user_template}</p>
            )}
            <div className="mt-2 text-sm text-gray-500">
              <p className="font-medium">Available variables:</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{`{{totalQuestions}}`}</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{`{{easyCount}}`}</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{`{{mediumCount}}`}</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{`{{hardCount}}`}</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{`{{videoTitle}}`}</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{`{{transcript}}`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/admin/prompts"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={updatePromptMutation.isPending}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {updatePromptMutation.isPending ? 'Updating...' : 'Update Prompt'}
          </button>
        </div>
      </form>
    </div>
  )
}