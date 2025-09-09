import { useQuery } from '@tanstack/react-query'
import { getAuthHeaders } from '@/lib/supabase/auth-utils'
import { Headphones, Search, Brain, Music, BookOpen, MessageSquare, Sparkles } from 'lucide-react'

export interface CustomPrompt {
  id: string
  name: string
  description?: string
  category: 'listening_comprehension' | 'detail_focused' | 'inference_implication' | 'tone_analysis' | 'vocabulary_context' | 'language_function' | 'general'
  system_prompt: string
  user_template: string
  config: {
    maxTokens?: number
    temperature?: number
  }
  is_active: boolean
  is_default: boolean
  created_at: string
  created_by: string
}

export interface CustomPromptPreset {
  id: string
  name: string
  description: string
  badge: string
  category: string
  system_prompt: string
  user_template: string
  config: {
    maxTokens?: number
    temperature?: number
  }
  icon: any // Will be set based on category
  textColor: string
  borderColor: string
  bgGradient: string
  hoverBg: string
  isCustom: true
  totalQuestions: number
  estimatedTime: string
  distribution: { easy: number; medium: number; hard: number }
}

// Category to visual mapping
const CATEGORY_STYLES = {
  listening_comprehension: {
    icon: Headphones,
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    bgGradient: 'from-blue-100 to-sky-100',
    hoverBg: 'hover:bg-blue-50',
    badge: '🎧 Listening'
  },
  detail_focused: {
    icon: Search,
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    bgGradient: 'from-green-100 to-emerald-100',
    hoverBg: 'hover:bg-green-50',
    badge: '🔍 Details'
  },
  inference_implication: {
    icon: Brain,
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    bgGradient: 'from-purple-100 to-violet-100',
    hoverBg: 'hover:bg-purple-50',
    badge: '🧠 Inference'
  },
  tone_analysis: {
    icon: Music,
    textColor: 'text-pink-700',
    borderColor: 'border-pink-300',
    bgGradient: 'from-pink-100 to-rose-100',
    hoverBg: 'hover:bg-pink-50',
    badge: '🎵 Tone'
  },
  vocabulary_context: {
    icon: BookOpen,
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300',
    bgGradient: 'from-indigo-100 to-blue-100',
    hoverBg: 'hover:bg-indigo-50',
    badge: '📚 Vocabulary'
  },
  language_function: {
    icon: MessageSquare,
    textColor: 'text-teal-700',
    borderColor: 'border-teal-300',
    bgGradient: 'from-teal-100 to-cyan-100',
    hoverBg: 'hover:bg-teal-50',
    badge: '💬 Function'
  },
  general: {
    icon: Sparkles,
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
    bgGradient: 'from-gray-100 to-slate-100',
    hoverBg: 'hover:bg-gray-50',
    badge: '⚡ General'
  }
}

const customPromptKeys = {
  active: () => ['custom-prompts', 'active'] as const,
}

/**
 * Hook to fetch active custom prompts for preset selection
 */
export function useActiveCustomPrompts() {
  return useQuery({
    queryKey: customPromptKeys.active(),
    queryFn: async (): Promise<CustomPrompt[]> => {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/custom-prompts?active_only=true', {
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to fetch custom prompts')
      }

      const data = await response.json()
      return data.prompts || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Convert custom prompts to preset format for UI consumption
 */
export function useCustomPromptPresets() {
  const { data: customPrompts = [], isLoading, error } = useActiveCustomPrompts()
  
  const customPresets: CustomPromptPreset[] = customPrompts.map(prompt => {
    const categoryStyle = CATEGORY_STYLES[prompt.category] || CATEGORY_STYLES.general
    
    return {
      id: `custom-${prompt.id}`,
      name: prompt.name,
      description: prompt.description || `Specialized ${prompt.category.replace('_', ' ')} questions`,
      badge: categoryStyle.badge,
      category: prompt.category,
      system_prompt: prompt.system_prompt,
      user_template: prompt.user_template,
      config: prompt.config,
      icon: categoryStyle.icon,
      textColor: categoryStyle.textColor,
      borderColor: categoryStyle.borderColor,
      bgGradient: categoryStyle.bgGradient,
      hoverBg: categoryStyle.hoverBg,
      isCustom: true,
      totalQuestions: 12, // Default total, can be customized
      estimatedTime: '8-12 min',
      distribution: { easy: 4, medium: 4, hard: 4 } // Balanced by default
    }
  })

  return {
    customPresets,
    isLoading,
    error
  }
}