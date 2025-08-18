# Chrome Extension Starter Template

A modern, clean architecture template for Chrome extensions with TypeScript,
React, and best practices for scalable development.

## Features

✨ **Clean Architecture** - Separation of concerns with proper layering 🔒
**Security First** - Input validation, sanitization, and secure practices ⚡
**Modern Stack** - TypeScript, React, and latest Chrome APIs 🎨 **Beautiful
UI** - Modern, responsive interface with dark mode support 🔄 **Background
Processing** - Efficient message routing and service layers 💾 **Smart
Caching** - Intelligent caching with TTL and memory management 🛡️ **Rate
Limiting** - Built-in protection against API abuse 🧪 **Type Safe** -
Comprehensive TypeScript definitions 📱 **Multi-UI** - Popup, side panel, and
options page interfaces 🎯 **Content Scripts** - Text selection and page
interaction 🤖 **AI Integration** - Built-in support for OpenAI, Anthropic
Claude, and custom AI providers 🚀 **Professional Libraries** - Uses
battle-tested libraries (ky, zustand, date-fns, zod) ⚡ **State Management** -
Zustand-based stores with automatic persistence 🎛️ **Quick Actions** - Instant
AI processing for selected text 💰 **Monetization Ready** - Complete payment
system with Stripe integration 🔐 **License Validation** - Secure feature gating
and usage tracking 📊 **Usage Analytics** - Real-time usage monitoring and
limits

## 🚀 Quick Start

### For New Developers (Recommended)

Use our **interactive setup wizard** for guided onboarding:

```bash
# Clone the template
git clone <your-repo-url> my-extension
cd my-extension

# Run the interactive setup wizard
node scripts/setup.js
# This will guide you through:
# - Project configuration (name, description, author)
# - AI provider selection (OpenAI, Anthropic, Custom)
# - Payment system setup (optional)
# - Analytics configuration (optional)
# - Environment setup and dependency installation
```

The setup wizard automatically:

- ✅ Validates system requirements (Node.js 18+, Chrome browser)
- 🎯 Generates personalized configuration files
- 📁 Creates `.env` with your API keys
- 📦 Installs dependencies with your preferred package manager
- 🔧 Runs code quality checks
- 🏗️ Builds the extension for development

### Manual Setup (Advanced)

1. **Clone and install:**

   ```bash
   git clone <your-repo-url> my-extension
   cd my-extension
   pnpm install
   ```

2. **Configure environment:**

   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit with your API keys
   nano .env
   ```

3. **Build and load:**

   ```bash
   pnpm build
   ```

4. **Load in Chrome:**
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" → select the `build` folder

### Development Scripts

After setup, use these automation tools:

```bash
# Interactive development menu
node scripts/dev-workflow.js

# Advanced configuration wizard
node scripts/configure.js

# Deployment automation
node scripts/deploy.js
```

## Project Structure

```
chrome-extension-starter/
├── background.ts              # Background script (message router only)
├── content.ts                # Content script for page interaction
├── popup.tsx                 # Main popup UI component
├── sidepanel.tsx            # Extended side panel UI
├── options.tsx              # Full-page options interface
├── manifest.json            # Extension manifest
├── package.json             # Dependencies and scripts
│
├── lib/                     # Core business logic
│   ├── services/           # Service layer (business logic)
│   │   ├── improved-base-service.ts  # HTTP client using ky
│   │   ├── ai-service.ts             # Universal AI integration
│   │   ├── api-service.ts
│   │   ├── cache-service.ts
│   │   └── rate-limit-service.ts
│   │
│   ├── stores/             # Zustand state management
│   │   ├── extension-store.ts        # Main extension state
│   │   └── ai-store.ts              # AI-specific state
│   │
│   ├── background/         # Background script handlers
│   │   ├── feature-handler.ts
│   │   ├── api-handler.ts
│   │   └── storage-handler.ts
│   │
│   ├── utils/             # Utility functions
│   │   ├── validation.ts
│   │   └── constants.ts
│   │
│   └── types/             # TypeScript definitions
│       └── index.ts
│
├── components/             # React components
│   ├── ai-chat-panel.tsx           # Full AI chat interface
│   ├── ai-quick-actions.tsx        # Quick AI processing
│   ├── upgrade-modal.tsx           # Subscription upgrade UI
│   ├── usage-tracker.tsx           # Usage monitoring
│   └── subscription-status.tsx     # Billing management
│
├── hooks/                  # React hooks (legacy, replaced by stores)
│   ├── use-feature-processing.ts
│   ├── use-extension-config.ts
│   └── use-storage-data.ts
│
├── styles/                # CSS stylesheets
│   ├── popup.css
│   ├── sidepanel.css
│   └── options.css
│
└── docs/                  # Documentation
    └── architecture-patterns.md
```

## Architecture Principles

### 1. Background Script = Router Only

The background script acts purely as a message router, delegating all business
logic to specialized handlers:

```typescript
// background.ts - Clean routing only
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

### 2. Service Layer Separation

Business logic lives in services, not in Chrome API handlers:

```typescript
// lib/services/api-service.ts - Pure business logic
export class ApiService extends BaseService {
  async processData(input: string): Promise<ProcessResult> {
    // Business logic here - no Chrome APIs
    const validated = this.validateInput(input)
    return await this.callExternalApi(validated)
  }
}
```

### 3. Type-Safe Communication

All messages between components use strictly typed interfaces:

```typescript
interface FeatureData {
  input: string
  options?: {
    timeout?: number
    priority?: 'low' | 'normal' | 'high'
  }
}
```

## Development

### Development Automation Scripts

The starter includes comprehensive automation scripts for professional
development workflows:

#### 🛠 Core Scripts

- `pnpm dev` - Start development with hot reload
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript checks
- `pnpm test` - Run tests
- `pnpm package` - Create distributable ZIP

#### 🚀 Onboarding & Setup Scripts

- `node scripts/setup.js` - **Interactive setup wizard** for new developers
- `node scripts/configure.js` - **Advanced configuration** for AI, payments,
  analytics
- `pnpm run setup` - Shortcut for setup script

#### 🔧 Development Workflow Scripts

- `node scripts/dev-workflow.js` - **Interactive development menu** with:
  - Code validation (TypeScript, ESLint, tests)
  - Build automation with validation
  - Development server management
  - Test execution with coverage
  - Codebase analysis and metrics
  - Project cleanup utilities

#### 🚀 Deployment Scripts

- `node scripts/deploy.js` - **Complete deployment automation** with:
  - Multi-environment builds (dev, staging, production)
  - Pre-deployment validation checks
  - Distribution package creation with checksums
  - Store upload preparation (Chrome, Edge, Firefox)
  - Deployment reporting and documentation

#### 🎯 Script Benefits

- **Interactive Wizards**: Guided setup with intelligent defaults
- **Comprehensive Validation**: System requirements, code quality,
  pre-deployment checks
- **Automation**: Reduce manual tasks and human error
- **Professional Workflows**: Enterprise-grade development processes
- **Multi-environment**: Support for development, staging, and production
  deployments

### Environment Setup

1. **Node.js** - Version 18 or higher
2. **pnpm** - Package manager (faster than npm)
3. **Chrome** - For testing the extension

### Development Workflow

1. **Make changes** to source files
2. **Run build** - `pnpm build`
3. **Reload extension** in Chrome (click refresh in extensions page)
4. **Test functionality** in popup, side panel, or content scripts

## Configuration

### Manifest V3 Configuration

The extension uses Manifest V3 with proper permissions:

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab", "contextMenus"],
  "host_permissions": ["https://*/*"],
  "background": {
    "service_worker": "background.js"
  }
}
```

### API Configuration

Configure external APIs in the options page or modify constants:

```typescript
// lib/utils/constants.ts
export const API_ENDPOINTS = {
  BASE_URL: 'https://api.example.com',
  TIMEOUT: 30000
}
```

## Usage Examples

### AI Integration

```typescript
// Using AI service directly
import { AIService } from './lib/services/ai-service'

const aiService = new AIService({
  provider: 'openai',
  apiKey: 'your-api-key',
  model: 'gpt-4o-mini'
})

const summary = await aiService.summarizeText('Long text here...', 200)
const translation = await aiService.translateText('Hello', 'Spanish')
```

### State Management with Zustand

```typescript
// Using stores in components
import { useExtensionStore, useAIStore } from './lib/stores'

function MyComponent() {
  const { preferences, updatePreferences } = useExtensionStore()
  const { conversations, createConversation } = useAIStore()

  // React to state changes automatically
  return <div>Current theme: {preferences?.theme}</div>
}
```

### AI Chat Integration

```typescript
// Full AI chat interface
import { AIChatPanel } from './components/ai-chat-panel'

function Popup() {
  return (
    <AIChatPanel
      selectedText="Pre-fill with selected text"
      onResult={(result) => console.log(result)}
    />
  )
}
```

### Quick AI Actions

```typescript
// Instant AI processing
import { AIQuickActions } from './components/ai-quick-actions'

function SidePanel() {
  return (
    <AIQuickActions
      selectedText="Text to process"
      onResult={(result) => handleResult(result)}
    />
  )
}
```

### Payment & Subscription System

```typescript
// Initialize payment system
import { usePaymentActions } from './lib/stores/payment-store'

const { initialize, login, createCheckout } = usePaymentActions()

// Initialize with your backend API
await initialize({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-api.com'
})

// Authenticate user
await login('user@example.com', 'password')

// Create subscription checkout
const checkoutUrl = await createCheckout('pro', 'monthly')
```

### Feature Gates & Usage Limits

```typescript
// Using feature gates
import { FeatureGate, useFeatureGate } from './lib/utils/feature-gates'

function MyComponent() {
  const { hasAccess, requireAccess } = useFeatureGate('ai_requests')

  const handleAIRequest = async () => {
    await requireAccess() // Throws if no access
    // Process AI request...
  }

  return (
    <FeatureGate featureId="ai_requests">
      <button onClick={handleAIRequest}>
        Process with AI
      </button>
    </FeatureGate>
  )
}
```

### HTTP Requests with ky

```typescript
// Using improved base service
class MyService extends ImprovedBaseService {
  constructor() {
    super('https://api.example.com')
  }

  async getData() {
    return await this.get<DataType>('/endpoint')
  }
}
```

### Content Script Integration

```typescript
// Get selected text from active tab
const response = await chrome.tabs.sendMessage(tabId, {
  type: 'GET_SELECTED_TEXT'
})
```

## AI Features

### 🤖 **Multi-Provider Support**

- **OpenAI** - GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Anthropic Claude** - Claude-3.5-sonnet, Claude-3.5-haiku, Claude-3-opus
- **Custom Providers** - Easy integration with any AI API

### ⚡ **Quick Actions**

- **Summarize** - Instant text summarization
- **Translate** - Multi-language translation
- **Explain** - Simple explanations of complex text
- **Sentiment Analysis** - Emotion and tone detection
- **Email Generation** - Professional email drafting
- **Keyword Extraction** - Key terms and phrases

### 💬 **Full Chat Interface**

- **Conversation Management** - Multiple chat sessions
- **Message History** - Persistent conversations
- **Streaming Support** - Real-time AI responses
- **Context Aware** - Uses selected text as context
- **Copy & Share** - Easy result sharing

### 🔧 **Developer Friendly**

- **Type Safe** - Full TypeScript definitions
- **Extensible** - Easy to add new AI features
- **Error Handling** - Robust error management
- **Rate Limiting** - Built-in API protection
- **Caching** - Intelligent response caching

## 💰 Payment & Monetization Features

### 🔐 **Subscription Management**

- **Multiple Plans** - Freemium, Pro, Enterprise tiers
- **Flexible Billing** - Monthly/yearly with auto-discounts
- **Trial Support** - Free trials with automatic conversion
- **Stripe Integration** - Secure payment processing
- **Billing Portal** - Self-service billing management

### 📊 **Usage Tracking & Limits**

- **Real-time Monitoring** - Live usage tracking
- **Feature-based Limits** - AI requests, conversations, file uploads
- **Usage Analytics** - Detailed usage reports
- **Overage Protection** - Prevent unexpected charges
- **Grace Periods** - Soft limits with warnings

### 🛡️ **License & Security**

- **JWT-based Licenses** - Cryptographically signed licenses
- **Offline Validation** - Works without internet connection
- **Feature Gates** - Secure feature access control
- **Anti-tampering** - License integrity protection
- **Extension-specific** - Prevents license sharing

### 🎨 **Payment UI Components**

- **Upgrade Modal** - Beautiful pricing comparison
- **Usage Tracker** - Visual usage dashboards
- **Subscription Status** - Billing management interface
- **Feature Gates** - Elegant upgrade prompts
- **Trial Warnings** - Automatic expiration reminders

### 🏗️ **Architecture Benefits**

- **API Proxy Approach** - Secure backend integration
- **Scalable Backend** - Handle millions of users
- **Real-time Sync** - Instant subscription updates
- **Multiple Payment Methods** - Cards, PayPal, bank transfers
- **Global Support** - Multi-currency and tax handling

## Security Features

- **Input Validation** - All user inputs are validated and sanitized
- **CORS Handling** - API calls routed through background script
- **Rate Limiting** - Protection against API abuse
- **Secure Storage** - Encrypted storage for sensitive data
- **XSS Prevention** - Content Security Policy and input sanitization
- **API Key Protection** - Secure API key management

## Customization

### Adding New Features

1. **Create Service** - Add business logic in `lib/services/`
2. **Add Handler** - Create background handler in `lib/background/`
3. **Update Types** - Add interfaces in `lib/types/`
4. **Create UI** - Add React components and hooks
5. **Update Router** - Add message routing in `background.ts`

### Styling Customization

The extension uses CSS custom properties for theming:

```css
:root {
  --primary-color: #2563eb;
  --background: #ffffff;
  --text-primary: #1e293b;
}

[data-theme="dark"] {
  --background: #0f172a;
  --text-primary: #f1f5f9;
}
```

## Deployment

### Building for Production

```bash
pnpm build
```

### Publishing to Chrome Web Store

1. **Zip the dist folder** after building
2. **Upload to Chrome Web Store Developer Dashboard**
3. **Fill out store listing** with description and screenshots
4. **Submit for review**

### Version Management

Update version in three places:

- `package.json`
- `manifest.json`
- `lib/utils/constants.ts`

## Troubleshooting

### Common Issues

**Extension not loading:**

- Check manifest.json syntax
- Verify all file paths exist
- Check console for build errors

**Background script not responding:**

- Check service worker in Chrome DevTools
- Verify message types match constants
- Check async/await usage

**UI not updating:**

- Verify React hooks are used correctly
- Check message passing between components
- Ensure state updates are immutable

### Debug Mode

Enable debug mode in development:

```typescript
// lib/utils/constants.ts
export const FEATURE_FLAGS = {
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development'
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## 📚 Documentation & Support

### 📖 Getting Started

- 🚀 [**Onboarding Guide**](./docs/onboarding-guide.md) - Complete setup and
  customization guide
- ⚡ [**Quick Reference**](./docs/quick-reference.md) - Commands, patterns, and
  common tasks
- 🛠 [**Scripts Documentation**](./scripts/README.md) - Automation scripts
  reference

### 🏗️ Architecture & Design

- 🏛️
  [Chrome Extension Architecture](./docs/chrome-extension-architecture-patterns.md)
- 🔧 [Separation of Concerns Guide](./docs/separation-of-concerns-guide.md)
- 🌐 [CORS Handling Strategies](./docs/cors-handling-strategies.md)
- 🔒
  [Security & Authentication Patterns](./docs/authentication-security-patterns.md)
- 🏗️ [Backend Architecture Guide](./docs/backend-architecture-guide.md)

### 🚀 Advanced Topics

- 📊 [Data Synchronization Patterns](./docs/data-synchronization-patterns.md)
- 🚀 [Deployment & Scaling Strategies](./docs/deployment-scaling-strategies.md)
- 💡 [Development Best Practices](./docs/development-best-practices.md)

### 🆘 Support Channels

- 📖
  [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- 🐛 [Issue Tracker](https://github.com/your-repo/issues)
- 💬 [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 [Email Support](mailto:support@yourextension.com)

---

Built with ❤️ using clean architecture principles and modern web technologies.
