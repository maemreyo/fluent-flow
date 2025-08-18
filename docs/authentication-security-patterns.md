# Authentication & Security Patterns for Chrome Extensions

Hướng dẫn chi tiết về authentication, authorization và security practices cho Chrome Extension với backend integration.

## 1. Multi-layer Authentication Architecture

### 1.1 Tổng quan Security Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ Chrome Extension (Client Layer)                             │
│ ├── Content Scripts (No sensitive data)                    │
│ ├── Background Scripts (API keys, tokens)                  │
│ ├── Popup/UI (Session tokens only)                         │
│ └── Chrome Storage (Encrypted sensitive data)              │
├─────────────────────────────────────────────────────────────┤
│ API Proxy Layer (Authentication Gateway)                   │
│ ├── API Key Authentication                                 │
│ ├── Rate Limiting & Quota Management                       │
│ ├── Request Validation & Sanitization                      │
│ └── External Service Integration                           │
├─────────────────────────────────────────────────────────────┤
│ Supabase Backend (Identity & Authorization)                │
│ ├── Supabase Auth (JWT tokens)                            │
│ ├── Row Level Security (RLS)                              │
│ ├── Service Key Operations                                 │
│ └── Session Management                                     │
├─────────────────────────────────────────────────────────────┤
│ Dashboard (Web Authentication)                             │
│ ├── Email/Password Authentication                          │
│ ├── OAuth Providers (Google, GitHub)                       │
│ ├── Session Management                                     │
│ └── Multi-factor Authentication                            │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Authentication Flow Patterns
```
1. Extension Registration → API Key Generation → Local Storage (Encrypted)
2. Dashboard Login → JWT Token → Extension Sync → Cross-platform Access
3. OAuth Flow → Token Exchange → Extension Authorization
4. Session Refresh → Background Renewal → Seamless UX
```

## 2. Extension Authentication Patterns

### 2.1 API Key Management
```typescript
// lib/auth/api-key-manager.ts
export class ApiKeyManager {
  private readonly STORAGE_KEY = 'encrypted_api_key'
  private readonly ENCRYPTION_KEY_STORAGE = 'encryption_key'
  
  async generateApiKey(userId: string): Promise<string> {
    // Generate secure API key
    const apiKey = await this.createSecureApiKey(userId)
    
    // Store in Supabase
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        api_key: apiKey,
        api_key_created_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) throw new Error('Failed to store API key')

    // Store encrypted in extension
    await this.storeEncryptedApiKey(apiKey)
    
    return apiKey
  }

  private async createSecureApiKey(userId: string): Promise<string> {
    // Format: ww_live_<version>_<userId_hash>_<random>
    const prefix = 'ww_live_v1'
    const userHash = await this.hashUserId(userId)
    const randomBytes = new Uint8Array(16)
    crypto.getRandomValues(randomBytes)
    const randomPart = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('')
    
    return `${prefix}_${userHash}_${randomPart}`
  }

  async storeEncryptedApiKey(apiKey: string): Promise<void> {
    try {
      const encryptionKey = await this.getOrCreateEncryptionKey()
      const encryptedKey = await this.encryptData(apiKey, encryptionKey)
      
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: encryptedKey
      })
    } catch (error) {
      console.error('Failed to store encrypted API key:', error)
      throw new Error('Failed to secure API key')
    }
  }

  async getApiKey(): Promise<string | null> {
    try {
      const stored = await chrome.storage.local.get(this.STORAGE_KEY)
      if (!stored[this.STORAGE_KEY]) return null

      const encryptionKey = await this.getOrCreateEncryptionKey()
      const decryptedKey = await this.decryptData(stored[this.STORAGE_KEY], encryptionKey)
      
      // Validate API key format
      if (!this.isValidApiKeyFormat(decryptedKey)) {
        await this.clearStoredApiKey()
        return null
      }

      return decryptedKey
    } catch (error) {
      console.error('Failed to retrieve API key:', error)
      return null
    }
  }

  async rotateApiKey(userId: string): Promise<string> {
    // Invalidate old key
    await this.invalidateCurrentApiKey()
    
    // Generate new key
    const newApiKey = await this.generateApiKey(userId)
    
    // Log rotation for security audit
    await this.logApiKeyRotation(userId)
    
    return newApiKey
  }

  private async getOrCreateEncryptionKey(): Promise<CryptoKey> {
    const stored = await chrome.storage.local.get(this.ENCRYPTION_KEY_STORAGE)
    
    if (stored[this.ENCRYPTION_KEY_STORAGE]) {
      return await crypto.subtle.importKey(
        'raw',
        new Uint8Array(stored[this.ENCRYPTION_KEY_STORAGE]),
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
      )
    }

    // Generate new encryption key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    const exportedKey = await crypto.subtle.exportKey('raw', key)
    await chrome.storage.local.set({
      [this.ENCRYPTION_KEY_STORAGE]: Array.from(new Uint8Array(exportedKey))
    })

    return key
  }

  private async encryptData(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    )

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedBuffer), iv.length)

    return btoa(String.fromCharCode(...combined))
  }

  private async decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    )

    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  }

  private isValidApiKeyFormat(apiKey: string): boolean {
    const pattern = /^ww_live_v\d+_[a-f0-9]{16}_[a-f0-9]{32}$/
    return pattern.test(apiKey)
  }
}
```

### 2.2 Session Management
```typescript
// lib/auth/session-manager.ts
export class SessionManager {
  private sessionToken: string | null = null
  private refreshToken: string | null = null
  private tokenExpiry: number | null = null
  private refreshTimeout: number | null = null

  async initialize(): Promise<void> {
    await this.loadStoredSession()
    
    if (this.sessionToken && this.isTokenExpired()) {
      await this.refreshSession()
    }

    this.scheduleTokenRefresh()
  }

  async authenticateWithDashboard(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw new Error(error.message)

      await this.storeSession(data.session)
      this.scheduleTokenRefresh()

      return {
        success: true,
        user: data.user,
        session: data.session
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async linkExtensionToAccount(dashboardSession: Session): Promise<void> {
    try {
      const apiKeyManager = new ApiKeyManager()
      const apiKey = await apiKeyManager.generateApiKey(dashboardSession.user.id)

      // Link extension API key to dashboard account
      await this.linkApiKeyToSession(apiKey, dashboardSession)

      // Store session for cross-platform access
      await this.storeSession(dashboardSession)

    } catch (error) {
      console.error('Failed to link extension to account:', error)
      throw new Error('Account linking failed')
    }
  }

  async getValidSession(): Promise<Session | null> {
    if (!this.sessionToken) {
      await this.loadStoredSession()
    }

    if (!this.sessionToken) {
      return null
    }

    if (this.isTokenExpired()) {
      const refreshed = await this.refreshSession()
      if (!refreshed) return null
    }

    return this.getCurrentSession()
  }

  private async refreshSession(): Promise<boolean> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available')
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: this.refreshToken
      })

      if (error) throw error

      await this.storeSession(data.session)
      this.scheduleTokenRefresh()

      return true
    } catch (error) {
      console.error('Session refresh failed:', error)
      await this.clearSession()
      return false
    }
  }

  private async storeSession(session: Session): Promise<void> {
    this.sessionToken = session.access_token
    this.refreshToken = session.refresh_token
    this.tokenExpiry = new Date(session.expires_at! * 1000).getTime()

    // Store encrypted session data
    const encryptedSession = await this.encryptSessionData({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user
    })

    await chrome.storage.local.set({
      encrypted_session: encryptedSession
    })
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout)
    }

    if (!this.tokenExpiry) return

    // Refresh 5 minutes before expiration
    const refreshTime = this.tokenExpiry - Date.now() - (5 * 60 * 1000)
    
    if (refreshTime > 0) {
      this.refreshTimeout = window.setTimeout(() => {
        this.refreshSession()
      }, refreshTime)
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true
    return Date.now() >= this.tokenExpiry
  }

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      await this.clearSession()
    }
  }

  private async clearSession(): Promise<void> {
    this.sessionToken = null
    this.refreshToken = null
    this.tokenExpiry = null

    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout)
      this.refreshTimeout = null
    }

    await chrome.storage.local.remove(['encrypted_session'])
  }
}
```

### 2.3 Cross-Origin Authentication
```typescript
// lib/auth/cross-origin-auth.ts
export class CrossOriginAuthManager {
  private readonly DASHBOARD_ORIGIN = 'https://dashboard.wordwizard.app'
  private readonly AUTH_CHANNEL = 'word-wizard-auth'

  async initializeCrossOriginAuth(): Promise<void> {
    // Listen for auth messages from dashboard
    chrome.runtime.onMessage.addListener(this.handleAuthMessage.bind(this))
    
    // Listen for dashboard window messages
    window.addEventListener('message', this.handleDashboardMessage.bind(this))
  }

  async requestDashboardAuth(): Promise<AuthResult> {
    return new Promise((resolve, reject) => {
      // Open dashboard auth popup
      const authWindow = window.open(
        `${this.DASHBOARD_ORIGIN}/auth/extension-link`,
        'dashboard-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      // Listen for auth completion
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== this.DASHBOARD_ORIGIN) return

        if (event.data.type === 'AUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler)
          authWindow?.close()
          resolve({
            success: true,
            session: event.data.session,
            user: event.data.user
          })
        } else if (event.data.type === 'AUTH_ERROR') {
          window.removeEventListener('message', messageHandler)
          authWindow?.close()
          reject(new Error(event.data.error))
        }
      }

      window.addEventListener('message', messageHandler)

      // Handle popup blocked or closed
      setTimeout(() => {
        if (authWindow?.closed) {
          window.removeEventListener('message', messageHandler)
          reject(new Error('Authentication cancelled'))
        }
      }, 1000)
    })
  }

  private handleAuthMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    switch (message.type) {
      case 'EXTENSION_AUTH_REQUEST':
        this.handleExtensionAuthRequest(message, sendResponse)
        return true

      case 'DASHBOARD_AUTH_SYNC':
        this.handleDashboardAuthSync(message, sendResponse)
        return true
    }
  }

  private async handleExtensionAuthRequest(
    message: any,
    sendResponse: (response?: any) => void
  ) {
    try {
      const sessionManager = new SessionManager()
      const session = await sessionManager.getValidSession()

      if (session) {
        sendResponse({
          success: true,
          authenticated: true,
          user: session.user
        })
      } else {
        sendResponse({
          success: true,
          authenticated: false
        })
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      })
    }
  }

  private async handleDashboardAuthSync(
    message: any,
    sendResponse: (response?: any) => void
  ) {
    try {
      const sessionManager = new SessionManager()
      await sessionManager.linkExtensionToAccount(message.session)

      sendResponse({ success: true })
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      })
    }
  }
}
```

## 3. Dashboard Authentication Integration

### 3.1 Supabase Auth Setup
```typescript
// lib/auth/dashboard-auth.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export class DashboardAuth {
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async signUp(email: string, password: string, metadata?: any): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata?.fullName || '',
            ...metadata
          }
        }
      })

      if (error) throw error

      // Create user profile
      if (data.user) {
        await this.createUserProfile(data.user)
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Update last login
      if (data.user) {
        await this.updateLastLogin(data.user.id)
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async signInWithOAuth(provider: 'google' | 'github'): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async generateExtensionApiKey(): Promise<string> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const apiKeyManager = new ApiKeyManager()
    return await apiKeyManager.generateApiKey(user.id)
  }

  private async createUserProfile(user: any): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        subscription_status: 'free'
      })

    if (error && error.code !== '23505') { // Ignore unique constraint violation
      console.error('Failed to create user profile:', error)
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.supabase
      .from('user_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId)
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback)
  }
}
```

### 3.2 Protected Route Middleware
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes
  const protectedPaths = [
    '/dashboard',
    '/settings', 
    '/integrations',
    '/api/vocabulary',
    '/api/notion',
    '/api/analytics'
  ]

  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath) {
    if (!session) {
      // Redirect to login for web routes
      if (!req.nextUrl.pathname.startsWith('/api/')) {
        const redirectUrl = new URL('/auth/login', req.url)
        redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Return 401 for API routes
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check API key for extension requests
    if (req.nextUrl.pathname.startsWith('/api/')) {
      const apiKey = req.headers.get('x-api-key')
      
      if (apiKey && apiKey.startsWith('ww_live_')) {
        // Validate API key
        const isValid = await validateApiKey(apiKey, session.user.id)
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401 }
          )
        }
      }
    }
  }

  return res
}

async function validateApiKey(apiKey: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('api_key')
      .eq('id', userId)
      .eq('api_key', apiKey)
      .single()

    return !error && !!data
  } catch {
    return false
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/integrations/:path*',
    '/api/:path*'
  ]
}
```

## 4. Row Level Security (RLS) Implementation

### 4.1 Database Security Policies
```sql
-- Enable RLS on all user tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" 
    ON user_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON user_profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- RLS Policies for API usage tracking
CREATE POLICY "Users can view own API usage" 
    ON api_usage FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Service can insert API usage" 
    ON api_usage FOR INSERT 
    WITH CHECK (true); -- Service role can insert for any user

-- RLS Policies for vocabulary analytics
CREATE POLICY "Users can manage own vocabulary analytics" 
    ON vocabulary_analytics FOR ALL 
    USING (auth.uid() = user_id);

-- RLS Policies for Notion integrations
CREATE POLICY "Users can manage own Notion integrations" 
    ON notion_integrations FOR ALL 
    USING (auth.uid() = user_id);

-- RLS Policies for learning sessions
CREATE POLICY "Users can view own learning sessions" 
    ON learning_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own learning sessions" 
    ON learning_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Function to validate API key ownership
CREATE OR REPLACE FUNCTION validate_api_key_owner(api_key TEXT)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id 
    FROM user_profiles 
    WHERE user_profiles.api_key = validate_api_key_owner.api_key;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for API key based access
CREATE POLICY "API key owners can access their data" 
    ON vocabulary_analytics FOR ALL 
    USING (user_id = validate_api_key_owner(current_setting('request.headers.x-api-key', true)));
```

### 4.2 Server-side Security Validation
```typescript
// lib/security/api-validation.ts
import { createServerSupabaseClient } from '@/lib/supabase'
import { headers } from 'next/headers'

export class ApiSecurityValidator {
  private supabase = createServerSupabaseClient()

  async validateRequest(request: NextRequest): Promise<ValidationResult> {
    const apiKey = request.headers.get('x-api-key')
    const authHeader = request.headers.get('authorization')

    // Check for authentication
    if (!apiKey && !authHeader) {
      return {
        valid: false,
        error: 'Authentication required',
        status: 401
      }
    }

    // Validate API key
    if (apiKey) {
      return await this.validateApiKey(apiKey)
    }

    // Validate JWT token
    if (authHeader) {
      return await this.validateJwtToken(authHeader)
    }

    return {
      valid: false,
      error: 'Invalid authentication method',
      status: 401
    }
  }

  private async validateApiKey(apiKey: string): Promise<ValidationResult> {
    // Check API key format
    if (!this.isValidApiKeyFormat(apiKey)) {
      return {
        valid: false,
        error: 'Invalid API key format',
        status: 401
      }
    }

    try {
      // Get user by API key
      const { data: profile, error } = await this.supabase
        .from('user_profiles')
        .select('id, email, subscription_status, api_key_created_at')
        .eq('api_key', apiKey)
        .single()

      if (error || !profile) {
        return {
          valid: false,
          error: 'Invalid API key',
          status: 401
        }
      }

      // Check if API key is expired (optional)
      if (this.isApiKeyExpired(profile.api_key_created_at)) {
        return {
          valid: false,
          error: 'API key expired',
          status: 401
        }
      }

      // Check rate limits
      const rateLimitResult = await this.checkRateLimit(profile.id)
      if (!rateLimitResult.allowed) {
        return {
          valid: false,
          error: 'Rate limit exceeded',
          status: 429,
          retryAfter: rateLimitResult.retryAfter
        }
      }

      return {
        valid: true,
        userId: profile.id,
        subscriptionStatus: profile.subscription_status
      }

    } catch (error) {
      console.error('API key validation error:', error)
      return {
        valid: false,
        error: 'Authentication failed',
        status: 500
      }
    }
  }

  private async validateJwtToken(authHeader: string): Promise<ValidationResult> {
    try {
      const token = authHeader.replace('Bearer ', '')
      
      const { data: { user }, error } = await this.supabase.auth.getUser(token)

      if (error || !user) {
        return {
          valid: false,
          error: 'Invalid token',
          status: 401
        }
      }

      return {
        valid: true,
        userId: user.id,
        user
      }

    } catch (error) {
      return {
        valid: false,
        error: 'Token validation failed',
        status: 401
      }
    }
  }

  private isValidApiKeyFormat(apiKey: string): boolean {
    const pattern = /^ww_live_v\d+_[a-f0-9]{16}_[a-f0-9]{32}$/
    return pattern.test(apiKey)
  }

  private isApiKeyExpired(createdAt: string): boolean {
    // API keys expire after 1 year
    const oneYear = 365 * 24 * 60 * 60 * 1000
    const created = new Date(createdAt).getTime()
    return Date.now() - created > oneYear
  }

  private async checkRateLimit(userId: string): Promise<RateLimitResult> {
    const now = Date.now()
    const hourAgo = now - (60 * 60 * 1000)

    // Check requests in last hour
    const { count, error } = await this.supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(hourAgo).toISOString())

    if (error) {
      console.error('Rate limit check error:', error)
      return { allowed: true } // Fail open
    }

    const requestCount = count || 0
    const limit = 1000 // requests per hour

    return {
      allowed: requestCount < limit,
      remaining: Math.max(0, limit - requestCount),
      retryAfter: requestCount >= limit ? 3600 : undefined
    }
  }
}

// Usage in API routes
export async function withApiValidation(
  handler: (req: NextRequest, validation: ValidationResult) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const validator = new ApiSecurityValidator()
    const validation = await validator.validateRequest(req)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      )
    }

    return handler(req, validation)
  }
}
```

## 5. Security Best Practices

### 5.1 Data Encryption Patterns
```typescript
// lib/security/encryption.ts
export class EncryptionService {
  private readonly ALGORITHM = 'AES-GCM'
  private readonly KEY_LENGTH = 256

  async generateEncryptionKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    )
  }

  async encryptSensitiveData(
    data: string, 
    key: CryptoKey
  ): Promise<EncryptedData> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      dataBuffer
    )

    return {
      encrypted: Array.from(new Uint8Array(encryptedBuffer)),
      iv: Array.from(iv),
      algorithm: this.ALGORITHM
    }
  }

  async decryptSensitiveData(
    encryptedData: EncryptedData,
    key: CryptoKey
  ): Promise<string> {
    const iv = new Uint8Array(encryptedData.iv)
    const encrypted = new Uint8Array(encryptedData.encrypted)

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      key,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  }

  async hashPassword(password: string, salt?: Uint8Array): Promise<HashedPassword> {
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16))
    }

    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    const exported = await crypto.subtle.exportKey('raw', key)

    return {
      hash: Array.from(new Uint8Array(exported)),
      salt: Array.from(salt),
      iterations: 100000
    }
  }

  async verifyPassword(
    password: string, 
    hashedPassword: HashedPassword
  ): Promise<boolean> {
    const newHash = await this.hashPassword(
      password, 
      new Uint8Array(hashedPassword.salt)
    )

    return this.constantTimeCompare(newHash.hash, hashedPassword.hash)
  }

  private constantTimeCompare(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i]
    }

    return result === 0
  }
}
```

### 5.2 Input Sanitization và Validation
```typescript
// lib/security/input-validation.ts
import { z } from 'zod'

export class InputValidator {
  // Schema definitions
  private readonly vocabularySchema = z.object({
    term: z.string().min(1).max(100).regex(/^[a-zA-Z\s'-]+$/),
    definition: z.string().min(1).max(2000),
    examples: z.array(z.string().max(500)).max(10),
    tags: z.array(z.string().max(50)).max(20),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional()
  })

  private readonly notionConfigSchema = z.object({
    apiKey: z.string().regex(/^secret_[a-zA-Z0-9]{43}$/),
    databaseId: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/),
    synonymDatabaseId: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).optional()
  })

  async validateVocabularyData(data: unknown): Promise<ValidationResult> {
    try {
      const validated = this.vocabularySchema.parse(data)
      
      // Additional business logic validation
      if (await this.containsProfanity(validated.term)) {
        return {
          valid: false,
          error: 'Term contains inappropriate content'
        }
      }

      return {
        valid: true,
        data: validated
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          error: 'Invalid data format',
          details: error.errors
        }
      }

      return {
        valid: false,
        error: 'Validation failed'
      }
    }
  }

  async validateNotionConfig(data: unknown): Promise<ValidationResult> {
    try {
      const validated = this.notionConfigSchema.parse(data)
      
      // Test Notion API key validity
      const isValidKey = await this.testNotionApiKey(validated.apiKey)
      if (!isValidKey) {
        return {
          valid: false,
          error: 'Invalid Notion API key'
        }
      }

      return {
        valid: true,
        data: validated
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          error: 'Invalid Notion configuration',
          details: error.errors
        }
      }

      return {
        valid: false,
        error: 'Validation failed'
      }
    }
  }

  sanitizeHtmlInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove JS protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 10000) // Limit length
  }

  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Only allow safe characters
      .replace(/\.+/g, '.') // Collapse multiple dots
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 255) // Limit length
  }

  private async containsProfanity(text: string): Promise<boolean> {
    // Implement profanity check
    const profanityList = await this.loadProfanityList()
    const lowerText = text.toLowerCase()
    
    return profanityList.some(word => 
      lowerText.includes(word.toLowerCase())
    )
  }

  private async testNotionApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28'
        }
      })

      return response.ok
    } catch {
      return false
    }
  }

  private async loadProfanityList(): Promise<string[]> {
    // Load from secure source
    return [] // Implement as needed
  }
}
```

### 5.3 Audit Logging System
```typescript
// lib/security/audit-logger.ts
export class AuditLogger {
  private supabase = createServerSupabaseClient()

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await this.supabase
        .from('security_audit_log')
        .insert({
          user_id: event.userId,
          event_type: event.type,
          event_data: event.data,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          severity: event.severity || 'info',
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to log security event:', error)
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  async logAuthEvent(
    userId: string | null,
    eventType: AuthEventType,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      userId,
      type: 'auth',
      data: {
        eventType,
        success,
        ...metadata
      },
      severity: success ? 'info' : 'warning'
    })
  }

  async logApiAccess(
    userId: string,
    endpoint: string,
    method: string,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    await this.logSecurityEvent({
      userId,
      type: 'api_access',
      data: {
        endpoint,
        method,
        success,
        responseTime
      },
      severity: 'info'
    })
  }

  async logSuspiciousActivity(
    userId: string | null,
    activityType: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      userId,
      type: 'suspicious_activity',
      data: {
        activityType,
        details
      },
      severity: 'warning'
    })

    // Alert if serious
    if (this.isSeriousThreat(activityType)) {
      await this.sendSecurityAlert(userId, activityType, details)
    }
  }

  private isSeriousThreat(activityType: string): boolean {
    const seriousThreats = [
      'brute_force_attempt',
      'sql_injection_attempt',
      'xss_attempt',
      'privilege_escalation'
    ]

    return seriousThreats.includes(activityType)
  }

  private async sendSecurityAlert(
    userId: string | null,
    activityType: string,
    details: Record<string, any>
  ): Promise<void> {
    // Implement security alert system
    // Could send to monitoring service, email admins, etc.
    console.error('SECURITY ALERT:', {
      userId,
      activityType,
      details,
      timestamp: new Date().toISOString()
    })
  }
}
```

## Key Takeaways

### 6.1 Authentication Architecture
1. **Multi-layer Security**: Extension API keys + Dashboard JWT + Supabase RLS
2. **Cross-platform Sync**: Link extension to dashboard account seamlessly
3. **Token Management**: Automatic refresh, secure storage, expiration handling
4. **API Key Security**: Encrypted storage, rotation, format validation

### 6.2 Security Best Practices
- ✅ **Encrypt sensitive data** in local storage
- ✅ **Use RLS** for database access control
- ✅ **Validate all inputs** server-side
- ✅ **Rate limit APIs** to prevent abuse
- ✅ **Audit log** security events
- ✅ **Rotate credentials** regularly
- ✅ **Sanitize user input** to prevent XSS
- ✅ **Use HTTPS** for all communications

### 6.3 Common Security Pitfalls
- ❌ **Storing plaintext credentials** - always encrypt
- ❌ **Client-side only validation** - validate on server
- ❌ **No rate limiting** - vulnerable to abuse
- ❌ **Weak API key format** - use crypto-secure generation
- ❌ **No audit logging** - can't detect breaches
- ❌ **Trusting user input** - always sanitize and validate
- ❌ **No session management** - tokens never expire
- ❌ **Insufficient RLS policies** - data leakage risk