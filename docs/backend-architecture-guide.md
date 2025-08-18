# Backend Architecture Guide - Supabase + Next.js Integration

Hướng dẫn chi tiết về architecture backend cho Chrome Extension, sử dụng Supabase làm database và Next.js làm dashboard/admin interface.

## 1. Tổng quan Architecture

### 1.1 Kiến trúc 3-layer system
```
┌─────────────────────────────────────────────────────────────┐
│ Chrome Extension (Frontend)                                 │
│ ├── Content Scripts                                        │  
│ ├── Background Scripts                                     │
│ ├── Popup/SidePanel UI                                     │
│ └── Local Storage + Chrome APIs                            │
├─────────────────────────────────────────────────────────────┤
│ Next.js Dashboard (Web App)                                │
│ ├── App Router (React Server Components)                   │
│ ├── API Routes (/api/*)                                    │
│ ├── Authentication (Supabase Auth)                         │
│ └── Real-time Updates                                      │
├─────────────────────────────────────────────────────────────┤
│ Supabase Backend (BaaS)                                    │
│ ├── PostgreSQL Database                                    │
│ ├── Row Level Security (RLS)                              │
│ ├── Real-time Subscriptions                               │
│ ├── Edge Functions                                         │
│ └── Authentication & Authorization                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Pattern
```
Extension → API Proxy → Supabase → Dashboard
    ↑                                   ↓
    └── Real-time Updates ←─────────────┘
```

## 2. Supabase Database Design

### 2.1 Core Database Schema
```sql
-- User management and authentication
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    api_key TEXT UNIQUE,
    subscription_status TEXT DEFAULT 'free',
    subscription_plan_id TEXT,
    stripe_customer_id TEXT UNIQUE,
    subscription_id TEXT UNIQUE,
    subscription_current_period_end TIMESTAMPTZ,
    api_key_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API usage tracking và quota management
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
    error_message TEXT,
    response_time_ms INTEGER,
    user_agent TEXT,
    ip_address INET,
    extension_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notion integration configuration
CREATE TABLE notion_integrations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key_encrypted TEXT NOT NULL,
    main_database_id TEXT NOT NULL,
    synonym_database_id TEXT,
    connection_status TEXT NOT NULL DEFAULT 'active',
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    total_words INTEGER NOT NULL DEFAULT 0,
    sync_errors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary learning analytics
CREATE TABLE vocabulary_analytics (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_words INTEGER NOT NULL DEFAULT 0,
    mastery_breakdown JSONB, -- {learning: 0, familiar: 0, mastered: 0}
    topic_distribution JSONB, -- {Academic: 10, Business: 5, ...}
    cefr_distribution JSONB, -- {A1: 5, A2: 10, B1: 15, ...}
    learning_streak INTEGER NOT NULL DEFAULT 0,
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning session tracking
CREATE TABLE learning_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('word_lookup', 'synonym_generation', 'review', 'bulk_import')),
    words_processed INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    success_rate DECIMAL(5,2),
    topics_covered TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Row Level Security (RLS) Implementation
```sql
-- Enable RLS trên tất cả user tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users chỉ access được data của mình
CREATE POLICY "Users can view own profile" 
    ON user_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can manage own notion integrations" 
    ON notion_integrations FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own vocabulary analytics" 
    ON vocabulary_analytics FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own learning sessions" 
    ON learning_sessions FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own api usage" 
    ON api_usage FOR SELECT 
    USING (auth.uid() = user_id);
```

### 2.3 Database Functions và Triggers
```sql
-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notion_integrations_updated_at 
    BEFORE UPDATE ON notion_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 3. Next.js Dashboard Architecture

### 3.1 Project Structure
```
dashboard/
├── src/
│   ├── app/                    # App Router (Next.js 13+)
│   │   ├── (auth)/            # Route groups
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── dashboard/         # Protected routes
│   │   │   ├── analytics/
│   │   │   ├── integrations/
│   │   │   └── settings/
│   │   ├── api/               # API routes
│   │   │   ├── auth/
│   │   │   ├── notion/
│   │   │   └── analytics/
│   │   ├── globals.css
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   ├── dashboard/        # Dashboard-specific
│   │   └── auth/            # Auth components
│   ├── hooks/                # Custom React hooks
│   │   ├── use-auth.tsx
│   │   ├── use-notion.ts
│   │   └── use-vocabulary.ts
│   ├── lib/                  # Utilities and services
│   │   ├── supabase.ts       # Supabase client
│   │   ├── auth.ts           # Auth service
│   │   └── database.types.ts # Generated types
│   ├── services/             # Business logic
│   └── types/               # TypeScript types
├── supabase/                 # Supabase configuration
│   ├── migrations/          # Database migrations
│   ├── seed.sql            # Sample data
│   └── config.toml         # Local config
└── package.json
```

### 3.2 Supabase Client Configuration
```typescript
// lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Client-side Supabase client
export const supabase: SupabaseClient<Database> = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server-side Supabase client (với service key)
export const createServerSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
```

### 3.3 Authentication Service
```typescript
// lib/auth.ts
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from './database.types'

export class AuthError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export const authService = {
  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw new AuthError(error.message, error.message)
    return session
  },

  // Get current user
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw new AuthError(error.message, error.message)
    return user
  },

  // Sign up new user
  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw new AuthError(error.message, error.message)
    return data
  },

  // Sign in user
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw new AuthError(error.message, error.message)
    return data
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new AuthError(error.message, error.message)
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
```

### 3.4 React Query Integration
```typescript
// hooks/use-vocabulary.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type VocabularyAnalytics = Database['public']['Tables']['vocabulary_analytics']['Row']
type VocabularyAnalyticsInsert = Database['public']['Tables']['vocabulary_analytics']['Insert']

export function useVocabularyAnalytics(userId: string) {
  return useQuery({
    queryKey: ['vocabulary-analytics', userId],
    queryFn: async (): Promise<VocabularyAnalytics | null> => {
      if (!userId) throw new Error('User ID is required')

      const { data, error } = await supabase
        .from('vocabulary_analytics')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message)
      }

      return data || null
    },
    enabled: !!userId
  })
}

export function useCreateVocabularyAnalytics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: VocabularyAnalyticsInsert) => {
      const { data: result, error } = await supabase
        .from('vocabulary_analytics')
        .insert(data)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['vocabulary-analytics', data.user_id] 
      })
    }
  })
}
```

## 4. Data Synchronization Patterns

### 4.1 Extension → Dashboard Real-time Sync
```typescript
// Extension background script - push data to Supabase
export async function syncVocabularyData(wordData: WordData) {
  try {
    const user = await getCurrentUser()
    if (!user) return

    // Update learning session
    await supabase
      .from('learning_sessions')
      .insert({
        user_id: user.id,
        session_type: 'word_lookup',
        words_processed: 1,
        duration_seconds: Math.floor(Date.now() / 1000) - sessionStart,
        metadata: {
          word: wordData.term,
          definition_length: wordData.definition.length,
          source: 'extension'
        }
      })

    // Update vocabulary analytics
    await supabase.rpc('increment_word_count', {
      p_user_id: user.id,
      p_topic: wordData.topic || 'General',
      p_cefr_level: wordData.cefrLevel || 'B2'
    })

  } catch (error) {
    console.error('Sync failed:', error)
    // Queue for retry
    await queueSyncOperation('vocabulary_sync', wordData)
  }
}
```

### 4.2 Dashboard Real-time Subscriptions
```typescript
// Dashboard - listen for real-time updates
export function useRealtimeVocabularyUpdates(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const subscription = supabase
      .channel('vocabulary-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vocabulary_analytics',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Vocabulary updated:', payload)
          queryClient.invalidateQueries({ 
            queryKey: ['vocabulary-analytics', userId] 
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'learning_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New learning session:', payload)
          queryClient.invalidateQueries({ 
            queryKey: ['learning-sessions', userId] 
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [userId, queryClient])
}
```

### 4.3 Offline/Online Sync Strategy
```typescript
// Extension offline queue system
export class OfflineSyncService {
  private syncQueue: SyncOperation[] = []
  private isOnline = navigator.onLine

  constructor() {
    window.addEventListener('online', this.processSyncQueue.bind(this))
    window.addEventListener('offline', () => { this.isOnline = false })
  }

  async queueOperation(operation: SyncOperation) {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
      retryCount: 0
    })

    // Try immediate sync if online
    if (this.isOnline) {
      await this.processSyncQueue()
    }
  }

  private async processSyncQueue() {
    this.isOnline = true
    const operations = [...this.syncQueue]
    this.syncQueue = []

    for (const operation of operations) {
      try {
        await this.executeOperation(operation)
      } catch (error) {
        console.error('Sync operation failed:', error)
        
        // Retry logic
        if (operation.retryCount < 3) {
          operation.retryCount++
          this.syncQueue.push(operation)
        } else {
          console.error('Operation failed after 3 retries:', operation)
        }
      }
    }
  }

  private async executeOperation(operation: SyncOperation) {
    switch (operation.type) {
      case 'vocabulary_sync':
        await syncVocabularyData(operation.data)
        break
      case 'analytics_update':
        await syncAnalyticsData(operation.data)
        break
      default:
        throw new Error(`Unknown operation type: ${operation.type}`)
    }
  }
}
```

## 5. API Integration Patterns

### 5.1 Next.js API Routes
```typescript
// app/api/vocabulary/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' }, 
        { status: 400 }
      )
    }

    // Get vocabulary analytics
    const { data: analytics, error } = await supabase
      .from('vocabulary_analytics')
      .select(`
        *,
        learning_sessions (
          session_type,
          words_processed,
          success_rate,
          created_at
        )
      `)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ 
      analytics: analytics || null 
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('vocabulary_analytics')
      .upsert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })

  } catch (error) {
    console.error('Analytics POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update analytics' }, 
      { status: 500 }
    )
  }
}
```

### 5.2 Middleware for Authentication
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Protected routes
  const protectedPaths = ['/dashboard', '/api/vocabulary', '/api/notion']
  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      // Redirect to login for dashboard routes
      if (req.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/auth/login', req.url))
      }

      // Return 401 for API routes
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        )
      }
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*']
}
```

## 6. Security Best Practices

### 6.1 Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Database connection (for migrations)
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Optional: External integrations
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6.2 API Key Encryption
```typescript
// lib/encryption.ts
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // 32 bytes key
const ALGORITHM = 'aes-256-gcm'

export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  cipher.setAAD(Buffer.from('api-key', 'utf8'))
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptApiKey(encryptedKey: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedKey.split(':')
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  decipher.setAAD(Buffer.from('api-key', 'utf8'))
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
```

### 6.3 Rate Limiting
```typescript
// lib/rate-limit.ts
import { createServerSupabaseClient } from './supabase'

interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

export async function checkRateLimit(
  userId: string, 
  limit: number = 100, 
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const supabase = createServerSupabaseClient()
  const now = Date.now()
  const windowStart = now - windowMs

  try {
    // Count requests in current window
    const { count, error } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(windowStart).toISOString())

    if (error) throw error

    const requestCount = count || 0
    const remaining = Math.max(0, limit - requestCount)
    const resetTime = windowStart + windowMs

    return {
      success: requestCount < limit,
      remaining,
      resetTime
    }

  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { success: true, remaining: limit, resetTime: now + windowMs }
  }
}
```

## 7. Performance Optimization

### 7.1 Database Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_user_id_created_at 
    ON api_usage(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_endpoint 
    ON api_usage(endpoint);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_sessions_user_id_created_at 
    ON learning_sessions(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_sessions_type 
    ON learning_sessions(session_type);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notion_integrations_active 
    ON notion_integrations(user_id) 
    WHERE connection_status = 'active';
```

### 7.2 Caching Strategy
```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache'

export const getCachedVocabularyAnalytics = unstable_cache(
  async (userId: string) => {
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('vocabulary_analytics')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data
  },
  ['vocabulary-analytics'],
  {
    revalidate: 300, // 5 minutes
    tags: ['analytics']
  }
)

// Revalidate cache when data changes
export async function revalidateAnalyticsCache(userId: string) {
  revalidateTag('analytics')
}
```

## 8. Testing Strategy

### 8.1 Database Testing
```typescript
// __tests__/lib/auth.test.ts
import { createClient } from '@supabase/supabase-js'
import { authService } from '@/lib/auth'

// Mock Supabase for testing
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn()
    }
  }
}))

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('signUp', () => {
    it('should create new user successfully', async () => {
      const mockResponse = {
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null
      }
      
      ;(authService as any).supabase.auth.signUp.mockResolvedValue(mockResponse)

      const result = await authService.signUp('test@example.com', 'password123')
      
      expect(result.data.user.email).toBe('test@example.com')
    })

    it('should throw AuthError on failure', async () => {
      const mockError = { message: 'Invalid email', code: 'invalid_email' }
      ;(authService as any).supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError
      })

      await expect(authService.signUp('invalid-email', 'password'))
        .rejects.toThrow('Invalid email')
    })
  })
})
```

### 8.2 API Route Testing
```typescript
// __tests__/api/vocabulary/analytics.test.ts
import { GET, POST } from '@/app/api/vocabulary/analytics/route'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase')

describe('/api/vocabulary/analytics', () => {
  describe('GET', () => {
    it('should return analytics for valid user', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/vocabulary/analytics?userId=123'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analytics).toBeDefined()
    })

    it('should return 400 for missing userId', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/vocabulary/analytics'
      )

      const response = await GET(request)
      
      expect(response.status).toBe(400)
    })
  })
})
```

## 9. Deployment và Scaling

### 9.1 Vercel Deployment
```typescript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  }
}

export default nextConfig
```

### 9.2 Database Migration Strategy
```sql
-- Migration script template
-- migrations/20250201000001_add_feature_table.sql

-- Up migration
BEGIN;

CREATE TABLE IF NOT EXISTS new_feature_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS
ALTER TABLE new_feature_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feature data" 
    ON new_feature_table FOR ALL 
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_new_feature_table_user_id ON new_feature_table(user_id);
CREATE INDEX idx_new_feature_table_created_at ON new_feature_table(created_at DESC);

COMMIT;
```

### 9.3 Monitoring và Logging
```typescript
// lib/monitoring.ts
export class PerformanceMonitor {
  static async trackApiCall(
    endpoint: string,
    userId: string,
    operation: () => Promise<any>
  ) {
    const startTime = Date.now()
    let success = true
    let error: Error | null = null

    try {
      const result = await operation()
      return result
    } catch (e) {
      success = false
      error = e as Error
      throw e
    } finally {
      const responseTime = Date.now() - startTime

      // Log to Supabase
      await supabase
        .from('api_usage')
        .insert({
          user_id: userId,
          endpoint,
          success,
          response_time_ms: responseTime,
          error_message: error?.message || null,
          created_at: new Date().toISOString()
        })
        .catch(console.error) // Don't fail the main operation
    }
  }
}

// Usage in API routes
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request)
  
  return PerformanceMonitor.trackApiCall(
    '/api/vocabulary/analytics',
    userId,
    async () => {
      // Your API logic here
      return NextResponse.json({ data: 'result' })
    }
  )
}
```

## Key Takeaways

### 10.1 Architecture Principles
1. **Separation of Concerns**: Extension, Dashboard, Database có responsibilities riêng biệt
2. **Security First**: RLS, encryption, authentication ở mọi layer
3. **Real-time Sync**: Supabase subscriptions cho live updates
4. **Offline Support**: Queue-based sync cho extension
5. **Performance**: Caching, indexing, rate limiting
6. **Scalability**: Modular design, microservice-ready

### 10.2 Best Practices
- ✅ **Type Safety**: Generated types từ Supabase schema
- ✅ **Error Handling**: Structured errors với proper HTTP codes
- ✅ **Rate Limiting**: Protect APIs khỏi abuse
- ✅ **Caching**: Multi-layer caching strategy
- ✅ **Testing**: Unit tests cho business logic
- ✅ **Monitoring**: Track performance và errors
- ✅ **Security**: Encrypt sensitive data, use RLS
- ✅ **Migration**: Database versioning và rollback capability

### 10.3 Common Pitfalls to Avoid
- ❌ **Direct DB Access** từ extension - always go through API
- ❌ **No RLS** - security vulnerability
- ❌ **Hardcoded credentials** - use environment variables
- ❌ **No error handling** - leads to poor UX
- ❌ **Missing indexes** - performance issues
- ❌ **No rate limiting** - resource abuse
- ❌ **Synchronous operations** - blocking UI