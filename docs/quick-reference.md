# Chrome Extension Starter - Quick Reference

A concise reference for common tasks and commands in the Chrome Extension Starter.

## 🚀 Quick Commands

### Setup & Configuration
```bash
# Initial setup wizard
node scripts/setup.js

# Configuration wizard
node scripts/configure.js

# Development workflow menu
node scripts/dev-workflow.js

# Deployment script
node scripts/deploy.js
```

### Development
```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm typecheck        # TypeScript validation
pnpm lint             # Code linting
pnpm test             # Run tests
pnpm package          # Create distributable package
```

### Quality Checks
```bash
pnpm validate         # All quality checks
pnpm test:coverage    # Coverage report
pnpm analyze          # Bundle analysis
pnpm clean            # Clean build files
```

## 📁 File Structure Reference

```
├── background.ts          # Background script (service worker)
├── content.ts            # Content script
├── popup.tsx             # Extension popup
├── sidepanel.tsx         # Side panel UI
├── options.tsx           # Options page
├── manifest.json         # Extension manifest
├── components/           # React components
├── lib/
│   ├── services/         # Business logic
│   ├── stores/          # State management
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities
├── scripts/             # Development scripts
└── docs/               # Documentation
```

## 🔧 Configuration Quick Setup

### Environment Variables (.env)
```env
# Project
PROJECT_NAME="Your Extension"
PROJECT_DESCRIPTION="Extension description"

# AI Provider (choose one)
AI_PROVIDER="openai"          # or "anthropic" or "custom"
OPENAI_API_KEY="sk-..."       # OpenAI key
ANTHROPIC_API_KEY="sk-ant..." # Anthropic key

# Payment (optional)
STRIPE_PUBLISHABLE_KEY="pk_test_..."
PAYMENT_API_BASE_URL="https://your-api.com"

# Features
ENABLE_CACHING="true"
ENABLE_RATE_LIMITING="true"
```

### Manifest.json Key Fields
```json
{
  "name": "Your Extension Name",
  "version": "1.0.0",
  "description": "Your extension description",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://*/*"]
}
```

## 🤖 AI Integration Quick Start

### Basic AI Service Usage
```typescript
import { AIService } from '../lib/services/ai-service'
import { useAIStore } from '../lib/stores/ai-store'

// Initialize service
const aiService = new AIService({
  provider: 'openai',
  apiKey: 'your-key',
  model: 'gpt-4'
})

// Basic chat
const response = await aiService.chat([
  { role: 'user', content: 'Hello!' }
])

// Use store
const { conversations, addMessage } = useAIStore()
```

### AI Features Available
```typescript
// Text processing
await aiService.summarizeText(text)
await aiService.translateText(text, targetLang)
await aiService.explainText(text)
await aiService.analyzeText(text)

// Custom chat
await aiService.chat(messages, {
  temperature: 0.7,
  maxTokens: 1000,
  stream: false
})
```

## 💳 Payment System Quick Setup

### Store Usage
```typescript
import { usePaymentStore } from '../lib/stores/payment-store'

const {
  user,
  subscription,
  login,
  createCheckoutSession,
  checkFeatureAccess
} = usePaymentStore()

// Check feature access
const canUse = await checkFeatureAccess('ai_requests')

// Create checkout
const session = await createCheckoutSession({
  planId: 'pro',
  successUrl: 'https://yoursite.com/success'
})
```

### Feature Gates
```typescript
import { FeatureGate, useFeatureGate } from '../lib/utils/feature-gates'

// Component-based
<FeatureGate featureId="ai_requests">
  <AIComponent />
</FeatureGate>

// Hook-based  
const { hasAccess, requireAccess } = useFeatureGate('ai_requests')
```

## 🧪 Testing Quick Reference

### Test Structure
```typescript
// Component test
import { render, screen } from '@testing-library/react'
import { YourComponent } from '../components/YourComponent'

test('renders correctly', () => {
  render(<YourComponent />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})

// Service test
import { AIService } from '../lib/services/ai-service'

test('processes AI request', async () => {
  const service = new AIService(mockConfig)
  const result = await service.chat([])
  expect(result).toBeDefined()
})
```

### Test Commands
```bash
pnpm test                 # All tests
pnpm test:watch          # Watch mode
pnpm test:coverage       # With coverage
pnpm test ai-service     # Specific test
```

## 🎨 UI Components Quick Reference

### Available Components
```typescript
// AI Components
import { AIChatPanel } from '../components/ai-chat-panel'
import { AIQuickActions } from '../components/ai-quick-actions'

// Payment Components
import { UpgradeModal } from '../components/upgrade-modal'
import { UsageTracker } from '../components/usage-tracker'
import { SubscriptionStatus } from '../components/subscription-status'

// Usage
<AIChatPanel selectedText={text} onClose={handleClose} />
<UpgradeModal isOpen={showUpgrade} onClose={handleClose} />
<UsageTracker showLimits={true} />
```

### Styling
```typescript
// Tailwind CSS classes available
className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600"

// Dark mode support
className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
```

## 🔐 Security Quick Tips

### Input Validation
```typescript
import { validateInput } from '../lib/utils/validation'

const result = validateInput(userInput)
if (!result.isValid) {
  throw new Error(result.error)
}
```

### Safe API Calls
```typescript
// Use the base service for automatic retries and error handling
import { ImprovedBaseService } from '../lib/services/improved-base-service'

class YourService extends ImprovedBaseService {
  async yourMethod() {
    return this.get('/endpoint') // Automatic error handling
  }
}
```

## 📦 Deployment Quick Reference

### Build Process
```bash
# Production build
NODE_ENV=production pnpm build

# Create package
pnpm package

# Full deployment
node scripts/deploy.js
```

### Pre-deployment Checklist
- [ ] Tests passing: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] Linting clean: `pnpm lint`
- [ ] Environment configured: Check `.env`
- [ ] Icons added: `public/` directory
- [ ] Store listing ready

### Store Upload
1. **Chrome Web Store**: Upload ZIP to [Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. **Edge Add-ons**: Upload to [Partner Center](https://partner.microsoft.com/)
3. **Firefox AMO**: Upload to [Developer Hub](https://addons.mozilla.org/developers/)

## 🛠 Common Patterns

### Message Passing
```typescript
// Background to content script
chrome.tabs.sendMessage(tabId, { type: 'ACTION', data })

// Content script to background
chrome.runtime.sendMessage({ type: 'ACTION', data })

// Using the message router
import { messageRouter } from '../lib/background/message-router'
messageRouter.handle('ACTION_TYPE', handler)
```

### Storage Operations
```typescript
import { Storage } from '@plasmohq/storage'

const storage = new Storage()

// Set data
await storage.set('key', value)

// Get data
const value = await storage.get('key')

// Remove data
await storage.remove('key')
```

### Chrome APIs
```typescript
// Tabs
const tab = await chrome.tabs.getCurrent()
const tabs = await chrome.tabs.query({ active: true })

// Storage
await chrome.storage.local.set({ key: value })
const result = await chrome.storage.local.get('key')

// Context menus
chrome.contextMenus.create({
  id: 'menu-id',
  title: 'Menu Item',
  contexts: ['selection']
})
```

## 🐛 Troubleshooting

### Common Issues
| Issue | Solution |
|-------|----------|
| Extension not loading | Check console errors, verify manifest.json |
| AI not responding | Verify API key in .env file |
| Build failing | Run `pnpm clean && pnpm install` |
| Type errors | Run `pnpm typecheck` for details |
| Tests failing | Check test setup in `src/setupTests.ts` |

### Debug Commands
```bash
# Check all systems
pnpm validate

# Clean everything
pnpm clean

# Reinstall dependencies
pnpm clean && pnpm install

# Check configuration
node scripts/configure.js
```

## 📚 Documentation Links

- [Onboarding Guide](./onboarding-guide.md) - Complete setup guide
- [Architecture Patterns](./chrome-extension-architecture-patterns.md) - Design patterns
- [Separation of Concerns](./separation-of-concerns-guide.md) - Code organization
- [CORS Handling](./cors-handling-strategies.md) - Network requests
- [Backend Setup](./backend-architecture-guide.md) - Payment backend

## 🔗 External Resources

- [Plasmo Docs](https://docs.plasmo.com/) - Framework documentation
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - Official API docs
- [React](https://react.dev/) - UI library docs
- [TypeScript](https://www.typescriptlang.org/docs/) - Language docs
- [Tailwind CSS](https://tailwindcss.com/docs) - Styling framework