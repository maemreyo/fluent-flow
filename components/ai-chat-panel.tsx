// AI Chat Panel - Full-featured AI chat interface
// Modern chat UI with streaming support and conversation management

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Settings, Plus, Trash2, Copy, RefreshCw } from 'lucide-react'
import { useAIStore, useAIActions, useActiveConversation, useAIProviders } from '../lib/stores/ai-store'
import { AIService } from '../lib/services/ai-service'
import { marked } from 'marked'
import { formatDistanceToNow } from 'date-fns'
import type { ChatMessage } from '../lib/types'

interface AIChatPanelProps {
  className?: string
  selectedText?: string
  onClose?: () => void
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  className = '',
  selectedText = '',
  onClose
}) => {
  const [inputMessage, setInputMessage] = useState('')
  const [aiService, setAIService] = useState<AIService | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { conversations, isProcessing, streamingContent } = useAIStore()
  const { providers, activeProvider } = useAIProviders()
  const activeConversation = useActiveConversation()
  
  const {
    createConversation,
    deleteConversation,
    setActiveConversation,
    addMessage,
    updateConversation,
    startProcessing,
    stopProcessing,
    setStreamingContent,
    clearStreamingContent
  } = useAIActions()

  // Initialize AI service when provider changes
  useEffect(() => {
    const providerConfig = providers[activeProvider]
    if (providerConfig) {
      try {
        const service = new AIService(providerConfig)
        setAIService(service)
      } catch (error) {
        console.error('Failed to initialize AI service:', error)
      }
    }
  }, [providers, activeProvider])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages, streamingContent])

  // Pre-fill with selected text
  useEffect(() => {
    if (selectedText && !inputMessage) {
      setInputMessage(`Please help me with this text: "${selectedText}"`)
    }
  }, [selectedText])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !aiService || isProcessing) return

    let conversationId = activeConversation?.id
    
    // Create new conversation if none exists
    if (!conversationId) {
      conversationId = createConversation()
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    }

    addMessage(conversationId, userMessage)
    setInputMessage('')
    startProcessing()

    try {
      const messages = activeConversation?.messages || []
      const fullMessages = [...messages, userMessage]

      const response = await aiService.chat(fullMessages, {
        stream: false // We'll add streaming later
      })

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content
      }

      addMessage(conversationId, assistantMessage)
      
      // Update conversation title if it's the first exchange
      if (fullMessages.length <= 2) {
        const title = inputMessage.slice(0, 50) + (inputMessage.length > 50 ? '...' : '')
        updateConversation(conversationId, { title })
      }

    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ Error: ${error.message || 'Failed to get AI response'}`
      }
      addMessage(conversationId, errorMessage)
    } finally {
      stopProcessing()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user'
    const isAssistant = message.role === 'assistant'
    
    return (
      <div
        key={index}
        className={`flex gap-3 p-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {isAssistant && (
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
          <div
            className={`p-3 rounded-lg ${
              isUser
                ? 'bg-blue-500 text-white ml-auto'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
          >
            {isAssistant && message.content.includes('```') ? (
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: String(typeof marked.parse === 'function' ? marked.parse(message.content) : marked(message.content))
                }}
              />
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            {message.timestamp && (
              <span>
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </span>
            )}
            
            {isAssistant && (
              <button
                onClick={() => copyToClipboard(message.content)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title="Copy message"
              >
                <Copy size={12} />
              </button>
            )}
          </div>
        </div>

        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Bot className="text-blue-500" size={24} />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              AI Assistant
            </h2>
            <p className="text-xs text-gray-500">
              {activeProvider} • {providers[activeProvider]?.model || 'No model'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => createConversation()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="New conversation"
          >
            <Plus size={16} />
          </button>
          
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      {conversations.length > 1 && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto">
            {conversations.slice(0, 5).map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`flex-shrink-0 px-3 py-1 text-xs rounded-lg truncate max-w-32 ${
                  activeConversation?.id === conv.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {conv.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {!activeConversation || activeConversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <div className="max-w-sm">
              <Bot size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                Start a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Ask me anything! I can help with text analysis, summarization, translation, and more.
              </p>
              {selectedText && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Selected text ready to analyze
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pb-4">
            {activeConversation.messages.map(renderMessage)}
            
            {/* Streaming content */}
            {isProcessing && streamingContent && (
              <div className="flex gap-3 p-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="max-w-[80%]">
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <div className="whitespace-pre-wrap">{streamingContent}</div>
                    <div className="mt-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading indicator */}
            {isProcessing && !streamingContent && (
              <div className="flex gap-3 p-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <RefreshCw size={16} className="text-white animate-spin" />
                </div>
                <div className="flex items-center text-gray-500">
                  AI is thinking...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
            disabled={isProcessing}
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing || !aiService}
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        
        {!providers[activeProvider] && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Please configure your AI provider in settings
          </p>
        )}
      </div>
    </div>
  )
}