# Storage Deployment Strategy

## Current State
- **Development**: In-memory storage with auto-expiration using `globalThis.__sharedQuestions` Map
- **Location**: `/src/lib/shared-storage.ts`
- **Persistence**: 4 hours (perfect for classroom sessions)
- **Auto-cleanup**: Every 30 minutes to remove expired links
- **Features**: 
  - Automatic expiration after 4 hours
  - Real-time expiration checking
  - Background cleanup scheduler
  - Expiration warnings for users

## Future Requirements: Authentication & Group Management

### Auth System Requirements
- **User Groups**: Teachers need to manage groups of students
- **Access Control**: Restrict question access to specific groups
- **User Roles**: Teacher, Student, Admin roles
- **Session Management**: Track user progress and completion status

### Additional Features Needed:
- **User Registration/Login**: Student accounts within teacher groups
- **Group Creation**: Teachers create and manage student groups  
- **Question Assignment**: Assign specific question sets to groups
- **Progress Tracking**: Monitor student completion and scores
- **Analytics Dashboard**: Group performance analytics for teachers

## Production Deployment Options

### Option 1: Database (Recommended for Auth System)

**For Basic Sharing (Current):**
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

**For Future Auth System:**
```sql
-- Required tables for group management
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  role ENUM('teacher', 'student', 'admin'),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE groups (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  teacher_id UUID REFERENCES users(id),
  access_code VARCHAR(10) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id),
  student_id UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (group_id, student_id)
);

CREATE TABLE shared_questions (
  token VARCHAR(255) PRIMARY KEY,
  data JSONB NOT NULL,
  creator_id UUID REFERENCES users(id),
  group_id UUID REFERENCES groups(id), -- NULL for public links
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '4 hours')
);
```

**Providers:**
- **Supabase** (easiest, free tier available)
- **PlanetScale** (MySQL, free tier)
- **Railway** (PostgreSQL, free tier)
- **Vercel Postgres** (if deploying on Vercel)

### Option 2: Redis with TTL (Perfect for classroom sessions)
```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export const sharedQuestions = {
  async set(key: string, value: any, expirationHours = 4) {
    const ttl = expirationHours * 60 * 60 // Convert to seconds
    await redis.setex(key, ttl, JSON.stringify(value))
    return {
      expiresAt: Date.now() + (ttl * 1000),
      expiresIn: ttl * 1000
    }
  },
  
  async get(key: string) {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  },

  async ttl(key: string) {
    return await redis.ttl(key) // Returns remaining seconds
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

### Phase 1: Basic Database Migration (Current System)
1. Set up database (Supabase recommended)
2. Update `shared-storage.ts` with async database calls
3. Update all API routes to use `await` for storage operations
4. Add error handling for database failures
5. Test thoroughly before deployment

### Phase 2: Auth System Implementation (Future)
1. **Authentication Setup**:
   - Implement NextAuth.js or Supabase Auth
   - Add login/signup pages
   - Create user role management

2. **Group Management**:
   - Teacher dashboard for group creation
   - Student enrollment via access codes
   - Group member management

3. **Enhanced Question Sharing**:
   - Restrict questions to specific groups
   - Track individual student progress
   - Add completion analytics

4. **API Updates**:
   - Add authentication middleware
   - Update question endpoints for group access
   - Add user and group management endpoints

### Recommended Auth Stack:
- **Supabase Auth** (simplest, includes Row Level Security)
- **NextAuth.js** (more flexible, works with any database)
- **Clerk** (comprehensive auth solution with groups)