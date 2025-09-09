'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Star, Calendar, Activity } from 'lucide-react'
import { CustomPromptService } from '@/lib/services/custom-prompt-service'
import { usePromptDetail } from '@/hooks/use-prompts'

export default function PromptDetail() {
  const params = useParams()
  const promptId = params.id as string
  
  const { data: prompt, isLoading, error } = usePromptDetail(promptId)

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

  const getCategoryDisplayName = (category: string) => {
    return CustomPromptService.getCategoryDisplayName(category)
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

      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{prompt.name}</h1>
            
            {/* Status Badges */}
            <div className="flex space-x-2">
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
          
          {prompt.description && (
            <p className="mt-2 text-gray-600">{prompt.description}</p>
          )}
        </div>

        <Link
          href={`/admin/prompts/${promptId}/edit`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Prompt
        </Link>
      </div>

      {/* Metadata */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Prompt Information</h2>
        
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Category</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {getCategoryDisplayName(prompt.category).en}
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500 flex items-center">
              <Activity className="h-4 w-4 mr-1" />
              Usage Count
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {prompt.usage_count} times
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Created
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(prompt.created_at).toLocaleDateString()}
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Updated
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(prompt.updated_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      {/* Configuration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">AI Configuration</h2>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Max Tokens</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {prompt.config?.maxTokens || 16000}
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Temperature</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {prompt.config?.temperature || 0.3}
            </dd>
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Prompt</h2>
        <div className="bg-gray-50 rounded-md p-4">
          <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
            {prompt.system_prompt}
          </pre>
        </div>
      </div>

      {/* User Template */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">User Template</h2>
        <div className="bg-gray-50 rounded-md p-4">
          <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
            {prompt.user_template}
          </pre>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p className="font-medium">Available template variables:</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
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
  )
}