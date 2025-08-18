# Code Structure & Architecture

## Directory Structure
```
chrome-extension-starter/
├── lib/                     # Core business logic (MAIN LOGIC LAYER)
│   ├── services/           # Business logic services
│   │   ├── improved-base-service.ts  # HTTP client using ky
│   │   ├── ai-service.ts             # AI integration
│   │   ├── api-service.ts            # API calls
│   │   ├── cache-service.ts          # Caching logic
│   │   └── rate-limit-service.ts     # Rate limiting
│   ├── stores/             # Zustand state management
│   │   ├── extension-store.ts        # Main extension state
│   │   ├── ai-store.ts              # AI-specific state
│   │   └── payment-store.ts         # Payment/subscription state
│   ├── background/         # Background script handlers
│   │   ├── feature-handler.ts       # Feature processing
│   │   ├── api-handler.ts           # API message handling
│   │   └── storage-handler.ts       # Storage operations
│   ├── utils/             # Utility functions
│   │   ├── validation.ts            # Input validation & sanitization
│   │   ├── constants.ts             # Configuration constants
│   │   └── feature-gates.tsx        # Feature access control
│   └── types/             # TypeScript definitions
│       ├── index.ts                 # Core types
│       └── payment-types.ts         # Payment system types
├── components/             # React UI components
├── hooks/                  # React hooks (legacy, replaced by stores)
├── styles/                # CSS stylesheets
└── [popup.tsx, sidepanel.tsx, options.tsx, content.ts, background.ts]
```

## Separation of Concerns Patterns

### 1. Background Script = Pure Router
- **Location**: `background.ts`
- **Role**: Message routing ONLY, no business logic
- **Pattern**: Switch statement delegating to handlers in `lib/background/`

### 2. Service Layer (Business Logic)
- **Location**: `lib/services/`
- **Pattern**: Classes extending `ImprovedBaseService` (ky-based HTTP client)
- **Responsibilities**: API calls, data processing, business rules
- **Key**: NO Chrome APIs in services - pure business logic

### 3. Handlers (Chrome API Bridge)
- **Location**: `lib/background/`
- **Role**: Bridge between Chrome APIs and services
- **Pattern**: Receive messages, call services, return responses

### 4. State Management
- **Technology**: Zustand with persistent storage
- **Pattern**: Separate stores for different domains (extension, ai, payment)
- **Location**: `lib/stores/`

### 5. UI Layer
- **Components**: React components in `components/`
- **State**: Access via Zustand hooks, no direct Chrome API calls
- **Pattern**: Presentation layer only, business logic in services