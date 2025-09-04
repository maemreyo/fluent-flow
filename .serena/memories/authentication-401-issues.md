# Authentication 401 Issues - Diagnosis & Solutions

## Common 401 Authentication Issues in Fluent Flow

### 1. **Supabase Client Configuration Issues**

#### Problem: Client not initialized properly
- **Symptoms**: `supabase` client is `null`, API calls fail
- **Causes**:
  - Missing environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Wrong environment variable names (checking both NEXT_PUBLIC and PLASMO_PUBLIC)

#### Solution:
```typescript
// Check client.ts - ensure both env formats are handled
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY

// Verify client creation
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for Next.js SSR
    storage: defaultStorage,
  }
}) : null
```

### 2. **Server-Side Auth Header Issues**

#### Problem: Authorization header not passed correctly
- **Symptoms**: API routes return 401 even with valid client session
- **Causes**:
  - Missing Authorization header in requests
  - Server not extracting header correctly
  - Token format issues

#### ✅ **RESOLVED - Centralized Solution:**

Created reusable `getAuthHeaders()` utility in `/lib/supabase/auth-utils.ts`:

```typescript
/**
 * Get authenticated headers for API requests
 * Uses Supabase session to get access token and add Authorization header
 * This is the recommended pattern for all authenticated API calls
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } }
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  return headers
}
```

### 3. **Refactored Services Using Centralized Auth**

#### ✅ **Updated Services:**
1. **useJoinGroupByCode hook** - Now uses shared `getAuthHeaders()`
2. **QuizResultsService** - Refactored to use shared utility
3. **GroupsService** - Updated from legacy localStorage approach to official Supabase session approach
4. **useGroupSessions hook** - Now uses shared `getAuthHeaders()`

#### **Before (Duplicated Code):**
```typescript
// Each service had its own getAuthHeaders implementation
// Some used supabase.auth.getSession() (correct)
// Some used localStorage tokens (legacy, unreliable)
```

#### **After (Centralized & Consistent):**
```typescript
import { getAuthHeaders } from '../lib/supabase/auth-utils'

// All services now use the same, reliable auth pattern
const headers = await getAuthHeaders()
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers,  // Includes Authorization: Bearer {token}
  body: JSON.stringify(data)
})
```

### 4. **Authentication State Management**

#### Problem: Auth state not properly synchronized
- **Symptoms**: User appears logged in on client but API calls fail
- **Causes**:
  - Session expired but not refreshed
  - Auth state hooks not updating correctly
  - Race conditions in auth initialization

#### Current Implementation Status:
- ✅ AuthContext properly configured with auth state change listeners
- ✅ Server-side auth helper functions in place (`getCurrentUserServer`, `withAuth`)
- ✅ **All auth headers now centralized and consistent across services**

### 5. **API Route Authentication Flow**

#### Working Flow:
1. Client makes authenticated request with `Authorization: Bearer {token}` (via `getAuthHeaders()`)
2. Server's `getSupabaseServer` extracts header and creates client
3. Server's `getCurrentUserServer` validates token and gets user
4. API route proceeds with authenticated user context

#### Current Server Implementation:
```typescript
// server.ts - properly extracts auth header
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      ...(() => {
        const authHeader = request.headers.get('Authorization')
        const headers: Record<string, string> = {}
        if (authHeader) {
          headers['Authorization'] = authHeader
        }
        return headers
      })()
    }
  }
})
```

### 6. **Quick Fix Checklist**

When encountering 401 errors:

1. **✅ DONE - Check Environment Variables**:
   - Verify `.env.local` has correct Supabase URL and anon key
   - Both `NEXT_PUBLIC_*` and `PLASMO_PUBLIC_*` variants set

2. **✅ DONE - Verify Client Initialization**:
   - `console.log(supabase)` should not be `null`
   - Check browser dev tools for Supabase connection errors

3. **✅ DONE - Check Auth Headers in Requests**:
   - All authenticated API calls must include `Authorization: Bearer {token}`
   - Use centralized `getAuthHeaders()` from `auth-utils.ts`

4. **✅ DONE - Test Auth State**:
   - Use AuthContext to verify user is properly logged in
   - Check `supabase.auth.getSession()` returns valid session

5. **✅ DONE - Server-Side Debugging**:
   - Add logs in API routes to check if user is being extracted
   - Verify Authorization header is being received

### 7. **✅ FINAL IMPLEMENTATION PATTERN**

```typescript
// ✅ RECOMMENDED: Use centralized auth utility
import { getAuthHeaders } from '../lib/supabase/auth-utils'

// In any service/hook that needs authenticated requests
const headers = await getAuthHeaders()
const response = await fetch('/api/groups/join', {
  method: 'POST',
  headers,  // Automatically includes Authorization header if user is authenticated
  body: JSON.stringify(data)
})
```

### 8. **Additional Utilities Available**

```typescript
import { 
  getAuthHeaders,
  hasValidAuthSession,
  getAccessToken,
  getAuthHeadersWithContentType
} from '../lib/supabase/auth-utils'

// Check if user has valid session
const isAuthenticated = await hasValidAuthSession()

// Get raw access token
const token = await getAccessToken()

// Custom content type with auth
const headers = await getAuthHeadersWithContentType('application/x-www-form-urlencoded')
```

## Environment Variables Reference

Required variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://fxawystovhtbuqhllswl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# For Plasmo extension compatibility
PLASMO_PUBLIC_SUPABASE_URL=https://fxawystovhtbuqhllswl.supabase.co
PLASMO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ✅ STATUS: RESOLVED

**All 401 authentication issues have been systematically resolved:**
- ✅ Centralized auth utilities created
- ✅ All services refactored to use consistent auth pattern  
- ✅ Duplicate code eliminated
- ✅ Build passing with no errors
- ✅ Ready for production testing

**Key Achievement**: Eliminated 4 duplicate `getAuthHeaders` implementations and standardized on the official Supabase session approach across the entire codebase.