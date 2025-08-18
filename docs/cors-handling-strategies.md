# CORS Handling Strategies for Chrome Extensions

Hướng dẫn chi tiết các chiến lược xử lý CORS trong Chrome Extension, dựa trên kinh nghiệm từ Word Wizard.

## 1. Hiểu về CORS trong Chrome Extension

### 1.1 Các context khác nhau
- **Content Scripts**: Chạy trong context của web page → BỊ CORS restriction
- **Background Script**: Chạy trong extension context → KHÔNG bị CORS restriction  
- **Popup/Options/Side Panel**: Extension context → KHÔNG bị CORS restriction

### 1.2 Quy tắc vàng
> **Background Script là cầu nối duy nhất** để thực hiện API calls không bị CORS

## 2. Background Script as Proxy Pattern

### 2.1 Cấu trúc cơ bản
```typescript
// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "API_CALL":
      handleApiCall(message.data, sendResponse)
      return true // Giữ channel open cho async response
  }
})

async function handleApiCall(data: any, sendResponse: Function) {
  try {
    // Background script có thể gọi bất kỳ API nào
    const response = await fetch('https://api.external.com/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // An toàn trong background
      },
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    sendResponse({ success: true, data: result })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}
```

### 2.2 ProxyService Pattern - Advanced
```typescript
// lib/proxy-service.ts
export class ProxyService {
  private baseUrl: string
  private timeout: number
  private apiKey?: string

  constructor(config: ProxyConfig) {
    this.baseUrl = config.proxyBaseUrl.replace(/\/$/, '')
    this.timeout = config.proxyTimeout || 30000
    this.apiKey = config.apiKey
  }

  async callGemini(prompt: string, model?: string): Promise<ProxyResponse> {
    return this.makeRequest('/api/ai/gemini', { prompt, model })
  }

  async callOpenAI(prompt: string, options?: any): Promise<ProxyResponse> {
    return this.makeRequest('/api/ai/openai', { prompt, ...options })
  }

  private async makeRequest(endpoint: string, body: any): Promise<ProxyResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Extension-ID': 'your-extension-id' // Identifier cho server
      }

      // QUAN TRỌNG: API key trong header, không trong body
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey
        // hoặc headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Xử lý lỗi có cấu trúc
      if (!response.ok) {
        await this.handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.processError(error)
    }
  }

  private async handleApiError(response: Response) {
    const errorData = await response.json().catch(() => ({}))
    
    switch (response.status) {
      case 429: // Rate limit
        const quotaInfo = errorData.quota
        let message = 'Daily quota exceeded'
        
        if (quotaInfo) {
          message = `Quota exceeded: ${quotaInfo.used}/${quotaInfo.limit} requests`
          if (quotaInfo.resetDate) {
            const resetDate = new Date(quotaInfo.resetDate)
            message += `. Resets on ${resetDate.toLocaleDateString()}`
          }
        }
        
        const quotaError = new Error(message) as any
        quotaError.code = 'QUOTA_EXCEEDED'
        quotaError.quota = quotaInfo
        throw quotaError

      case 401:
        const authError = new Error(`Authentication failed: ${errorData.error || 'Invalid API key'}`) as any
        authError.code = 'AUTH_FAILED'
        throw authError

      case 403:
        const accessError = new Error(`Access denied: ${errorData.error || 'Check API key permissions'}`) as any
        accessError.code = 'ACCESS_DENIED'
        throw accessError

      default:
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }
  }
}
```

## 3. Proxy Server Strategy

### 3.1 Khi nào cần proxy server
- API không support CORS headers
- Cần hide API keys phức tạp
- Batch multiple API calls
- Add caching layer
- Add rate limiting

### 3.2 Proxy server structure
```typescript
// Next.js API route: /api/ai/gemini
export async function POST(request: Request) {
  try {
    const { prompt, model } = await request.json()
    
    // Verify extension ID
    const extensionId = request.headers.get('X-Extension-ID')
    if (extensionId !== 'word-wizard-extension') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(extensionId)
    if (!rateLimitResult.allowed) {
      return Response.json({ 
        error: 'Rate limit exceeded',
        quota: rateLimitResult.quota 
      }, { status: 429 })
    }

    // Call actual API
    const response = await callGeminiAPI(prompt, model)
    
    return Response.json({ 
      success: true, 
      data: response 
    })
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
```

## 4. Message Passing Patterns

### 4.1 Content Script → Background
```typescript
// content-script.js
async function lookupWord(selectedText) {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "LOOKUP_WORD",
        selectedText: selectedText
      }, resolve)
    })

    if (response.success) {
      displayResult(response.data)
    } else {
      showError(response.error)
    }
  } catch (error) {
    showError('Connection failed')
  }
}
```

### 4.2 Background Handler Pattern
```typescript
// lib/background/word-lookup-handler.ts
export async function handleWordLookupBackground(
  selectedText: string,
  sendResponse: Function
) {
  try {
    // Sử dụng service layer
    const aiService = new AIService()
    const result = await aiService.lookupWord(selectedText)
    
    sendResponse({ success: true, data: result })
  } catch (error) {
    console.error('Word lookup failed:', error)
    
    // Structured error response
    sendResponse({ 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    })
  }
}
```

## 5. Authentication Strategies

### 5.1 API Key Management
```typescript
// lib/storage.ts
export const CONFIG_KEYS = {
  OPENAI_API_KEY: 'openai_api_key',
  NOTION_TOKEN: 'notion_token',
  PROXY_API_KEY: 'proxy_api_key'
} as const

// NEVER expose API keys in content scripts
export async function getApiKey(provider: string): Promise<string | null> {
  // Only called from background script
  const key = await getConfig(CONFIG_KEYS[provider])
  return key
}
```

### 5.2 Token Refresh Pattern
```typescript
export class AuthService {
  private accessToken?: string
  private refreshToken?: string
  private tokenExpiry?: number

  async getValidToken(): Promise<string> {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken()
    }
    return this.accessToken!
  }

  private async refreshAccessToken() {
    // Only called from background script - no CORS issues
    const response = await fetch('https://api.service.com/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.refreshToken}`
      }
    })

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = Date.now() + (data.expires_in * 1000)
    
    // Save to storage
    await setConfig('access_token', this.accessToken)
  }
}
```

## 6. Error Handling Patterns

### 6.1 Network Error Handling
```typescript
async function makeApiCall(url: string, options: RequestInit) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again')
    }
    
    if (!navigator.onLine) {
      throw new Error('No internet connection')
    }
    
    throw new Error(`Network error: ${error.message}`)
  }
}
```

### 6.2 Structured Error Response
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  retryAfter?: number // For rate limiting
}

function createErrorResponse(error: any): ApiResponse<null> {
  return {
    success: false,
    error: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    retryAfter: error.retryAfter
  }
}
```

## 7. Performance Optimizations

### 7.1 Request Batching
```typescript
export class BatchRequestService {
  private pendingRequests: Map<string, Promise<any>> = new Map()

  async batchRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Deduplicate identical requests
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!
    }

    const promise = requestFn()
    this.pendingRequests.set(key, promise)

    try {
      const result = await promise
      return result
    } finally {
      this.pendingRequests.delete(key)
    }
  }
}
```

### 7.2 Caching with TTL
```typescript
export class ApiCacheService {
  private cache = new Map<string, CachedResponse>()

  async getCachedOrFetch<T>(
    key: string, 
    fetchFn: () => Promise<T>,
    ttlMs: number = 300000 // 5 minutes
  ): Promise<T> {
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.data
    }

    const data = await fetchFn()
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })

    return data
  }
}
```

## 8. Manifest Configuration

### 8.1 Host Permissions
```json
{
  "manifest_version": 3,
  "host_permissions": [
    "https://*/*",           // Cho proxy requests
    "https://api.openai.com/*",
    "https://api.notion.com/*",
    "http://127.0.0.1:8765/*" // Anki Connect local
  ],
  "permissions": [
    "storage",     // Lưu API keys
    "activeTab",   // Access active tab
    "background"   // Background script
  ]
}
```

### 8.2 Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

## 9. Testing CORS Solutions

### 9.1 Test Background Proxy
```typescript
describe('Background Proxy', () => {
  it('should handle API calls without CORS issues', async () => {
    const mockResponse = { data: 'test' }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const sendResponse = jest.fn()
    await handleApiCall({ url: 'https://api.test.com' }, sendResponse)

    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      data: mockResponse
    })
  })
})
```

## 10. Troubleshooting Common Issues

### 10.1 Extension Context Check
```typescript
function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id
}

function canMakeDirectApiCall(): boolean {
  // Only background scripts can make unrestricted API calls
  return chrome.runtime.getContexts && 
         chrome.runtime.getContexts().some(ctx => ctx.contextType === 'BACKGROUND')
}
```

### 10.2 Debug CORS Issues
```typescript
async function debugApiCall(url: string) {
  try {
    const response = await fetch(url)
    console.log('✅ API call successful')
  } catch (error) {
    if (error.message.includes('CORS')) {
      console.log('❌ CORS error - use background script proxy')
    } else if (error.message.includes('Failed to fetch')) {
      console.log('❌ Network error or blocked request')
    }
    console.error('Error details:', error)
  }
}
```

## Key Takeaways

1. **Background script = CORS bypass** - Sử dụng làm proxy cho mọi API calls
2. **Never expose API keys** trong content scripts
3. **Structured error handling** cho UX tốt hơn
4. **Implement caching** để giảm API calls
5. **Use timeout** cho mọi network requests
6. **Batch similar requests** để tối ưu performance
7. **Test thoroughly** với network conditions khác nhau