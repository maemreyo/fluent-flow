'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAuthHeaders } from '@/lib/supabase/auth-utils'

interface CustomPrompt {
  id: string
  name: string
  description?: string
  category: string
  system_prompt?: string
  user_template?: string
  config?: {
    maxTokens?: number
    temperature?: number
  }
  is_active: boolean
  is_default: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

interface CreatePromptData {
  name: string
  description?: string
  category: string
  system_prompt: string
  user_template: string
  config?: Record<string, any>
  is_active?: boolean
}

interface UpdatePromptData {
  name?: string
  description?: string
  category?: string
  system_prompt?: string
  user_template?: string
  config?: Record<string, any>
  is_active?: boolean
  is_default?: boolean
}

// Query keys
const promptKeys = {
  all: ['prompts'] as const,
  admin: () => [...promptKeys.all, 'admin'] as const,
  public: () => [...promptKeys.all, 'public'] as const,
  detail: (id: string) => [...promptKeys.all, 'detail', id] as const,
}

// Fetch all prompts (admin endpoint)
export function useAdminPrompts() {
  return useQuery({
    queryKey: promptKeys.admin(),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/prompts', { headers })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch prompts: ${response.status}`)
      }
      
      const data = await response.json()
      return data.prompts as CustomPrompt[]
    },
  })
}

// Fetch single prompt details (admin endpoint)
export function usePromptDetail(id: string) {
  return useQuery({
    queryKey: promptKeys.detail(id),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/prompts/${id}`, { headers })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch prompt: ${response.status}`)
      }
      
      const data = await response.json()
      return data.prompt as CustomPrompt
    },
    enabled: !!id,
  })
}

// Create new prompt
export function useCreatePrompt() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreatePromptData) => {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create prompt')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.admin() })
    },
  })
}

// Update prompt
export function useUpdatePrompt() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePromptData }) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/prompts/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update prompt')
      }
      
      return response.json()
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.admin() })
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(id) })
    },
  })
}

// Delete prompt
export function useDeletePrompt() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/prompts/${id}`, {
        method: 'DELETE',
        headers,
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete prompt')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.admin() })
    },
  })
}

// Toggle prompt active status
export function useTogglePromptStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/prompts/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to toggle prompt status')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.admin() })
    },
  })
}

// Toggle default prompt
export function useToggleDefaultPrompt() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, is_default }: { id: string; is_default: boolean }) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/prompts/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_default }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set default prompt')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.admin() })
    },
  })
}

// Fetch public prompts (for users)
export function usePublicPrompts() {
  return useQuery({
    queryKey: promptKeys.public(),
    queryFn: async () => {
      const response = await fetch('/api/prompts')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch prompts: ${response.status}`)
      }
      
      const data = await response.json()
      return data.prompts
    },
  })
}