# Separation of Concerns Patterns

## 1. Background Script Pattern
**File**: `background.ts`
**Role**: Pure message router - NO business logic

```typescript
// CORRECT: Pure routing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'PROCESS_FEATURE':
      handleFeatureMessage(message.data, sendResponse)
      return true
    case 'API_CALL':
      handleApiMessage(message.endpoint, message.data, sendResponse)
      return true
  }
})
```

## 2. Service Layer Pattern
**Location**: `lib/services/`
**Key**: Extends `ImprovedBaseService` using ky HTTP client
**Rule**: NO Chrome APIs in services

```typescript
// CORRECT: Pure business logic
export class ApiService extends ImprovedBaseService {
  async processData(input: string): Promise<ProcessResult> {
    // Business logic only - no chrome.* calls
    const validated = this.validateInput(input)
    return await this.post<ProcessResult>('/process', validated)
  }
}
```

## 3. Handler Pattern
**Location**: `lib/background/`
**Role**: Bridge between Chrome APIs and services

```typescript
// CORRECT: Chrome API bridge
export async function handleFeatureMessage(data: any, sendResponse: Function) {
  try {
    const apiService = new ApiService()
    const result = await apiService.processFeature(data)
    sendResponse({ success: true, data: result })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}
```

## 4. State Management Pattern
**Technology**: Zustand with persistence
**Location**: `lib/stores/`
**Pattern**: Domain-specific stores

```typescript
// CORRECT: Zustand store pattern
export const useExtensionStore = create<ExtensionState>()(
  persist(
    (set, get) => ({
      // State and actions
    }),
    { name: 'extension-store' }
  )
)
```

## 5. UI Component Pattern
**Location**: `components/`
**Rule**: NO direct Chrome API calls, use stores

```typescript
// CORRECT: UI component using stores
export function AIChatPanel({ selectedText }: Props) {
  const { processWithAI } = useAIActions()
  // UI logic only, business logic in stores/services
}
```

## 6. Validation Layer
**Location**: `lib/utils/validation.ts`
**Technology**: Zod schemas
**Pattern**: Validate all inputs at boundaries

```typescript
// CORRECT: Zod validation
export const featureDataSchema = z.object({
  input: z.string().min(1).max(10000),
  options: z.object({}).optional()
})
```

## Forbidden Patterns
❌ Business logic in background.ts
❌ Chrome APIs in service classes
❌ Direct Chrome API calls in React components
❌ Unvalidated user inputs
❌ Missing error handling in async operations