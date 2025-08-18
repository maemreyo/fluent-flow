# Chrome Extension Starter Templates

Bộ templates và boilerplate code để khởi tạo Chrome Extension nhanh chóng với architecture patterns đã được test.

## 1. Project Structure Template

### 1.1 Cấu trúc thư mục chuẩn
```
chrome-extension-project/
├── manifest.json                    # Extension manifest
├── background.ts                    # Background script (router only)
├── content/                         # Content scripts
│   ├── main.ts                     # Main content script
│   └── word-lookup.ts              # Feature-specific content
├── popup.tsx                       # Extension popup
├── sidepanel.tsx                   # Side panel UI  
├── options.tsx                     # Options page
├── newtab.tsx                      # New tab override (optional)
├── lib/
│   ├── background/                 # Background handlers
│   │   ├── message-handlers.ts     # Message handlers
│   │   ├── feature-handler.ts      # Feature-specific handlers
│   │   └── index.ts               # Handler exports
│   ├── services/                   # Business logic services
│   │   ├── api-service.ts         # External API service
│   │   ├── storage-service.ts     # Storage abstraction
│   │   ├── cache-service.ts       # Caching service
│   │   └── index.ts              # Service exports
│   ├── utils/                     # Utilities
│   │   ├── constants.ts           # Constants
│   │   ├── storage.ts            # Storage helpers
│   │   ├── text-utils.ts         # Text processing
│   │   └── validation.ts         # Validation helpers
│   └── types/                     # TypeScript types
│       ├── api.ts                # API response types
│       ├── storage.ts            # Storage types
│       └── index.ts              # Type exports
├── components/                    # React components
│   ├── ui/                       # Base UI components
│   └── features/                 # Feature components
├── hooks/                        # Custom React hooks
├── styles/                       # CSS/styling
└── assets/                       # Static assets
```

### 1.2 Package.json Template
```json
{
  "name": "chrome-extension-starter",
  "version": "1.0.0",
  "description": "Chrome Extension with clean architecture",
  "scripts": {
    "dev": "plasmo dev",
    "build": "plasmo build", 
    "package": "plasmo package",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@plasmohq/storage": "^1.9.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "plasmo": "^0.88.0"
  },
  "devDependencies": {
    "@types/chrome": "0.0.258",
    "@types/react": "18.2.48",
    "@types/react-dom": "18.2.18",
    "typescript": "5.3.3",
    "eslint": "^8.56.0",
    "prettier": "3.2.4"
  },
  "manifest": {
    "host_permissions": ["https://*/*"],
    "permissions": ["storage", "activeTab"],
    "side_panel": {
      "default_path": "sidepanel.html"
    }
  }
}
```

## 2. Background Script Template

### 2.1 Background.ts - Pure Router
```typescript
// background.ts
import { handleFeatureMessage } from "./lib/background/feature-handler"
import { handleApiMessage } from "./lib/background/api-handler"
import { handleStorageMessage } from "./lib/background/storage-handler"

console.log("Extension background script loaded")

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "main-action",
    title: "Process with Extension",
    contexts: ["selection"]
  })
})

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "main-action" && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_POPUP",
      selectedText: info.selectionText
    })
  }
})

// Keyboard shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "main-shortcut" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "GET_SELECTED_TEXT"
    })
  }
})

// Message router - ONLY routing logic
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "PROCESS_FEATURE":
      handleFeatureMessage(message.data, sendResponse)
      return true

    case "API_CALL":
      handleApiMessage(message.endpoint, message.data, sendResponse)
      return true

    case "STORAGE_OPERATION":
      handleStorageMessage(message.operation, message.key, message.value, sendResponse)
      return true

    case "OPEN_SIDE_PANEL":
      handleSidePanelOpen(message, sender)
      break

    default:
      console.warn("Unknown message type:", message.type)
  }
})

// Side panel handler
function handleSidePanelOpen(message: any, sender: chrome.runtime.MessageSender) {
  if (sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id })
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id })
      }
    })
  }
}
```

### 2.2 Handler Template
```typescript
// lib/background/feature-handler.ts
import { ApiService } from "../services/api-service"
import { CacheService } from "../services/cache-service"
import { validateInput } from "../utils/validation"

export async function handleFeatureMessage(
  data: any,
  sendResponse: Function
) {
  try {
    // 1. Input validation
    const validationResult = validateInput(data)
    if (!validationResult.isValid) {
      throw new Error(validationResult.error)
    }

    // 2. Check cache
    const cacheService = new CacheService()
    const cacheKey = `feature:${JSON.stringify(data)}`
    const cached = await cacheService.get(cacheKey)
    
    if (cached) {
      sendResponse({ success: true, data: cached })
      return
    }

    // 3. Business logic via services
    const apiService = new ApiService()
    const result = await apiService.processFeature(data)

    // 4. Cache result
    await cacheService.set(cacheKey, result, 300000) // 5 minutes

    sendResponse({ success: true, data: result })
  } catch (error) {
    console.error('Feature processing failed:', error)
    sendResponse({
      success: false,
      error: error.message,
      code: error.code || 'FEATURE_ERROR'
    })
  }
}
```

## 3. Service Layer Templates

### 3.1 Base Service Template  
```typescript
// lib/services/base-service.ts
export abstract class BaseService {
  protected handleError(error: any, context: string): never {
    console.error(`${context} error:`, error)
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again')
    }
    
    if (!navigator.onLine) {
      throw new Error('No internet connection')
    }
    
    throw new Error(`${context} failed: ${error.message}`)
  }

  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    timeout: number = 30000
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}
```

### 3.2 API Service Template
```typescript
// lib/services/api-service.ts
import { BaseService } from "./base-service"

export interface ApiConfig {
  baseUrl: string
  apiKey?: string
  timeout?: number
}

export class ApiService extends BaseService {
  private config: ApiConfig

  constructor(config?: ApiConfig) {
    super()
    this.config = config || this.getDefaultConfig()
  }

  async processFeature(data: any): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`
      }

      const result = await this.makeRequest<any>(
        `${this.config.baseUrl}/process`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(data)
        },
        this.config.timeout
      )

      return this.transformResponse(result)
    } catch (error) {
      this.handleError(error, 'API processing')
    }
  }

  private getDefaultConfig(): ApiConfig {
    return {
      baseUrl: 'https://api.example.com',
      timeout: 30000
    }
  }

  private transformResponse(response: any): any {
    // Transform API response to internal format
    return response
  }
}
```

### 3.3 Storage Service Template
```typescript
// lib/services/storage-service.ts
import { BaseService } from "./base-service"

export class StorageService extends BaseService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key)
      return result[key] || null
    } catch (error) {
      this.handleError(error, 'Storage get')
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value })
    } catch (error) {
      this.handleError(error, 'Storage set')
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key)
    } catch (error) {
      this.handleError(error, 'Storage remove')
    }
  }

  async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear()
    } catch (error) {
      this.handleError(error, 'Storage clear')
    }
  }
}
```

### 3.4 Cache Service Template
```typescript
// lib/services/cache-service.ts
import { StorageService } from "./storage-service"

interface CachedItem<T> {
  data: T
  timestamp: number
  ttl: number
}

export class CacheService {
  private storageService: StorageService
  private readonly CACHE_PREFIX = 'cache:'

  constructor() {
    this.storageService = new StorageService()
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key)
      const cached = await this.storageService.get<CachedItem<T>>(cacheKey)
      
      if (!cached) {
        return null
      }

      // Check if expired
      if (Date.now() - cached.timestamp > cached.ttl) {
        await this.storageService.remove(cacheKey)
        return null
      }

      return cached.data
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set<T>(key: string, data: T, ttlMs: number = 300000): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key)
      const cached: CachedItem<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs
      }
      
      await this.storageService.set(cacheKey, cached)
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  async invalidate(key: string): Promise<void> {
    const cacheKey = this.getCacheKey(key)
    await this.storageService.remove(cacheKey)
  }

  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`
  }
}
```

## 4. UI Layer Templates

### 4.1 Custom Hook Template
```typescript
// hooks/use-feature.ts
import { useState, useCallback } from "react"

export interface FeatureData {
  // Define your data structure
}

export function useFeature() {
  const [data, setData] = useState<FeatureData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFeature = useCallback(async (input: any) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await chrome.runtime.sendMessage({
        type: "PROCESS_FEATURE",
        data: input
      })

      if (response.success) {
        setData(response.data)
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError('Processing failed')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearData = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return {
    data,
    isLoading,
    error,
    processFeature,
    clearData
  }
}
```

### 4.2 Component Template
```typescript
// components/features/FeatureComponent.tsx
import React from "react"
import { useFeature } from "../../hooks/use-feature"

interface FeatureComponentProps {
  initialData?: any
  onComplete?: (result: any) => void
}

export function FeatureComponent({ 
  initialData, 
  onComplete 
}: FeatureComponentProps) {
  const { data, isLoading, error, processFeature } = useFeature()

  const handleSubmit = async (formData: any) => {
    const result = await processFeature(formData)
    if (result && onComplete) {
      onComplete(result)
    }
  }

  if (isLoading) {
    return <div className="loading">Processing...</div>
  }

  if (error) {
    return (
      <div className="error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  return (
    <div className="feature-component">
      {data ? (
        <div className="results">
          {/* Render results */}
        </div>
      ) : (
        <div className="input">
          {/* Render input form */}
        </div>
      )}
    </div>
  )
}
```

## 5. Utility Templates

### 5.1 Constants Template
```typescript
// lib/utils/constants.ts
export const API_ENDPOINTS = {
  PROCESS: '/api/process',
  SEARCH: '/api/search',
  SAVE: '/api/save'
} as const

export const STORAGE_KEYS = {
  API_KEY: 'api_key',
  USER_CONFIG: 'user_config',
  CACHE_CONFIG: 'cache_config'
} as const

export const ERROR_CODES = {
  AUTH_FAILED: 'AUTH_FAILED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const

export const TIMING = {
  REQUEST_TIMEOUT: 30000,
  CACHE_TTL: 300000,
  RETRY_DELAY: 1000
} as const
```

### 5.2 Validation Template
```typescript
// lib/utils/validation.ts
export interface ValidationResult {
  isValid: boolean
  error?: string
}

export function validateInput(data: any): ValidationResult {
  if (!data) {
    return { isValid: false, error: 'Data is required' }
  }

  if (typeof data !== 'object') {
    return { isValid: false, error: 'Data must be an object' }
  }

  // Add specific validation rules
  return { isValid: true }
}

export function validateApiKey(apiKey: string): ValidationResult {
  if (!apiKey || apiKey.trim().length === 0) {
    return { isValid: false, error: 'API key is required' }
  }

  if (apiKey.length < 10) {
    return { isValid: false, error: 'API key too short' }
  }

  return { isValid: true }
}

export function validateUrl(url: string): ValidationResult {
  try {
    new URL(url)
    return { isValid: true }
  } catch {
    return { isValid: false, error: 'Invalid URL format' }
  }
}
```

## 6. Configuration Templates

### 6.1 TypeScript Config
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./lib/*"],
      "@/components/*": ["./components/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/types/*": ["./lib/types/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "build"
  ]
}
```

### 6.2 ESLint Config
```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks'
  ],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}
```

## 7. Testing Templates

### 7.1 Service Test Template
```typescript
// lib/services/__tests__/api-service.test.ts
import { ApiService } from '../api-service'

// Mock fetch
global.fetch = jest.fn()

describe('ApiService', () => {
  let apiService: ApiService
  
  beforeEach(() => {
    apiService = new ApiService({
      baseUrl: 'https://test-api.com',
      apiKey: 'test-key'
    })
    
    // Reset fetch mock
    ;(fetch as jest.Mock).mockReset()
  })

  it('should process feature successfully', async () => {
    const mockResponse = { success: true, data: 'result' }
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const result = await apiService.processFeature({ input: 'test' })

    expect(result).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith(
      'https://test-api.com/process',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key'
        })
      })
    )
  })

  it('should handle API errors', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    })

    await expect(apiService.processFeature({}))
      .rejects.toThrow('API processing failed: HTTP 400: Bad Request')
  })
})
```

## 8. Quick Start Script

### 8.1 Setup Script
```bash
#!/bin/bash
# setup-extension.sh

echo "Setting up Chrome Extension with clean architecture..."

# Create project structure
mkdir -p lib/background lib/services lib/utils lib/types
mkdir -p components/ui components/features
mkdir -p hooks styles assets

# Create basic files
touch background.ts popup.tsx sidepanel.tsx options.tsx
touch lib/background/index.ts lib/services/index.ts
touch lib/utils/constants.ts lib/utils/validation.ts
touch lib/types/index.ts

# Copy templates (customize as needed)
echo "// TODO: Implement background script" > background.ts
echo "// TODO: Implement popup" > popup.tsx

echo "✅ Project structure created!"
echo "📝 Next steps:"
echo "   1. Update package.json with your extension details"
echo "   2. Implement your background handlers"
echo "   3. Create your services"
echo "   4. Build your UI components"
echo "   5. Run 'pnpm dev' to start development"
```

## Quick Start Checklist

- [ ] Set up project structure using templates
- [ ] Configure package.json with permissions needed
- [ ] Implement background.ts as pure router
- [ ] Create handlers in lib/background/
- [ ] Implement services in lib/services/
- [ ] Add utilities in lib/utils/
- [ ] Create React components
- [ ] Add custom hooks for state management
- [ ] Configure TypeScript and ESLint
- [ ] Write tests for services and handlers
- [ ] Test extension in Chrome