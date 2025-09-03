import { supabase } from '../../../../../lib/supabase/client'

export interface GroupSession {
  id: string
  quiz_title: string
  video_title?: string
  video_url?: string
  scheduled_at?: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  quiz_token: string
  created_by: string
  questions_data?: any
  created_at: string
  started_at?: string
  ended_at?: string
}

export interface Group {
  id: string
  name: string
  description?: string
  language: string
  level: string
  is_private: boolean
  max_members?: number
  member_count: number
}

export interface GroupQuizResult {
  id: string
  session_id: string
  user_id: string
  score: number
  total_questions: number
  time_taken: number
  answers_data: any
  completed_at: string
  user_email: string
  username?: string
}

export const fetchGroupSession = async (
  groupId: string,
  sessionId: string
): Promise<GroupSession> => {
  if (!supabase) {
    throw new Error('Supabase client is not available')
  }

  const {
    data: { session }
  } = await supabase.auth.getSession()
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}`, {
    headers
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch group session')
  }

  const data = await response.json()
  return data.session
}

export const fetchGroup = async (groupId: string): Promise<Group> => {
  if (!supabase) {
    throw new Error('Supabase client is not available')
  }

  const {
    data: { session }
  } = await supabase.auth.getSession()
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`/api/groups/${groupId}`, {
    headers
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch group')
  }

  const data = await response.json()
  return data.group
}

export const submitGroupQuizResults = async (
  groupId: string,
  sessionId: string,
  resultsData: any
): Promise<any> => {
  if (!supabase) {
    throw new Error('Supabase client is not available')
  }

  const {
    data: { session }
  } = await supabase.auth.getSession()
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(resultsData)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to submit group quiz results')
  }

  return await response.json()
}

export const fetchGroupResults = async (
  groupId: string,
  sessionId: string
): Promise<GroupQuizResult[]> => {
  if (!supabase) {
    throw new Error('Supabase client is not available')
  }

  const {
    data: { session }
  } = await supabase.auth.getSession()
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/results`, {
    headers
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch group results')
  }

  const data = await response.json()
  return data.results || []
}