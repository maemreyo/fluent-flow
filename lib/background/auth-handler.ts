/**
 * Authentication Handler for Background Script
 * Handles Supabase authentication in the background context
 */

import type { User } from '@supabase/supabase-js'
import { getCurrentUser, signOut, supabase } from '../supabase/client'

interface AuthState {
  user: User | null
  session: any
  isAuthenticated: boolean
  lastCheck: number
}

class AuthHandler {
  private authState: AuthState = {
    user: null,
    session: null,
    isAuthenticated: false,
    lastCheck: 0
  }

  private authListeners: Set<Function> = new Set()

  constructor() {
    this.initializeAuth()
    this.setupAuthStateListener()
  }

  /**
   * Initialize authentication state
   */
  private async initializeAuth() {
    try {
      const user = await getCurrentUser()
      await this.updateAuthState(user)
      console.log('Auth initialized:', user ? `User: ${user.email}` : 'No user signed in')
    } catch (error) {
      console.error('Error initializing auth:', error)
      await this.updateAuthState(null)
    }
  }

  /**
   * Set up real-time authentication state listener
   */
  private setupAuthStateListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      const userInfo = session?.user ? `${session.user.email}` : 'No user'
      console.log(`Auth state changed: ${event} - ${userInfo}`)

      await this.updateAuthState(session?.user ?? null)

      // Notify all listeners
      this.authListeners.forEach(callback => {
        try {
          callback(this.authState)
        } catch (error) {
          console.error('Error in auth listener callback:', error)
        }
      })
    })
  }

  /**
   * Update authentication state and persist to storage
   */
  private async updateAuthState(user: User | null) {
    this.authState = {
      user,
      session: user ? await supabase.auth.getSession() : null,
      isAuthenticated: !!user,
      lastCheck: Date.now()
    }

    // Store auth state in chrome.storage for other parts of extension
    try {
      await chrome.storage.local.set({
        fluent_flow_auth: {
          isAuthenticated: this.authState.isAuthenticated,
          userId: user?.id || null,
          userEmail: user?.email || null,
          lastCheck: this.authState.lastCheck
        }
      })
    } catch (error) {
      console.error('Error storing auth state:', error)
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.authState.user
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut()
      await this.updateAuthState(null)
      return { success: true }
    } catch (error) {
      console.error('Error signing out:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Refresh authentication state
   */
  async refreshAuthState(): Promise<AuthState> {
    try {
      const user = await getCurrentUser()
      await this.updateAuthState(user)
      console.debug('Auth state refreshed:', user ? `User: ${user.email}` : 'No user signed in')
      return this.getAuthState()
    } catch (error) {
      console.error('Error refreshing auth state:', error)
      await this.updateAuthState(null)
      return this.getAuthState()
    }
  }

  /**
   * Add authentication state listener
   */
  addAuthListener(callback: (authState: AuthState) => void) {
    this.authListeners.add(callback)

    // Immediately call with current state
    try {
      callback(this.authState)
    } catch (error) {
      console.error('Error in auth listener callback:', error)
    }

    return () => this.authListeners.delete(callback)
  }

  /**
   * Handle authentication messages from UI
   */
  async handleAuthMessage(message: any): Promise<any> {
    switch (message.type) {
      case 'GET_AUTH_STATE':
        return {
          success: true,
          data: this.getAuthState()
        }

      case 'REFRESH_AUTH':
        const refreshedState = await this.refreshAuthState()
        return {
          success: true,
          data: refreshedState
        }

      case 'USER_LOGOUT':
        const logoutResult = await this.signOut()
        return logoutResult

      case 'CHECK_AUTH_STATUS':
        // Quick check without refresh
        return {
          success: true,
          data: {
            isAuthenticated: this.isAuthenticated(),
            user: this.getCurrentUser()
          }
        }

      default:
        return {
          success: false,
          error: 'Unknown auth message type'
        }
    }
  }
}

// Singleton instance
let authHandlerInstance: AuthHandler | null = null

export const getAuthHandler = (): AuthHandler => {
  if (!authHandlerInstance) {
    authHandlerInstance = new AuthHandler()
  }
  return authHandlerInstance
}

// Export for use in background.ts
export default getAuthHandler
