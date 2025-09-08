import { getAuthHeaders } from '../supabase/auth-utils'

export interface SessionsServiceOptions {
  groupId: string
}

export interface BulkDeleteRequest {
  sessionIds: string[]
}

export interface BulkDeleteResult {
  success: boolean
  message: string
  deletedSessions: Array<{
    id: string
    name: string
    status: string
    createdAt: string
  }>
  summary: {
    totalDeleted: number
    cascadeDeletes: string[]
    preserved: string[]
  }
}

export class SessionsService {
  private groupId: string

  constructor(options: SessionsServiceOptions) {
    this.groupId = options.groupId
  }

  async bulkDeleteSessions(sessionIds: string[]): Promise<BulkDeleteResult> {
    if (!sessionIds || sessionIds.length === 0) {
      throw new Error('No sessions selected for deletion')
    }

    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`/api/groups/${this.groupId}/sessions/bulk-delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionIds })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete sessions')
      }

      return result
    } catch (error) {
      console.error('Bulk delete service error:', error)
      throw error
    }
  }

  async approveSession(sessionId: string): Promise<void> {
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`/api/groups/${this.groupId}/sessions/${sessionId}/approve`, {
        method: 'POST',
        headers
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve session')
      }
    } catch (error) {
      console.error('Approve session service error:', error)
      throw error
    }
  }

  async rejectSession(sessionId: string): Promise<void> {
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`/api/groups/${this.groupId}/sessions/${sessionId}/reject`, {
        method: 'POST',
        headers
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject session')
      }
    } catch (error) {
      console.error('Reject session service error:', error)
      throw error
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`/api/groups/${this.groupId}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete session')
      }
    } catch (error) {
      console.error('Delete session service error:', error)
      throw error
    }
  }
}