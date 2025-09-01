// Simple HTTP-based groups service that uses existing API routes
// This avoids TypeScript issues and maintains consistency with server.ts authentication

export interface Group {
  id: string
  name: string
  description: string | null
  is_private: boolean
  member_count: number
  role: string
  created_at: string
}

export class GroupsService {
  constructor(private baseUrl: string = '') {
    if (!this.baseUrl && typeof window !== 'undefined') {
      this.baseUrl = window.location.origin
    }
  }

  async getUserGroups(authToken?: string): Promise<{ groups: Group[]; total: number }> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${this.baseUrl}/api/user/groups`, {
      headers
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Failed to fetch groups (${response.status})`)
    }

    return await response.json()
  }

  async sendInvitations(groupId: string, emails: string[], message?: string, authToken?: string): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${this.baseUrl}/api/groups/${groupId}/invite`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ emails, message })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Failed to send invitations (${response.status})`)
    }

    return await response.json()
  }

  async getGroupSessions(groupId: string, authToken?: string): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${this.baseUrl}/api/groups/${groupId}/sessions`, {
      headers
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Failed to fetch sessions (${response.status})`)
    }

    return await response.json()
  }

  async updateSession(groupId: string, sessionId: string, updates: any, authToken?: string): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${this.baseUrl}/api/groups/${groupId}/sessions/${sessionId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Failed to update session (${response.status})`)
    }

    return await response.json()
  }
}