import { useState, useEffect } from 'react'
import { useQuizAuth } from '../lib/hooks/use-quiz-auth'
import { supabase } from '../lib/supabase/client'

interface GroupSession {
  id: string
  title: string
  video_title?: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  session_type: 'instant' | 'scheduled' | 'recurring'
  scheduled_at?: string
  started_at?: string
  ended_at?: string
  created_by: string
  created_at: string
  share_token?: string
  participant_count: number
  questions_count: number
}

interface SessionParticipant {
  user_id: string
  joined_at: string
  completed_at?: string
  score?: number
}

interface SessionDetails extends GroupSession {
  share_url?: string
  questions_data?: any
  loop_data?: any
  participants: SessionParticipant[]
  canJoin: boolean
}

export function useGroupSessions(groupId: string) {
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [loading, setLoading] = useState(true) // Start with loading true
  const [error, setError] = useState<string | null>(null)
  const { user, isAuthenticated } = useQuizAuth()

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } }
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    
    return headers
  }

  const fetchSessions = async (status?: string) => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const url = new URL(`/api/groups/${groupId}/sessions`, window.location.origin)
      if (status) url.searchParams.set('status', status)

      const response = await fetch(url.toString(), {
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  const createSession = async (sessionData: {
    title: string
    description?: string
    scheduledAt?: string
    questions?: any
    shareToken?: string
    loop?: any
    notifyMembers?: boolean
    sessionType?: 'instant' | 'scheduled'
  }) => {
    if (!isAuthenticated) throw new Error('Not authenticated')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/groups/${groupId}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sessionData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create session')
    }

    const result = await response.json()
    
    // Refresh sessions list
    fetchSessions()
    
    return result.session
  }

  const getSessionDetails = async (sessionId: string): Promise<SessionDetails> => {
    if (!isAuthenticated) throw new Error('Not authenticated')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}`, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch session details')
    }

    const data = await response.json()
    return data.session
  }

  const updateSession = async (sessionId: string, updates: {
    scheduledAt?: string
    status?: 'scheduled' | 'active' | 'completed' | 'cancelled'
    title?: string
  }) => {
    if (!isAuthenticated) throw new Error('Not authenticated')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update session')
    }

    // Refresh sessions list
    fetchSessions()
    
    return await response.json()
  }

  const deleteSession = async (sessionId: string) => {
    if (!isAuthenticated) throw new Error('Not authenticated')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete session')
    }

    // Refresh sessions list
    fetchSessions()
    
    return await response.json()
  }

  useEffect(() => {
    if (groupId && isAuthenticated) {
      fetchSessions()
    }
  }, [groupId, isAuthenticated])

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    getSessionDetails,
    updateSession,
    deleteSession,
    refetch: () => fetchSessions()
  }
}