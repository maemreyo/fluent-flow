// AI Quick Actions - Quick AI processing buttons for selected text
// Provides instant AI features without opening full chat interface

import React, { useState } from 'react'
import { 
  FileText, 
  Languages, 
  Lightbulb, 
  BarChart3, 
  Mail, 
  Hash,
  Loader2,
  Copy,
  Check
} from 'lucide-react'
import { useAIStore, useAIActions, useAIProviders, useEnabledFeatures } from '../lib/stores/ai-store'
import { AIService } from '../lib/services/ai-service'
import type { AIProcessingResult } from '../lib/types'

interface AIQuickActionsProps {
  selectedText: string
  onResult?: (result: string) => void
  className?: string
}

export const AIQuickActions: React.FC<AIQuickActionsProps> = ({
  selectedText,
  onResult,
  className = ''
}) => {
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})
  const [copiedAction, setCopiedAction] = useState<string | null>(null)
  
  const { isProcessing } = useAIStore()
  const { providers, activeProvider } = useAIProviders()
  const enabledFeatures = useEnabledFeatures()
  const { addProcessingResult } = useAIActions()

  const isConfigured = providers[activeProvider] !== null

  const quickActions = [
    {
      id: 'summarize',
      name: 'Summarize',
      icon: FileText,
      description: 'Create a concise summary',
      color: 'bg-blue-500 hover:bg-blue-600',
      enabled: enabledFeatures.some(f => f.id === 'summarize')
    },
    {
      id: 'translate',
      name: 'Translate',
      icon: Languages,
      description: 'Translate to English',
      color: 'bg-green-500 hover:bg-green-600',
      enabled: enabledFeatures.some(f => f.id === 'translate')
    },
    {
      id: 'explain',
      name: 'Explain',
      icon: Lightbulb,
      description: 'Get an explanation',
      color: 'bg-yellow-500 hover:bg-yellow-600',
      enabled: enabledFeatures.some(f => f.id === 'explain')
    },
    {
      id: 'analyze_sentiment',
      name: 'Sentiment',
      icon: BarChart3,
      description: 'Analyze sentiment',
      color: 'bg-purple-500 hover:bg-purple-600',
      enabled: enabledFeatures.some(f => f.id === 'analyze_sentiment')
    },
    {
      id: 'generate_email',
      name: 'Email',
      icon: Mail,
      description: 'Generate email',
      color: 'bg-red-500 hover:bg-red-600',
      enabled: enabledFeatures.some(f => f.id === 'generate_email')
    },
    {
      id: 'extract_keywords',
      name: 'Keywords',
      icon: Hash,
      description: 'Extract keywords',
      color: 'bg-indigo-500 hover:bg-indigo-600',
      enabled: enabledFeatures.some(f => f.id === 'extract_keywords')
    }
  ]

  const processWithAI = async (actionId: string) => {
    if (!isConfigured || !selectedText.trim() || isProcessing) return

    const providerConfig = providers[activeProvider]!
    setProcessingAction(actionId)

    try {
      const aiService = new AIService(providerConfig)
      let result: string

      switch (actionId) {
        case 'summarize':
          result = await aiService.summarizeText(selectedText, 200)
          break
        case 'translate':
          result = await aiService.translateText(selectedText, 'English')
          break
        case 'explain':
          result = await aiService.explainText(selectedText, 'simple')
          break
        case 'analyze_sentiment':
          result = await aiService.analyzeText(selectedText, 'sentiment')
          break
        case 'generate_email':
          result = await aiService.generateContent(selectedText, 'email')
          break
        case 'extract_keywords':
          result = await aiService.analyzeText(selectedText, 'keywords')
          break
        default:
          throw new Error(`Unknown action: ${actionId}`)
      }

      // Update results
      setResults(prev => ({ ...prev, [actionId]: result }))
      
      // Add to processing history
      const processingResult: AIProcessingResult = {
        id: `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        input: selectedText,
        output: result,
        feature: actionId,
        provider: activeProvider,
        model: providerConfig.model,
        usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 }, // Simplified for quick actions
        timestamp: Date.now(),
        success: true
      }
      addProcessingResult(processingResult)

      onResult?.(result)

    } catch (error: any) {
      const errorMessage = `Error: ${error.message || 'Processing failed'}`
      setResults(prev => ({ ...prev, [actionId]: errorMessage }))
      
      // Add error to history
      const processingResult: AIProcessingResult = {
        id: `quick_error_${Date.now()}`,
        input: selectedText,
        output: '',
        feature: actionId,
        provider: activeProvider,
        model: providerConfig.model,
        usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        timestamp: Date.now(),
        success: false,
        error: error.message
      }
      addProcessingResult(processingResult)

    } finally {
      setProcessingAction(null)
    }
  }

  const copyResult = async (actionId: string) => {
    const result = results[actionId]
    if (!result) return

    try {
      await navigator.clipboard.writeText(result)
      setCopiedAction(actionId)
      setTimeout(() => setCopiedAction(null), 2000)
    } catch (error) {
      console.error('Failed to copy result:', error)
    }
  }

  if (!selectedText.trim()) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <Lightbulb size={32} className="mx-auto mb-2 opacity-50" />
        <p>Select text to see AI quick actions</p>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-amber-700 dark:text-amber-300">
            ⚠️ Please configure your AI provider in settings to use quick actions
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
          AI Quick Actions
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Selected: "{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}"
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {quickActions
          .filter(action => action.enabled)
          .map((action) => {
            const Icon = action.icon
            const isProcessing = processingAction === action.id
            const hasResult = results[action.id]

            return (
              <button
                key={action.id}
                onClick={() => processWithAI(action.id)}
                disabled={isProcessing || processingAction !== null}
                className={`
                  relative p-3 rounded-lg text-white text-sm font-medium
                  transition-all duration-200 transform hover:scale-105
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  ${action.color}
                  ${hasResult ? 'ring-2 ring-green-300' : ''}
                `}
                title={action.description}
              >
                <div className="flex items-center gap-2">
                  {isProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Icon size={16} />
                  )}
                  <span>{action.name}</span>
                </div>
                
                {hasResult && !isProcessing && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </button>
            )
          })}
      </div>

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Results
          </h4>
          
          {Object.entries(results).map(([actionId, result]) => {
            const action = quickActions.find(a => a.id === actionId)
            const isCopied = copiedAction === actionId
            
            return (
              <div
                key={actionId}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {action && <action.icon size={14} />}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {action?.name}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => copyResult(actionId)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Copy result"
                  >
                    {isCopied ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} className="text-gray-500" />
                    )}
                  </button>
                </div>
                
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {result}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {processingAction && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">
              Processing with {activeProvider}...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}