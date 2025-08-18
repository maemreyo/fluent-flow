# Separation of Concerns (SoC) Guide for Chrome Extensions

Hướng dẫn chi tiết về cách áp dụng Separation of Concerns trong Chrome Extension để tạo ra codebase maintainable và scalable.

## 1. Nguyên tắc SoC cốt lõi

### 1.1 Định nghĩa các layer
Mỗi layer có **MỘT** trách nhiệm duy nhất:

```
┌─────────────────────────────────────────┐
│ UI Layer (React Components)             │ ← Chỉ render UI và handle user events
├─────────────────────────────────────────┤
│ Controller Layer (Background Handlers)  │ ← Message routing và orchestration  
├─────────────────────────────────────────┤
│ Service Layer (Business Logic)          │ ← Core business logic và rules
├─────────────────────────────────────────┤
│ Data Layer (APIs/Storage)              │ ← Data access và persistence
└─────────────────────────────────────────┘
```

### 1.2 Quy tắc tương tác giữa các layer
- ✅ **Downward dependency**: Layer trên có thể depend vào layer dưới
- ❌ **Upward dependency**: Layer dưới KHÔNG được depend vào layer trên  
- ❌ **Skip layer**: Không được skip layer (UI → Service trực tiếp)

## 2. UI Layer - Presentation Only

### 2.1 React Components - Pure Presentation
```typescript
// components/word-lookup/WordLookupResult.tsx
interface WordLookupResultProps {
  word: string
  definition: string
  isLoading: boolean
  onSave: (wordData: WordData) => void
  onGenerateImage: () => void
}

export function WordLookupResult({ 
  word, 
  definition, 
  isLoading, 
  onSave, 
  onGenerateImage 
}: WordLookupResultProps) {
  // CHỈ handle UI logic
  return (
    <div className="word-result">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <h2>{word}</h2>
          <p>{definition}</p>
          <div className="actions">
            <Button onClick={onGenerateImage}>
              Generate Image
            </Button>
            <Button onClick={() => onSave({ word, definition })}>
              Save to Notion
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
```

### 2.2 Custom Hooks - UI State Management
```typescript
// hooks/use-word-lookup.ts
export function useWordLookup() {
  const [wordData, setWordData] = useState<WordData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookupWord = useCallback(async (selectedText: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // GỬI message đến background - KHÔNG gọi service trực tiếp
      const response = await chrome.runtime.sendMessage({
        type: "LOOKUP_WORD",
        selectedText
      })

      if (response.success) {
        setWordData(response.data)
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError('Failed to lookup word')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    wordData,
    isLoading,
    error,
    lookupWord
  }
}
```

## 3. Controller Layer - Background Handlers

### 3.1 Background Script - Pure Router
```typescript
// background.ts - CHỈ route messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "LOOKUP_WORD":
      handleWordLookupBackground(message.selectedText, sendResponse)
      return true

    case "SAVE_TO_NOTION":
      handleSaveToNotion(message.wordData, message.additionalData, sendResponse)
      return true

    case "GENERATE_IMAGE":
      handleImageGenerationBackground(message.definition, message.term, sendResponse)
      return true

    // Không có business logic ở đây!
  }
})
```

### 3.2 Handlers - Orchestration Logic
```typescript
// lib/background/word-lookup-handler.ts
export async function handleWordLookupBackground(
  selectedText: string,
  sendResponse: Function
) {
  try {
    // 1. Validate input
    if (!selectedText || selectedText.trim().length === 0) {
      throw new Error('No text selected')
    }

    if (isSelectionTooLong(selectedText)) {
      throw new Error('Selected text is too long')
    }

    // 2. Orchestrate service calls
    const aiService = new AIService()
    const cacheService = new CacheService()

    // Check cache first
    const cacheKey = `lookup:${selectedText}`
    const cached = await cacheService.get<WordData>(cacheKey)
    
    if (cached) {
      sendResponse({ success: true, data: cached })
      return
    }

    // Call AI service
    const wordData = await aiService.lookupWord(selectedText)

    // Cache result
    await cacheService.set(cacheKey, wordData, 300000) // 5 minutes TTL

    sendResponse({ success: true, data: wordData })
  } catch (error) {
    console.error('Word lookup failed:', error)
    sendResponse({ 
      success: false, 
      error: error.message,
      code: error.code || 'LOOKUP_FAILED'
    })
  }
}
```

## 4. Service Layer - Business Logic

### 4.1 Core Service Pattern
```typescript
// lib/ai-service.ts
export class AIService {
  private orchestrator: AIOrchestrator
  private proxyService: ProxyService | null = null

  constructor() {
    // Service chỉ depend vào config, không depend vào UI
    const config = this.loadConfiguration()
    this.initializeProviders(config)
  }

  async lookupWord(selectedText: string): Promise<WordData> {
    // Pure business logic - không biết gì về UI hay Chrome APIs
    try {
      const prompt = this.buildLookupPrompt(selectedText)
      
      let response: string
      if (this.proxyService) {
        const result = await this.proxyService.callGemini(prompt)
        response = result.data
      } else {
        response = await this.orchestrator.generateText(prompt)
      }

      const wordData = this.parseWordData(response)
      
      // Apply business rules
      this.validateWordData(wordData)
      this.enhanceWordData(wordData)
      
      return wordData
    } catch (error) {
      throw new Error(`AI lookup failed: ${error.message}`)
    }
  }

  private buildLookupPrompt(text: string): string {
    // Business logic cho prompt construction
    return `Define the word "${text}" with example sentences...`
  }

  private parseWordData(response: string): WordData {
    // Business logic cho response parsing
    // Implement parsing logic
  }

  private validateWordData(wordData: WordData): void {
    // Business rules validation
    if (!wordData.definition || wordData.definition.length < 10) {
      throw new Error('Definition too short')
    }
  }
}
```

### 4.2 Service Composition Pattern
```typescript
// lib/vocabulary-service.ts
export class VocabularyService {
  constructor(
    private notionService: NotionService,
    private ankiService: AnkiService,
    private cacheService: CacheService
  ) {}

  async saveVocabulary(
    wordData: WordData, 
    options: SaveOptions
  ): Promise<SaveResult> {
    const results: SaveResult[] = []

    // Business logic - quyết định save ở đâu dựa trên options
    if (options.saveToNotion) {
      const notionResult = await this.notionService.saveWord(wordData)
      results.push(notionResult)
    }

    if (options.saveToAnki) {
      const ankiResult = await this.ankiService.saveWord(wordData)
      results.push(ankiResult)
    }

    // Update cache
    await this.cacheService.invalidate(`word:${wordData.term}`)

    return this.aggregateResults(results)
  }

  private aggregateResults(results: SaveResult[]): SaveResult {
    // Business logic cho result aggregation
    const success = results.every(r => r.success)
    const errors = results.filter(r => !r.success).map(r => r.error)
    
    return {
      success,
      errors: errors.length > 0 ? errors : undefined,
      savedTo: results.filter(r => r.success).map(r => r.destination)
    }
  }
}
```

## 5. Data Layer - External Integrations

### 5.1 Data Service Pattern
```typescript
// lib/notion-service.ts  
export class NotionService {
  private client: Client
  private propertyMapper: NotionPropertyMapper
  private transformer: NotionTransformer

  constructor(config: NotionConfig) {
    // Data layer chỉ biết về data access
    this.client = new Client({ auth: config.token })
    this.propertyMapper = new NotionPropertyMapper()
    this.transformer = new NotionTransformer()
  }

  async saveWord(wordData: WordData): Promise<SaveResult> {
    try {
      // Pure data operations
      const pageProperties = this.transformer.wordDataToNotionProperties(wordData)
      
      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: pageProperties
      })

      return {
        success: true,
        id: response.id,
        destination: 'notion'
      }
    } catch (error) {
      return {
        success: false,
        error: this.handleNotionError(error),
        destination: 'notion'
      }
    }
  }

  async searchWord(term: string): Promise<NotionPage[]> {
    // Pure data query
    const response = await this.client.databases.query({
      database_id: this.databaseId,
      filter: {
        property: 'Term',
        title: {
          contains: term
        }
      }
    })

    return response.results.map(page => 
      this.transformer.notionPageToWordData(page)
    )
  }

  private handleNotionError(error: any): string {
    // Data layer error handling
    if (error.code === 'unauthorized') {
      return 'Notion authentication failed. Please check your token.'
    }
    
    if (error.code === 'object_not_found') {
      return 'Database not found. Please check your database ID.'
    }
    
    return `Notion API error: ${error.message}`
  }
}
```

### 5.2 Storage Abstraction
```typescript
// lib/storage-service.ts
export class StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key)
      return result[key] || null
    } catch (error) {
      console.error(`Storage get error for key ${key}:`, error)
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value })
    } catch (error) {
      console.error(`Storage set error for key ${key}:`, error)
      throw new Error('Failed to save data')
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key)
    } catch (error) {
      console.error(`Storage remove error for key ${key}:`, error)
    }
  }
}
```

## 6. Inter-layer Communication Patterns

### 6.1 Message-based Communication
```typescript
// UI Layer giao tiếp với Controller qua messages
interface ExtensionMessage {
  type: string
  data?: any
  requestId?: string
}

interface ExtensionResponse {
  success: boolean
  data?: any
  error?: string
  code?: string
}

// UI → Controller
async function sendToBackground<T>(message: ExtensionMessage): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve)
  })
}
```

### 6.2 Dependency Injection Pattern
```typescript
// lib/service-container.ts
export class ServiceContainer {
  private services = new Map<string, any>()

  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory)
  }

  get<T>(name: string): T {
    const factory = this.services.get(name)
    if (!factory) {
      throw new Error(`Service ${name} not registered`)
    }
    return factory()
  }
}

// Initialize services with proper dependencies
const container = new ServiceContainer()

container.register('storageService', () => new StorageService())
container.register('cacheService', () => new CacheService(
  container.get('storageService')
))
container.register('notionService', () => new NotionService(getNotionConfig()))
container.register('aiService', () => new AIService(
  container.get('cacheService')
))
```

## 7. Error Boundary Pattern

### 7.1 Layer-specific Error Handling
```typescript
// UI Layer - User-friendly errors
export function WordLookupComponent() {
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async (text: string) => {
    try {
      const result = await lookupWord(text)
      // Handle success
    } catch (error) {
      // Convert technical errors to user-friendly messages
      setError(getUIErrorMessage(error))
    }
  }
}

function getUIErrorMessage(error: any): string {
  switch (error.code) {
    case 'QUOTA_EXCEEDED':
      return '⚠️ Daily quota reached. Please try again tomorrow.'
    case 'AUTH_FAILED':
      return '🔑 Authentication failed. Please check your API key in settings.'
    case 'NETWORK_ERROR':
      return '🌐 Connection failed. Please check your internet connection.'
    default:
      return '❌ Something went wrong. Please try again.'
  }
}
```

### 7.2 Service Layer Error Handling
```typescript
// Service Layer - Business logic errors
export class AIService {
  async lookupWord(text: string): Promise<WordData> {
    try {
      // Business logic
      return result
    } catch (error) {
      // Transform data layer errors to business errors
      if (error.message.includes('API key')) {
        const authError = new Error('Authentication required') as any
        authError.code = 'AUTH_FAILED'
        throw authError
      }

      if (error.message.includes('quota') || error.message.includes('429')) {
        const quotaError = new Error('Service quota exceeded') as any
        quotaError.code = 'QUOTA_EXCEEDED'
        throw quotaError
      }

      throw error
    }
  }
}
```

## 8. Testing Strategy cho SoC

### 8.1 Layer-isolated Testing
```typescript
// UI Layer Testing - Mock services
describe('WordLookupComponent', () => {
  beforeEach(() => {
    // Mock Chrome APIs
    global.chrome = {
      runtime: {
        sendMessage: jest.fn().mockResolvedValue({
          success: true,
          data: mockWordData
        })
      }
    }
  })

  it('should display word data correctly', async () => {
    render(<WordLookupComponent />)
    // Test UI behavior only
  })
})

// Service Layer Testing - Mock data layer
describe('AIService', () => {
  let aiService: AIService
  let mockOrchestrator: jest.Mocked<AIOrchestrator>

  beforeEach(() => {
    mockOrchestrator = {
      generateText: jest.fn()
    } as any

    aiService = new AIService()
    aiService['orchestrator'] = mockOrchestrator
  })

  it('should lookup word correctly', async () => {
    mockOrchestrator.generateText.mockResolvedValue('mock response')
    
    const result = await aiService.lookupWord('test')
    
    expect(result).toBeDefined()
    expect(mockOrchestrator.generateText).toHaveBeenCalledWith(
      expect.stringContaining('test')
    )
  })
})
```

## 9. Common Anti-patterns

### 9.1 ❌ Layer Violations
```typescript
// BAD: UI component calling service directly
export function WordLookupComponent() {
  const handleLookup = async (text: string) => {
    // ❌ UI layer calling service layer directly
    const aiService = new AIService()
    const result = await aiService.lookupWord(text)
  }
}

// BAD: Service knowing about Chrome APIs
export class NotionService {
  async saveWord(wordData: WordData) {
    // ❌ Service layer using Chrome APIs
    const config = await chrome.storage.local.get('notion_config')
  }
}

// BAD: Background script with business logic
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOOKUP_WORD") {
    // ❌ Business logic trong background script
    const cleanText = message.text.trim().toLowerCase()
    const isValidWord = /^[a-zA-Z\s]+$/.test(cleanText)
    
    if (!isValidWord) {
      sendResponse({ error: 'Invalid word format' })
      return
    }
    
    // More business logic...
  }
})
```

### 9.2 ✅ Correct Patterns
```typescript
// GOOD: UI layer uses hooks và messages
export function WordLookupComponent() {
  const { lookupWord, isLoading, error } = useWordLookup()
  
  const handleLookup = (text: string) => {
    lookupWord(text) // Hook handles message passing
  }
}

// GOOD: Service layer pure business logic
export class NotionService {
  constructor(private config: NotionConfig) {} // Inject dependencies
  
  async saveWord(wordData: WordData) {
    // Pure business logic, no Chrome APIs
  }
}

// GOOD: Background script as pure router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "LOOKUP_WORD":
      handleWordLookupBackground(message.text, sendResponse)
      return true
  }
})
```

## 10. Migration Strategy

### 10.1 Refactoring Legacy Code
```typescript
// Step 1: Extract business logic từ background script
// Before: All logic in background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOOKUP_WORD") {
    // 50 lines of business logic here ❌
  }
})

// After: Move to handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOOKUP_WORD") {
    handleWordLookupBackground(message.text, sendResponse) ✅
    return true
  }
})

// Step 2: Extract services từ handlers
// Before: Handler with mixed concerns
export async function handleWordLookup(text: string, sendResponse: Function) {
  // API calls mixed with business logic ❌
}

// After: Handler orchestrates services
export async function handleWordLookup(text: string, sendResponse: Function) {
  const aiService = new AIService() ✅
  const result = await aiService.lookupWord(text)
  sendResponse({ success: true, data: result })
}
```

## Key Takeaways

1. **Mỗi layer một trách nhiệm** - không được overlap
2. **Dependency direction** - chỉ từ trên xuống dưới
3. **UI layer** - chỉ render và handle events
4. **Controller layer** - orchestration và message routing
5. **Service layer** - pure business logic
6. **Data layer** - chỉ data access
7. **Error handling** - transform errors giữa các layer
8. **Testing** - test từng layer độc lập
9. **Migration** - refactor từ từ, không làm break existing functionality