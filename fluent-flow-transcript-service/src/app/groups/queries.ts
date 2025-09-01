import { supabase } from '../../lib/supabase/client'
import { StudyGroup } from './types'

export const fetchGroups = async (
  activeTab: 'my-groups' | 'public'
): Promise<StudyGroup[]> => {
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

  const response = await fetch(`/api/groups?type=${activeTab}`, {
    headers
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch groups')
  }

  const data = await response.json()
  return data.groups || []
}
