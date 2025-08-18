# Deployment & Scaling Strategies for Chrome Extensions

Hướng dẫn chi tiết về deployment, scaling và production readiness cho Chrome Extension với backend architecture phức tạp.

## 1. Deployment Architecture Overview

### 1.1 Multi-environment Setup
```
┌─────────────────────────────────────────────────────────────┐
│ Production Environment                                      │
│ ├── Chrome Web Store (Extension Distribution)              │
│ ├── Vercel (Dashboard + API Proxy)                         │
│ ├── Supabase Production (Database + Auth + Storage)        │
│ ├── Cloudinary (Image Hosting)                            │
│ └── Monitoring (Sentry, Analytics)                        │
├─────────────────────────────────────────────────────────────┤
│ Staging Environment                                         │
│ ├── Chrome Web Store (Beta Channel)                        │
│ ├── Vercel Preview (Branch Deployments)                    │
│ ├── Supabase Staging (Test Database)                       │
│ └── Test Data & Mock Services                              │
├─────────────────────────────────────────────────────────────┤
│ Development Environment                                     │
│ ├── Local Extension (plasmo dev)                           │
│ ├── Local Dashboard (next dev)                             │
│ ├── Supabase Local (Docker)                               │
│ └── Mock External APIs                                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Deployment Pipeline Flow
```
Developer Push → GitHub Actions → Build & Test → Deploy to Staging
     ↓
Manual Testing → QA Approval → Production Deployment
     ↓
Chrome Web Store Upload → Review Process → Public Release
```

## 2. Chrome Extension Deployment

### 2.1 Build Configuration
```typescript
// plasmo.config.ts
import { defineConfig } from 'plasmo'

export default defineConfig({
  // Production build optimizations
  build: {
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Bundle splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-button'],
          'vendor-utils': ['clsx', 'class-variance-authority']
        }
      }
    }
  },

  // Environment-specific manifest
  manifest: {
    name: process.env.NODE_ENV === 'production' 
      ? 'Word Wizard - AI Vocabulary Learning'
      : 'Word Wizard (Dev)',
    
    version: process.env.EXTENSION_VERSION || '1.0.0',
    
    // Environment-specific permissions
    host_permissions: process.env.NODE_ENV === 'production'
      ? [
          'https://api.openai.com/*',
          'https://api.notion.com/*',
          'https://worwiz-proxy.vercel.app/*'
        ]
      : [
          'https://api.openai.com/*',
          'https://api.notion.com/*',
          'http://localhost:3000/*',
          'https://worwiz-proxy-staging.vercel.app/*'
        ],

    // Content Security Policy
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src https: wss: http://localhost:*"
    }
  }
})
```

### 2.2 Environment Configuration
```typescript
// lib/config/environment.ts
export interface Environment {
  name: 'development' | 'staging' | 'production'
  apiProxy: {
    baseUrl: string
    timeout: number
  }
  supabase: {
    url: string
    anonKey: string
  }
  features: {
    debugMode: boolean
    analytics: boolean
    errorReporting: boolean
  }
}

export const environments: Record<string, Environment> = {
  development: {
    name: 'development',
    apiProxy: {
      baseUrl: 'http://localhost:3000',
      timeout: 30000
    },
    supabase: {
      url: 'http://localhost:54321',
      anonKey: 'local-anon-key'
    },
    features: {
      debugMode: true,
      analytics: false,
      errorReporting: false
    }
  },

  staging: {
    name: 'staging',
    apiProxy: {
      baseUrl: 'https://worwiz-proxy-staging.vercel.app',
      timeout: 30000
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_STAGING_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_STAGING_ANON_KEY!
    },
    features: {
      debugMode: true,
      analytics: true,
      errorReporting: true
    }
  },

  production: {
    name: 'production',
    apiProxy: {
      baseUrl: 'https://worwiz-proxy.vercel.app',
      timeout: 30000
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    },
    features: {
      debugMode: false,
      analytics: true,
      errorReporting: true
    }
  }
}

export function getCurrentEnvironment(): Environment {
  const env = process.env.NODE_ENV || 'development'
  const stage = process.env.STAGE || env
  
  return environments[stage] || environments.development
}
```

### 2.3 Automated Chrome Web Store Deployment
```yaml
# .github/workflows/chrome-extension-deploy.yml
name: Deploy Chrome Extension

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install

      - name: Set environment variables
        run: |
          if [ "${{ github.event.inputs.environment }}" = "production" ]; then
            echo "STAGE=production" >> $GITHUB_ENV
            echo "EXTENSION_VERSION=${{ github.ref_name }}" >> $GITHUB_ENV
          else
            echo "STAGE=staging" >> $GITHUB_ENV
            echo "EXTENSION_VERSION=${{ github.ref_name }}-beta" >> $GITHUB_ENV
          fi

      - name: Build extension
        run: pnpm build
        env:
          NODE_ENV: production
          STAGE: ${{ env.STAGE }}
          EXTENSION_VERSION: ${{ env.EXTENSION_VERSION }}

      - name: Run tests
        run: pnpm test

      - name: Package extension
        run: pnpm package

      - name: Upload to Chrome Web Store
        if: github.event.inputs.environment == 'production'
        uses: mnao305/chrome-extension-upload@v4.0.1
        with:
          file-path: build/chrome-mv3-prod.zip
          extension-id: ${{ secrets.CHROME_EXTENSION_ID }}
          client-id: ${{ secrets.CHROME_CLIENT_ID }}
          client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}

      - name: Upload beta version
        if: github.event.inputs.environment == 'staging'
        uses: mnao305/chrome-extension-upload@v4.0.1
        with:
          file-path: build/chrome-mv3-prod.zip
          extension-id: ${{ secrets.CHROME_EXTENSION_BETA_ID }}
          client-id: ${{ secrets.CHROME_CLIENT_ID }}
          client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
          publish: false # Keep as draft for beta testing

      - name: Create GitHub Release
        if: github.event.inputs.environment == 'production'
        uses: softprops/action-gh-release@v1
        with:
          files: |
            build/chrome-mv3-prod.zip
            build/firefox-mv2-prod.zip
          generate_release_notes: true
```

## 3. Dashboard & API Deployment

### 3.1 Vercel Configuration
```javascript
// vercel.json
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "cd dashboard && pnpm build",
  "outputDirectory": "dashboard/.next",
  
  "env": {
    "NODE_ENV": "production"
  },
  
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
      "SUPABASE_SERVICE_KEY": "@supabase-service-key",
      "OPENAI_API_KEY": "@openai-api-key",
      "GEMINI_API_KEY": "@gemini-api-key",
      "ANTHROPIC_API_KEY": "@anthropic-api-key"
    }
  },

  "functions": {
    "dashboard/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },

  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "chrome-extension://*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization, X-API-Key"
        }
      ]
    }
  ],

  "redirects": [
    {
      "source": "/dashboard",
      "destination": "/dashboard/analytics",
      "permanent": false
    }
  ]
}
```

### 3.2 Next.js Production Configuration
```typescript
// dashboard/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-button',
      'lucide-react'
    ]
  },

  // Bundle analyzer (conditional)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(
        new (require('@next/bundle-analyzer'))({
          enabled: true
        })
      )
      return config
    }
  }),

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co"
            ].join('; ')
          }
        ]
      }
    ]
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: (() => {
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_KEY'
      ]

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`)
        }
      }

      return 'validated'
    })()
  }
}

export default nextConfig
```

### 3.3 Database Migration Strategy
```typescript
// dashboard/scripts/migrate.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

interface Migration {
  id: string
  name: string
  sql: string
  applied_at?: string
}

class MigrationRunner {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  async runMigrations(environment: 'staging' | 'production'): Promise<void> {
    console.log(`Running migrations for ${environment}...`)

    // Ensure migrations table exists
    await this.ensureMigrationsTable()

    // Get pending migrations
    const pendingMigrations = await this.getPendingMigrations()

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations')
      return
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`)

    // Run migrations in transaction
    const { error } = await this.supabase.rpc('run_migrations', {
      migrations: pendingMigrations
    })

    if (error) {
      console.error('Migration failed:', error)
      throw error
    }

    console.log('Migrations completed successfully')
  }

  private async ensureMigrationsTable(): Promise<void> {
    const { error } = await this.supabase.rpc('create_migrations_table')
    if (error) {
      throw error
    }
  }

  private async getPendingMigrations(): Promise<Migration[]> {
    const migrationsDir = path.join(__dirname, '../supabase/migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    // Get applied migrations
    const { data: appliedMigrations } = await this.supabase
      .from('schema_migrations')
      .select('name')

    const appliedNames = new Set(
      appliedMigrations?.map(m => m.name) || []
    )

    // Find pending migrations
    const pending: Migration[] = []
    
    for (const file of migrationFiles) {
      if (!appliedNames.has(file)) {
        const sql = fs.readFileSync(
          path.join(migrationsDir, file), 
          'utf8'
        )
        
        pending.push({
          id: file.split('_')[0],
          name: file,
          sql
        })
      }
    }

    return pending
  }

  async rollback(migrationName: string): Promise<void> {
    console.log(`Rolling back migration: ${migrationName}`)
    
    // Implementation depends on your rollback strategy
    // Could be separate rollback files or DOWN sections in migrations
  }
}

// CLI usage
if (require.main === module) {
  const environment = process.argv[2] as 'staging' | 'production'
  
  if (!environment || !['staging', 'production'].includes(environment)) {
    console.error('Usage: ts-node migrate.ts <staging|production>')
    process.exit(1)
  }

  const runner = new MigrationRunner()
  runner.runMigrations(environment)
    .then(() => {
      console.log('Migration completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}
```

## 4. Scaling Strategies

### 4.1 Database Scaling
```sql
-- Performance optimizations for scaling
-- 1. Indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_user_date 
    ON api_usage(user_id, created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vocabulary_analytics_active 
    ON vocabulary_analytics(user_id) 
    WHERE updated_at > NOW() - INTERVAL '7 days';

-- 2. Partitioning for large tables
CREATE TABLE api_usage_2024_01 PARTITION OF api_usage
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE api_usage_2024_02 PARTITION OF api_usage
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 3. Archive old data
CREATE OR REPLACE FUNCTION archive_old_api_usage()
RETURNS void AS $$
BEGIN
    -- Move data older than 1 year to archive table
    INSERT INTO api_usage_archive 
    SELECT * FROM api_usage 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Delete from main table
    DELETE FROM api_usage 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Schedule archiving
SELECT cron.schedule('archive-api-usage', '0 2 * * 0', 'SELECT archive_old_api_usage();');
```

### 4.2 Caching Strategy
```typescript
// lib/cache/multi-layer-cache.ts
export class MultiLayerCacheService {
  private memoryCache = new Map<string, CacheItem>()
  private redisClient?: Redis // Optional Redis for distributed caching
  
  constructor(redisUrl?: string) {
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // 1. Check memory cache (fastest)
    const memoryItem = this.memoryCache.get(key)
    if (memoryItem && !this.isExpired(memoryItem)) {
      return memoryItem.data
    }

    // 2. Check Redis cache (fast)
    if (this.redisClient) {
      try {
        const redisData = await this.redisClient.get(key)
        if (redisData) {
          const item = JSON.parse(redisData)
          if (!this.isExpired(item)) {
            // Store back in memory for next time
            this.memoryCache.set(key, item)
            return item.data
          }
        }
      } catch (error) {
        console.warn('Redis cache error:', error)
      }
    }

    // 3. Check database cache (slower)
    const dbItem = await this.getFromDatabase(key)
    if (dbItem && !this.isExpired(dbItem)) {
      // Store in faster caches
      this.memoryCache.set(key, dbItem)
      if (this.redisClient) {
        await this.redisClient.setex(
          key, 
          Math.floor(dbItem.ttl / 1000), 
          JSON.stringify(dbItem)
        )
      }
      return dbItem.data
    }

    return null
  }

  async set<T>(
    key: string, 
    data: T, 
    ttlMs: number = 300000
  ): Promise<void> {
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    }

    // Store in all cache layers
    this.memoryCache.set(key, item)

    if (this.redisClient) {
      try {
        await this.redisClient.setex(
          key,
          Math.floor(ttlMs / 1000),
          JSON.stringify(item)
        )
      } catch (error) {
        console.warn('Redis cache set error:', error)
      }
    }

    await this.setInDatabase(key, item)
  }

  async invalidate(key: string): Promise<void> {
    // Remove from all cache layers
    this.memoryCache.delete(key)

    if (this.redisClient) {
      try {
        await this.redisClient.del(key)
      } catch (error) {
        console.warn('Redis cache delete error:', error)
      }
    }

    await this.deleteFromDatabase(key)
  }

  // Memory management
  private startMemoryCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, item] of this.memoryCache.entries()) {
        if (now - item.timestamp > item.ttl) {
          this.memoryCache.delete(key)
        }
      }

      // Limit memory cache size
      if (this.memoryCache.size > 10000) {
        const entries = Array.from(this.memoryCache.entries())
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
        
        // Remove oldest 20%
        const toRemove = Math.floor(entries.length * 0.2)
        for (let i = 0; i < toRemove; i++) {
          this.memoryCache.delete(entries[i][0])
        }
      }
    }, 60000) // Clean every minute
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl
  }
}
```

### 4.3 Rate Limiting & Load Balancing
```typescript
// lib/scaling/rate-limiter.ts
export class DistributedRateLimiter {
  private redisClient: Redis
  private localCounts = new Map<string, { count: number; resetTime: number }>()

  constructor(redisUrl: string) {
    this.redisClient = new Redis(redisUrl)
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - windowMs

    try {
      // Use Redis for distributed rate limiting
      const pipeline = this.redisClient.pipeline()
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart)
      
      // Count current requests
      pipeline.zcard(key)
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`)
      
      // Set expiration
      pipeline.expire(key, Math.ceil(windowMs / 1000))
      
      const results = await pipeline.exec()
      const count = results?.[1]?.[1] as number || 0

      const allowed = count < limit
      const remaining = Math.max(0, limit - count - 1)
      const resetTime = windowStart + windowMs

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
      }

    } catch (error) {
      console.error('Redis rate limit error:', error)
      
      // Fallback to local rate limiting
      return this.localRateLimit(key, limit, windowMs)
    }
  }

  private localRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): RateLimitResult {
    const now = Date.now()
    const current = this.localCounts.get(key)

    if (!current || now > current.resetTime) {
      this.localCounts.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs
      }
    }

    const allowed = current.count < limit
    if (allowed) {
      current.count++
    }

    return {
      allowed,
      remaining: Math.max(0, limit - current.count),
      resetTime: current.resetTime,
      retryAfter: allowed ? undefined : Math.ceil((current.resetTime - now) / 1000)
    }
  }
}
```

### 4.4 Auto-scaling Configuration
```typescript
// lib/scaling/auto-scaler.ts
export class AutoScaler {
  private metrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    requestRate: 0,
    errorRate: 0,
    responseTime: 0
  }

  async checkScalingMetrics(): Promise<ScalingDecision> {
    await this.updateMetrics()

    const decision: ScalingDecision = {
      action: 'none',
      reason: 'Metrics within normal range'
    }

    // Scale up conditions
    if (this.metrics.cpuUsage > 80 || this.metrics.memoryUsage > 85) {
      decision.action = 'scale-up'
      decision.reason = 'High resource usage'
    } else if (this.metrics.responseTime > 2000) {
      decision.action = 'scale-up'
      decision.reason = 'High response time'
    } else if (this.metrics.errorRate > 5) {
      decision.action = 'scale-up'
      decision.reason = 'High error rate'
    }

    // Scale down conditions
    if (
      this.metrics.cpuUsage < 20 && 
      this.metrics.memoryUsage < 30 &&
      this.metrics.responseTime < 500 &&
      this.metrics.errorRate < 1
    ) {
      decision.action = 'scale-down'
      decision.reason = 'Low resource usage'
    }

    return decision
  }

  private async updateMetrics(): Promise<void> {
    // Collect metrics from various sources
    this.metrics.cpuUsage = await this.getCpuUsage()
    this.metrics.memoryUsage = await this.getMemoryUsage()
    this.metrics.requestRate = await this.getRequestRate()
    this.metrics.errorRate = await this.getErrorRate()
    this.metrics.responseTime = await this.getAverageResponseTime()
  }

  private async getCpuUsage(): Promise<number> {
    // Implementation depends on deployment platform
    // For Vercel, this might come from monitoring APIs
    // For self-hosted, from system metrics
    return 0
  }

  // Similar implementations for other metrics...
}
```

## 5. Monitoring & Observability

### 5.1 Application Performance Monitoring
```typescript
// lib/monitoring/apm.ts
import * as Sentry from '@sentry/nextjs'

export class ApplicationMonitoring {
  static initialize(environment: string): void {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment,
      
      // Performance monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      
      // Session replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      beforeSend(event) {
        // Filter out sensitive data
        if (event.user) {
          delete event.user.email
          delete event.user.ip_address
        }
        
        return event
      }
    })
  }

  static trackUserActivity(userId: string, activity: string): void {
    Sentry.addBreadcrumb({
      message: activity,
      category: 'user-activity',
      data: { userId }
    })
  }

  static trackPerformanceMetric(
    name: string, 
    value: number, 
    unit: string = 'ms'
  ): void {
    Sentry.setMeasurement(name, value, unit)
  }

  static trackBusinessMetric(
    metric: string, 
    value: number, 
    tags?: Record<string, string>
  ): void {
    // Send to analytics service
    if (typeof window !== 'undefined') {
      // Client-side analytics
      (window as any).gtag?.('event', metric, {
        custom_parameter: value,
        ...tags
      })
    } else {
      // Server-side analytics
      // Send to your analytics service
    }
  }
}

// Usage in API routes
export function withMonitoring<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    
    return await Sentry.startSpan(
      { name: operationName },
      async (span) => {
        try {
          const result = await handler(...args)
          
          span?.setStatus({ code: 1 }) // OK
          ApplicationMonitoring.trackPerformanceMetric(
            operationName,
            Date.now() - startTime
          )
          
          return result
        } catch (error) {
          span?.setStatus({ code: 2, message: error.message }) // ERROR
          
          Sentry.captureException(error, {
            tags: {
              operation: operationName
            }
          })
          
          throw error
        }
      }
    )
  }
}
```

### 5.2 Health Check System
```typescript
// lib/monitoring/health-check.ts
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  checks: Record<string, CheckResult>
  timestamp: number
  uptime: number
}

export class HealthCheckService {
  private startTime = Date.now()

  async runHealthChecks(): Promise<HealthCheckResult> {
    const checks: Record<string, CheckResult> = {}

    // Database connectivity
    checks.database = await this.checkDatabase()
    
    // External API availability  
    checks.openai = await this.checkOpenAI()
    checks.notion = await this.checkNotion()
    
    // Internal services
    checks.cache = await this.checkCache()
    checks.storage = await this.checkStorage()

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status)
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy'
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      checks,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    }
  }

  private async checkDatabase(): Promise<CheckResult> {
    try {
      const start = Date.now()
      
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1)

      if (error) throw error

      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        message: 'Database connection successful'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Database connection failed'
      }
    }
  }

  private async checkOpenAI(): Promise<CheckResult> {
    try {
      const start = Date.now()
      
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        message: 'OpenAI API accessible'
      }
    } catch (error) {
      return {
        status: 'degraded', // Not critical for core functionality
        error: error.message,
        message: 'OpenAI API unavailable'
      }
    }
  }

  // Similar checks for other services...
}

// API endpoint
// app/api/health/route.ts
export async function GET() {
  const healthCheck = new HealthCheckService()
  const result = await healthCheck.runHealthChecks()

  const status = result.status === 'healthy' ? 200 : 
                result.status === 'degraded' ? 200 : 503

  return NextResponse.json(result, { status })
}
```

### 5.3 Alerting System
```typescript
// lib/monitoring/alerting.ts
export class AlertingService {
  private webhookUrl: string
  private emailService: EmailService

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL!
    this.emailService = new EmailService()
  }

  async sendAlert(alert: Alert): Promise<void> {
    // Send to multiple channels based on severity
    switch (alert.severity) {
      case 'critical':
        await Promise.all([
          this.sendSlackAlert(alert),
          this.sendEmailAlert(alert),
          this.sendSmsAlert(alert) // For critical issues
        ])
        break

      case 'warning':
        await Promise.all([
          this.sendSlackAlert(alert),
          this.sendEmailAlert(alert)
        ])
        break

      case 'info':
        await this.sendSlackAlert(alert)
        break
    }
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    const color = {
      critical: '#ff0000',
      warning: '#ffaa00',
      info: '#00ff00'
    }[alert.severity]

    const payload = {
      attachments: [{
        color,
        title: `${alert.severity.toUpperCase()}: ${alert.title}`,
        text: alert.message,
        fields: [
          {
            title: 'Environment',
            value: alert.environment,
            short: true
          },
          {
            title: 'Service',
            value: alert.service,
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date(alert.timestamp).toISOString(),
            short: true
          }
        ],
        ...(alert.details && {
          fields: [
            ...fields,
            {
              title: 'Details',
              value: `\`\`\`${JSON.stringify(alert.details, null, 2)}\`\`\``,
              short: false
            }
          ]
        })
      }]
    }

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
    }
  }

  // Monitor key metrics and trigger alerts
  async monitorMetrics(): Promise<void> {
    const healthCheck = new HealthCheckService()
    const health = await healthCheck.runHealthChecks()

    if (health.status === 'unhealthy') {
      await this.sendAlert({
        title: 'Service Unhealthy',
        message: 'Multiple health checks are failing',
        severity: 'critical',
        service: 'word-wizard-api',
        environment: process.env.NODE_ENV!,
        timestamp: Date.now(),
        details: health.checks
      })
    }

    // Monitor API response times
    const avgResponseTime = await this.getAverageResponseTime()
    if (avgResponseTime > 5000) {
      await this.sendAlert({
        title: 'High Response Time',
        message: `Average response time: ${avgResponseTime}ms`,
        severity: 'warning',
        service: 'word-wizard-api',
        environment: process.env.NODE_ENV!,
        timestamp: Date.now(),
        details: { averageResponseTime: avgResponseTime }
      })
    }

    // Monitor error rates
    const errorRate = await this.getErrorRate()
    if (errorRate > 5) {
      await this.sendAlert({
        title: 'High Error Rate',
        message: `Error rate: ${errorRate}%`,
        severity: 'warning',
        service: 'word-wizard-api',
        environment: process.env.NODE_ENV!,
        timestamp: Date.now(),
        details: { errorRate }
      })
    }
  }
}
```

## 6. Disaster Recovery & Backup

### 6.1 Database Backup Strategy
```typescript
// scripts/backup.ts
export class BackupService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  async createBackup(): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `word-wizard-backup-${timestamp}`

    try {
      // 1. Create database dump
      const databaseDump = await this.createDatabaseDump()
      
      // 2. Backup uploaded files
      const fileBackup = await this.backupStorageFiles()
      
      // 3. Export configuration
      const configBackup = await this.exportConfiguration()

      // 4. Upload to cloud storage
      const backupData = {
        database: databaseDump,
        files: fileBackup,
        config: configBackup,
        timestamp: Date.now()
      }

      await this.uploadBackupToCloud(backupName, backupData)

      return {
        success: true,
        backupName,
        size: JSON.stringify(backupData).length,
        timestamp: Date.now()
      }

    } catch (error) {
      console.error('Backup failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async createDatabaseDump(): Promise<any> {
    // Export critical tables
    const tables = [
      'user_profiles',
      'vocabulary_analytics', 
      'notion_integrations',
      'learning_sessions',
      'subscription_plans'
    ]

    const dump: any = {}

    for (const table of tables) {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')

      if (error) {
        throw new Error(`Failed to dump table ${table}: ${error.message}`)
      }

      dump[table] = data
    }

    return dump
  }

  async restoreFromBackup(backupName: string): Promise<RestoreResult> {
    try {
      // 1. Download backup from cloud storage
      const backupData = await this.downloadBackupFromCloud(backupName)
      
      // 2. Validate backup integrity
      await this.validateBackup(backupData)
      
      // 3. Create restore point
      const restorePoint = await this.createRestorePoint()
      
      // 4. Restore database
      await this.restoreDatabase(backupData.database)
      
      // 5. Restore files
      await this.restoreStorageFiles(backupData.files)
      
      // 6. Restore configuration
      await this.restoreConfiguration(backupData.config)

      return {
        success: true,
        restoredAt: Date.now(),
        restorePoint
      }

    } catch (error) {
      console.error('Restore failed:', error)
      
      // Attempt rollback to restore point
      await this.rollbackToRestorePoint(restorePoint)
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Schedule automated backups
  async scheduleBackups(): Promise<void> {
    // Daily backups at 2 AM UTC
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting scheduled backup...')
      const result = await this.createBackup()
      
      if (result.success) {
        console.log(`Backup completed: ${result.backupName}`)
        
        // Clean up old backups (keep last 30 days)
        await this.cleanupOldBackups(30)
      } else {
        console.error('Scheduled backup failed:', result.error)
        
        // Send alert
        const alerting = new AlertingService()
        await alerting.sendAlert({
          title: 'Backup Failed',
          message: `Scheduled backup failed: ${result.error}`,
          severity: 'critical',
          service: 'backup-service',
          environment: process.env.NODE_ENV!,
          timestamp: Date.now()
        })
      }
    })
  }
}
```

## Key Takeaways

### 7.1 Deployment Best Practices
1. **Multi-environment Strategy**: Dev → Staging → Production pipeline
2. **Automated Deployments**: CI/CD với GitHub Actions
3. **Environment Validation**: Check required configs before deployment
4. **Database Migrations**: Versioned, rollback-capable migrations
5. **Monitoring Integration**: Health checks, alerts, performance tracking

### 7.2 Scaling Considerations
- ✅ **Database Optimization**: Indexes, partitioning, archiving
- ✅ **Multi-layer Caching**: Memory, Redis, database caching
- ✅ **Rate Limiting**: Distributed rate limiting với Redis
- ✅ **Auto-scaling**: Metric-based scaling decisions
- ✅ **Load Balancing**: Distribute traffic efficiently
- ✅ **CDN Integration**: Static asset optimization

### 7.3 Production Readiness Checklist
- ✅ **Security Headers**: CSP, HSTS, X-Frame-Options
- ✅ **Error Handling**: Graceful degradation, user-friendly errors
- ✅ **Monitoring**: APM, health checks, alerting
- ✅ **Backup Strategy**: Automated backups, tested restore procedures
- ✅ **Documentation**: Deployment guides, runbooks
- ✅ **Performance**: Response time < 2s, 99.9% uptime
- ✅ **Compliance**: GDPR, security best practices