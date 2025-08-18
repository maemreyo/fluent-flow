# Chrome Extension Development Best Practices

Tập hợp các best practices và lessons learned từ việc phát triển Word Wizard extension.

## 1. Architecture Principles

### 1.1 Clean Architecture
- **Single Responsibility**: Mỗi class/function chỉ làm một việc
- **Dependency Inversion**: Depend on abstractions, not concretions
- **Open/Closed**: Open for extension, closed for modification
- **Interface Segregation**: Nhiều interfaces nhỏ hơn là một interface lớn

### 1.2 SOLID Principles trong Chrome Extension
```typescript
// Single Responsibility - Mỗi handler chỉ xử lý một loại message
export class WordLookupHandler {
  async handle(message: WordLookupMessage): Promise<WordLookupResponse> {
    // Chỉ xử lý word lookup
  }
}

// Open/Closed - Dễ extend với providers mới
export abstract class AIProvider {
  abstract generateText(prompt: string): Promise<string>
}

export class OpenAIProvider extends AIProvider {
  generateText(prompt: string): Promise<string> {
    // OpenAI implementation
  }
}

// Dependency Inversion - Depend on interface
export class AIService {
  constructor(private provider: AIProvider) {} // Interface, not concrete
}
```

## 2. Code Organization Best Practices

### 2.1 File Naming Conventions
```
✅ Correct:
- word-lookup-handler.ts    (kebab-case cho files)
- WordLookupService        (PascalCase cho classes)
- useWordLookup           (camelCase cho hooks/functions)
- STORAGE_KEYS            (UPPER_CASE cho constants)

❌ Avoid:
- wordLookupHandler.ts    (inconsistent casing)
- word_lookup_service.ts  (snake_case)
```

### 2.2 Import Organization
```typescript
// 1. External libraries
import React from "react"
import { Storage } from "@plasmohq/storage"

// 2. Internal types
import type { WordData, SaveOptions } from "../types"

// 3. Internal services/utils
import { NotionService } from "../services/notion-service"
import { validateInput } from "../utils/validation"

// 4. Components (if applicable)
import { Button } from "../components/ui/button"
```

### 2.3 Export Patterns
```typescript
// lib/services/index.ts - Barrel exports
export { AIService } from "./ai-service"
export { NotionService } from "./notion-service"
export { CacheService } from "./cache-service"

// Named exports preferred over default
export class AIService {} // ✅
export default class AIService {} // ❌ Avoid

// Types và interfaces
export type { WordData, SaveResult } from "./types"
```

## 3. Error Handling Best Practices

### 3.1 Structured Error Handling
```typescript
// Define error types
export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'ExtensionError'
  }
}

// Service layer - throw business errors
export class AIService {
  async lookupWord(text: string): Promise<WordData> {
    try {
      const result = await this.provider.generateText(prompt)
      return this.parseResponse(result)
    } catch (error) {
      // Transform to business error
      throw new ExtensionError(
        'Failed to lookup word',
        'AI_LOOKUP_FAILED',
        { text, provider: this.provider.name }
      )
    }
  }
}

// Handler layer - catch và transform
export async function handleWordLookup(text: string, sendResponse: Function) {
  try {
    const result = await aiService.lookupWord(text)
    sendResponse({ success: true, data: result })
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      context: error.context
    })
  }
}
```

### 3.2 User-Friendly Error Messages
```typescript
export function getErrorMessage(error: ExtensionError): string {
  const messages: Record<string, string> = {
    'AI_LOOKUP_FAILED': '🤖 AI service is temporarily unavailable. Please try again.',
    'QUOTA_EXCEEDED': '📊 Daily quota reached. Please upgrade your plan or try tomorrow.',
    'AUTH_FAILED': '🔑 Authentication failed. Please check your API key in settings.',
    'NETWORK_ERROR': '🌐 Network connection failed. Please check your internet connection.',
    'VALIDATION_ERROR': '⚠️ Invalid input. Please check your data and try again.'
  }

  return messages[error.code] || `❌ ${error.message}`
}
```

## 4. Performance Best Practices

### 4.1 Caching Strategy
```typescript
export class SmartCacheService {
  private memoryCache = new Map<string, any>()
  private storageCache: StorageService

  constructor() {
    this.storageCache = new StorageService()
  }

  async get<T>(key: string): Promise<T | null> {
    // 1. Check memory cache first (fastest)
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key)
      if (!this.isExpired(item)) {
        return item.data
      }
      this.memoryCache.delete(key)
    }

    // 2. Check storage cache (slower but persistent)
    const stored = await this.storageCache.get<CachedItem<T>>(key)
    if (stored && !this.isExpired(stored)) {
      // Put back in memory for faster access
      this.memoryCache.set(key, stored)
      return stored.data
    }

    return null
  }

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const item = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    }

    // Store in both caches
    this.memoryCache.set(key, item)
    await this.storageCache.set(key, item)
  }
}
```

### 4.2 Rate Limiting Implementation
```typescript
export class RateLimitService {
  private requests = new Map<string, number[]>()

  canMakeRequest(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < windowMs)
    
    if (validRequests.length >= maxRequests) {
      return false
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(key, validRequests)
    
    return true
  }

  getRetryAfter(key: string, windowMs: number): number {
    const requests = this.requests.get(key) || []
    if (requests.length === 0) return 0
    
    const oldestRequest = Math.min(...requests)
    const retryAfter = windowMs - (Date.now() - oldestRequest)
    
    return Math.max(0, retryAfter)
  }
}
```

### 4.3 Lazy Loading Pattern
```typescript
export class ServiceContainer {
  private services = new Map<string, any>()
  private factories = new Map<string, () => any>()

  register<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory)
  }

  get<T>(name: string): T {
    // Lazy initialization - only create when needed
    if (!this.services.has(name)) {
      const factory = this.factories.get(name)
      if (!factory) {
        throw new Error(`Service ${name} not registered`)
      }
      
      const instance = factory()
      this.services.set(name, instance)
    }
    
    return this.services.get(name)
  }
}
```

## 5. Security Best Practices

### 5.1 API Key Management
```typescript
// ❌ Never do this
const API_KEY = "sk-1234567890" // Hardcoded in source

// ✅ Correct approach
export class ConfigService {
  async getApiKey(provider: string): Promise<string> {
    // Only accessible from background script
    const key = await chrome.storage.local.get(`${provider}_api_key`)
    
    if (!key) {
      throw new ExtensionError(
        'API key not configured',
        'MISSING_API_KEY',
        { provider }
      )
    }
    
    return key
  }

  async setApiKey(provider: string, key: string): Promise<void> {
    // Validate before storing
    if (!this.isValidApiKey(key)) {
      throw new ExtensionError(
        'Invalid API key format',
        'INVALID_API_KEY'
      )
    }
    
    await chrome.storage.local.set({ [`${provider}_api_key`]: key })
  }
}
```

### 5.2 Input Sanitization
```typescript
export class InputSanitizer {
  static sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove JS protocols
      .substring(0, 1000) // Limit length
  }

  static validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      // Only allow HTTPS
      return parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Only alphanumeric and basic chars
      .substring(0, 100) // Limit length
  }
}
```

### 5.3 Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https: wss:"
  },
  "permissions": [
    "storage",
    "activeTab"
  ],
  "optional_permissions": [
    "notifications"
  ]
}
```

## 6. Testing Best Practices

### 6.1 Test Structure
```typescript
// Service testing - isolated unit tests
describe('AIService', () => {
  let aiService: AIService
  let mockProvider: jest.Mocked<AIProvider>

  beforeEach(() => {
    mockProvider = {
      generateText: jest.fn()
    }
    aiService = new AIService(mockProvider)
  })

  describe('lookupWord', () => {
    it('should return word data for valid input', async () => {
      mockProvider.generateText.mockResolvedValue('mock response')
      
      const result = await aiService.lookupWord('test')
      
      expect(result).toBeDefined()
      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('test')
      )
    })

    it('should throw error for invalid input', async () => {
      await expect(aiService.lookupWord(''))
        .rejects.toThrow('Invalid input')
    })
  })
})
```

### 6.2 Chrome API Mocking
```typescript
// Setup for Chrome API testing
beforeAll(() => {
  global.chrome = {
    runtime: {
      sendMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn()
      }
    },
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined)
      }
    },
    tabs: {
      query: jest.fn(),
      sendMessage: jest.fn()
    }
  } as any
})
```

## 7. Deployment Best Practices

### 7.1 Build Optimization
```typescript
// Build script optimizations
export const plasmoConfig = {
  // Minimize bundle size
  bundle: {
    minify: true,
    sourcemap: process.env.NODE_ENV === 'development'
  },
  
  // Optimize for production
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
}
```

### 7.2 Version Management
```json
{
  "version": "1.2.0",
  "version_name": "1.2.0-beta",
  "manifest_version": 3,
  "update_url": "https://clients2.google.com/service/update2/crx"
}
```

### 7.3 Pre-deployment Checklist
```bash
#!/bin/bash
# pre-deploy.sh

echo "🔍 Running pre-deployment checks..."

# 1. Type checking
pnpm typecheck || exit 1

# 2. Linting
pnpm lint || exit 1

# 3. Tests
pnpm test || exit 1

# 4. Build
pnpm build || exit 1

# 5. Size check
SIZE=$(du -sh build | cut -f1)
echo "📦 Build size: $SIZE"

# 6. Manifest validation
node scripts/validate-manifest.js || exit 1

echo "✅ All checks passed! Ready for deployment."
```

## 8. Monitoring và Logging

### 8.1 Structured Logging
```typescript
export class Logger {
  private static instance: Logger
  private isProduction = process.env.NODE_ENV === 'production'

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  info(message: string, context?: any): void {
    if (!this.isProduction) {
      console.log(`[INFO] ${message}`, context)
    }
    this.sendToAnalytics('info', message, context)
  }

  error(message: string, error?: Error, context?: any): void {
    console.error(`[ERROR] ${message}`, error, context)
    this.sendToAnalytics('error', message, { error: error?.message, ...context })
  }

  private sendToAnalytics(level: string, message: string, context?: any): void {
    // Send to analytics service (non-PII data only)
    if (this.isProduction) {
      // Implement analytics reporting
    }
  }
}
```

### 8.2 Performance Monitoring
```typescript
export class PerformanceMonitor {
  private static metrics = new Map<string, number>()

  static start(operation: string): void {
    this.metrics.set(operation, performance.now())
  }

  static end(operation: string): number {
    const startTime = this.metrics.get(operation)
    if (!startTime) return 0
    
    const duration = performance.now() - startTime
    this.metrics.delete(operation)
    
    Logger.getInstance().info(`Performance: ${operation}`, { 
      duration: `${duration.toFixed(2)}ms` 
    })
    
    return duration
  }

  static measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.start(operation)
      try {
        const result = await fn()
        this.end(operation)
        resolve(result)
      } catch (error) {
        this.end(operation)
        reject(error)
      }
    })
  }
}

// Usage
await PerformanceMonitor.measure('word-lookup', () => 
  aiService.lookupWord(selectedText)
)
```

## 9. Maintenance Best Practices

### 9.1 Documentation Standards
```typescript
/**
 * Looks up word definition using AI service
 * 
 * @param selectedText - The text selected by user (max 100 chars)
 * @param options - Lookup options
 * @returns Promise resolving to word data
 * 
 * @throws {ExtensionError} When AI service fails
 * @throws {ExtensionError} When input validation fails
 * 
 * @example
 * ```typescript
 * const wordData = await lookupWord('example', { includeImage: true })
 * console.log(wordData.definition)
 * ```
 */
export async function lookupWord(
  selectedText: string,
  options: LookupOptions = {}
): Promise<WordData> {
  // Implementation
}
```

### 9.2 Migration Strategy
```typescript
export class MigrationService {
  private migrations: Migration[] = [
    {
      version: '1.1.0',
      migrate: this.migrateToV110.bind(this)
    },
    {
      version: '1.2.0', 
      migrate: this.migrateToV120.bind(this)
    }
  ]

  async runMigrations(): Promise<void> {
    const currentVersion = await this.getCurrentVersion()
    
    for (const migration of this.migrations) {
      if (this.shouldRunMigration(currentVersion, migration.version)) {
        await migration.migrate()
        await this.setVersion(migration.version)
      }
    }
  }

  private async migrateToV110(): Promise<void> {
    // Migrate storage format from v1.0.x to v1.1.0
    const oldData = await chrome.storage.local.get('vocabulary')
    if (oldData.vocabulary) {
      const newFormat = this.transformToNewFormat(oldData.vocabulary)
      await chrome.storage.local.set({ 'vocabulary_v2': newFormat })
      await chrome.storage.local.remove('vocabulary')
    }
  }
}
```

## 10. Key Takeaways

### 10.1 Golden Rules
1. **Background script = Router only** - No business logic
2. **Services = Pure business logic** - No Chrome APIs  
3. **Always validate input** - Never trust user data
4. **Handle errors gracefully** - User-friendly messages
5. **Cache intelligently** - Memory + Storage combination
6. **Rate limit everything** - Protect external APIs
7. **Test thoroughly** - Unit tests cho services
8. **Monitor performance** - Track key metrics
9. **Document decisions** - Future self will thank you
10. **Plan for scale** - Design cho growth

### 10.2 Anti-patterns to Avoid
- ❌ Business logic trong background script
- ❌ Chrome APIs trong services  
- ❌ Hardcoded API keys
- ❌ Synchronous operations without timeout
- ❌ Ignoring error cases
- ❌ No input validation
- ❌ Mixing concerns trong components
- ❌ No caching strategy
- ❌ Poor error messages
- ❌ No performance monitoring

### 10.3 Success Metrics
- 📊 **Code Quality**: TypeScript strict mode, ESLint clean
- 🚀 **Performance**: < 2s response times, < 5MB memory usage
- 🛡️ **Security**: No hardcoded secrets, input validation
- 🧪 **Testing**: > 80% coverage, all critical paths tested
- 📚 **Documentation**: All public APIs documented
- 🔧 **Maintainability**: Clear separation of concerns
- 👥 **User Experience**: Graceful error handling, responsive UI