import { supabase } from '../../../../../lib/supabase/client'

export interface SessionParticipant {
  user_id: string
  user_email: string
  username?: string
  avatar?: string
  joined_at: string
  is_online: boolean
  last_seen: string
}

export interface ParticipantsResponse {
  participants: SessionParticipant[]
  total: number
  online: number
}

export const fetchSessionParticipants = async (
  groupId: string, 
  sessionId: string
): Promise<ParticipantsResponse> => {
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

  const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/participants`, {
    headers
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch participants')
  }

  return await response.json()
}

export const joinSession = async (
  groupId: string,
  sessionId: string,
  userId: string
): Promise<void> => {
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

  const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to join session')
  }
}

export const leaveSession = async (
  groupId: string,
  sessionId: string,
  userId: string
): Promise<void> => {
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

  const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/leave`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to leave session')
  }
}