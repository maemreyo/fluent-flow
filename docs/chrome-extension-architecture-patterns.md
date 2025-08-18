# Chrome Extension Architecture Patterns

Tài liệu này mô tả các patterns và best practices được rút ra từ Word Wizard extension để áp dụng cho các Chrome extension tương lai.

## 1. Cấu trúc tổng quan (Overall Architecture)

### 1.1 Phân chia theo tầng (Layered Architecture)
```
├── background.ts              # Background Script - Service Worker
├── content/                   # Content Scripts
├── popup.tsx                  # Extension Popup
├── sidepanel.tsx             # Side Panel UI
├── options.tsx               # Options Page
├── newtab.tsx                # New Tab Override
├── lib/
│   ├── background/           # Background handlers (Business Logic)
│   ├── services/            # Core services
│   ├── ai/                  # AI integration layer
│   └── utils/               # Utilities
└── components/              # Reusable UI components
```

### 1.2 Separation of Concerns (SoC) Pattern
**Nguyên tắc cốt lõi**: Mỗi layer có trách nhiệm riêng biệt, không được trộn lẫn.

**Background Script (`background.ts`)**:
- Chỉ làm dispatcher - nhận message và route đến handler tương ứng
- Không chứa business logic
- Quản lý Chrome APIs (contextMenus, commands, sidePanel)

**Background Handlers (`lib/background/`)**:
- Chứa toàn bộ business logic
- Tương tác với services
- Xử lý async operations và error handling

**Services (`lib/services/`)**:
- Core business logic cho từng domain (AI, Notion, Anki, etc.)
- Stateless, reusable
- Tách biệt hoàn toàn với Chrome APIs

## 2. Background Script Patterns

### 2.1 Message Router Pattern
```typescript
// background.ts - CHỈ làm dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "LOOKUP_WORD":
      handleWordLookupBackground(message.selectedText, sendResponse)
      return true // Keep channel open
    
    case "SAVE_TO_NOTION":
      handleSaveToNotion(message.wordData, message.additionalData, sendResponse)
      return true
    
    // ... other cases
  }
})
```

### 2.2 Handler Extraction Pattern
```typescript
// lib/background/word-lookup-handler.ts
export async function handleWordLookupBackground(
  selectedText: string,
  sendResponse: Function
) {
  try {
    const aiService = new AIService()
    const result = await aiService.lookupWord(selectedText)
    sendResponse({ success: true, data: result })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}
```

**Lợi ích**:
- Dễ test từng handler độc lập
- Code dễ maintain và debug
- Tách biệt Chrome APIs với business logic

## 3. CORS Handling với Background Script

### 3.1 Proxy Service Pattern
Background script không bị CORS restriction, sử dụng để proxy API calls:

```typescript
export class ProxyService {
  private async makeRequest(endpoint: string, body: any): Promise<ProxyResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Extension-ID': 'word-wizard-extension'
    }

    // Add API key - no CORS issues in background script
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    })

    // Handle specific API errors
    if (response.status === 429) {
      // Quota handling logic
    }
    
    return await response.json()
  }
}
```

### 3.2 Authentication Pattern
```typescript
// Luôn gửi authentication qua headers thay vì body
headers['X-API-Key'] = this.apiKey
headers['Authorization'] = `Bearer ${token}`

// Không bao giờ expose sensitive data trong content scripts
```

## 4. Service Layer Patterns

### 4.1 Service Factory Pattern
```typescript
// lib/ai-service.ts
export class AIService {
  private getProvider(): AIOrchestrator | ProxyService | CustomProviderService {
    const config = getConfig()
    
    if (config.useProxy) {
      return new ProxyService(config.proxy)
    } else if (config.useCustomProvider) {
      return new CustomProviderService(config.customProvider)
    }
    
    return new AIOrchestrator(config.aiProviders)
  }
}
```

### 4.2 Error Handling Pattern
```typescript
// Standardized error handling across all services
export class NotionService {
  async saveWord(wordData: WordData): Promise<SaveResult> {
    try {
      const result = await this.notion.pages.create(pageData)
      return { success: true, data: result }
    } catch (error) {
      if (error.code === 'unauthorized') {
        throw new Error('Notion authentication failed. Please check your integration token.')
      }
      
      if (error.code === 'object_not_found') {
        throw new Error('Database not found. Please check your database ID.')
      }
      
      throw new Error(`Notion API error: ${error.message}`)
    }
  }
}
```

## 5. Data Flow Patterns

### 5.1 Unidirectional Data Flow
```
Content Script → Background Script → Handler → Service → External API
                ↓
UI Components ← Storage/Cache ← Response Processing ← API Response
```

### 5.2 Message Passing Pattern
```typescript
// content/word-lookup-content.ts
function lookupSelectedWord(selectedText: string) {
  chrome.runtime.sendMessage({
    type: "LOOKUP_WORD",
    selectedText: selectedText
  }, (response) => {
    if (response.success) {
      displayWordPopup(response.data)
    } else {
      showError(response.error)
    }
  })
}
```

## 6. Configuration Management

### 6.1 Centralized Config Pattern
```typescript
// lib/storage.ts
export const CONFIG_KEYS = {
  NOTION_TOKEN: 'notion_token',
  ANKI_CONNECT_URL: 'anki_connect_url',
  AI_PROVIDER: 'ai_provider_config',
  PROXY_CONFIG: 'proxy_config'
} as const

export async function getConfig<T>(key: keyof typeof CONFIG_KEYS): Promise<T | null> {
  const result = await storage.get(key)
  return result[key] || null
}
```

### 6.2 Environment-based Configuration
```typescript
// package.json manifest configuration
"manifest": {
  "host_permissions": [
    "https://*/*",
    "https://api.notion.com/*",
    "http://127.0.0.1:8765/*"  // Anki Connect
  ],
  "permissions": [
    "storage",
    "activeTab", 
    "contextMenus",
    "sidePanel"
  ]
}
```

## 7. Performance Patterns

### 7.1 Caching Strategy
```typescript
export class CacheService {
  private cache = new Map<string, CachedItem>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (item && Date.now() - item.timestamp < this.TTL) {
      return item.data
    }
    return null
  }
}
```

### 7.2 Rate Limiting Pattern
```typescript
export class RateLimitService {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly timeWindow: number

  canMakeRequest(): boolean {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    return this.requests.length < this.maxRequests
  }
}
```

## 8. Testing Patterns

### 8.1 Service Layer Testing
```typescript
// Mỗi service có thể test độc lập
describe('NotionService', () => {
  let notionService: NotionService
  
  beforeEach(() => {
    notionService = new NotionService(mockConfig)
  })
  
  it('should save word data correctly', async () => {
    const result = await notionService.saveWord(mockWordData)
    expect(result.success).toBe(true)
  })
})
```

### 8.2 Handler Testing
```typescript
// Test handlers với mocked services
describe('handleWordLookupBackground', () => {
  it('should handle successful word lookup', async () => {
    const mockSendResponse = jest.fn()
    await handleWordLookupBackground('test word', mockSendResponse)
    
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: true,
      data: expect.any(Object)
    })
  })
})
```

## 9. Key Takeaways

### 9.1 Nguyên tắc bắt buộc
1. **Background script CHỈ làm router** - không chứa business logic
2. **Handlers chứa business logic** - có thể test độc lập
3. **Services tách biệt hoàn toàn** với Chrome APIs
4. **Sử dụng background script** để bypass CORS
5. **Centralized error handling** và configuration
6. **Caching và rate limiting** cho performance

### 9.2 File structure chuẩn
```
background.ts                 # Router only
lib/background/              # Handlers (business logic)
lib/services/               # Core services
lib/utils/                  # Utilities
lib/storage.ts              # Configuration management
```

### 9.3 Anti-patterns cần tránh
- ❌ Business logic trong background.ts
- ❌ Chrome APIs trong services
- ❌ Direct API calls từ content scripts
- ❌ Hardcode configuration values
- ❌ Blocking operations without timeout