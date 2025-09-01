import { supabase } from '../../../lib/supabase/client'
import { StudyGroup } from './types'

export const fetchGroup = async (groupId: string): Promise<StudyGroup> => {
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
