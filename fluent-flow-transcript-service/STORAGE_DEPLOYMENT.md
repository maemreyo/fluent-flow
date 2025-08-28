# Storage Deployment Strategy

## Current State
- **Development**: In-memory storage using `globalThis.__sharedQuestions` Map
- **Location**: `/src/lib/shared-storage.ts`
- **Persistence**: Only during development session (lost on server restart)

## Production Deployment Options

### Option 1: Database (Recommended)
```typescript
// Replace shared-storage.ts with database implementation
import { PrismaClient } from '@prisma/client'
// or
import { createClient } from '@supabase/supabase-js'

export class DatabaseStorage {
  async setSharedQuestions(token: string, data: any) {
    // Store in database
  }
  
  async getSharedQuestions(token: string) {
    // Retrieve from database
  }
}
```

**Providers:**
- **Supabase** (easiest, free tier available)
- **PlanetScale** (MySQL, free tier)
- **Railway** (PostgreSQL, free tier)
- **Vercel Postgres** (if deploying on Vercel)

### Option 2: Redis (For high performance)
```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export const sharedQuestions = {
  async set(key: string, value: any) {
    await redis.setex(key, 3600 * 24 * 7, JSON.stringify(value)) // 7 days TTL
  },
  
  async get(key: string) {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  }
}
```

**Providers:**
- **Upstash Redis** (serverless, free tier)
- **Railway Redis** (managed Redis)

### Option 3: File System (Not recommended for serverless)
```typescript
import fs from 'fs/promises'
import path from 'path'

const STORAGE_DIR = '/tmp/shared-questions'

export const sharedQuestions = {
  async set(key: string, value: any) {
    await fs.writeFile(
      path.join(STORAGE_DIR, `${key}.json`), 
      JSON.stringify(value)
    )
  }
}
```

## Recommended Implementation Steps

1. **Choose Supabase** (easiest setup)
2. **Create table**:
```sql
CREATE TABLE shared_questions (
  token VARCHAR(255) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);
```

3. **Replace shared-storage.ts**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export const sharedQuestions = {
  async set(token: string, data: any) {
    const { error } = await supabase
      .from('shared_questions')
      .upsert({ token, data })
    if (error) throw error
  },

  async get(token: string) {
    const { data, error } = await supabase
      .from('shared_questions')
      .select('data')
      .eq('token', token)
      .single()
    
    if (error) return null
    return data?.data
  }
}
```

4. **Environment variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

## Current Storage Location
- **File**: `/src/lib/shared-storage.ts`  
- **Usage**: All API routes import from this file
- **Data**: Persists in `globalThis.__sharedQuestions` during development

## Migration Plan
1. Set up database (Supabase recommended)
2. Update `shared-storage.ts` with async database calls
3. Update all API routes to use `await` for storage operations
4. Add error handling for database failures
5. Test thoroughly before deployment