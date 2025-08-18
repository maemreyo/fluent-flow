# Chrome Extension Starter - Developer Onboarding Guide

Welcome to the Chrome Extension Starter! This comprehensive guide will help you get up and running quickly with our production-ready Chrome extension template.

## 🎯 What You Get

This starter provides a complete, enterprise-grade foundation for Chrome extension development:

- **Modern Tech Stack**: TypeScript, React, Plasmo framework
- **AI Integration**: OpenAI, Anthropic Claude, or custom providers
- **Payment System**: Complete subscription/monetization with Stripe
- **Clean Architecture**: Separation of concerns, modular design
- **Professional Libraries**: Replaced custom code with industry-standard solutions
- **Development Tools**: Automated workflows, testing, deployment
- **Security**: Input validation, CORS handling, secure license validation

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Clone or copy the starter template
cd chrome-extension-starter

# Run the interactive setup wizard
node scripts/setup.js

# Or use npm if you prefer
npm run setup
```

The setup wizard will guide you through:
- Project configuration (name, description, author)
- AI provider selection (OpenAI, Anthropic, or custom)
- Payment system setup (optional)
- Analytics configuration (optional)
- Advanced features selection

### 2. Install Dependencies

```bash
# Install all dependencies (uses pnpm by default)
pnpm install

# Or with npm
npm install
```

### 3. Configure Environment

```bash
# Copy the generated .env.example to .env
cp .env.example .env

# Edit .env with your API keys and configuration
nano .env  # or your preferred editor
```

### 4. Start Development

```bash
# Start the development server
pnpm dev

# Open Chrome and go to chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" and select the "build" directory
```

## 📋 Essential Configuration

### AI Provider Setup

#### OpenAI
```env
AI_PROVIDER="openai"
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4"
```

#### Anthropic Claude
```env
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
ANTHROPIC_MODEL="claude-3-sonnet-20240229"
```

#### Custom Provider
```env
AI_PROVIDER="custom"
CUSTOM_AI_BASE_URL="https://your-api-endpoint.com"
CUSTOM_AI_API_KEY="your-custom-api-key-here"
CUSTOM_AI_MODEL="your-model-name"
```

### Payment System (Optional)

If you enabled payments during setup:

```env
PAYMENT_API_BASE_URL="https://your-backend-api.com"
STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
Your RSA public key here
-----END PUBLIC KEY-----"
```

**Important**: You'll need to create a backend API for payment processing. See the [Backend Architecture Guide](./backend-architecture-guide.md) for details.

## 🛠 Development Workflow

### Available Scripts

```bash
# Development
pnpm dev          # Start development server with hot reload
pnpm build        # Build for production
pnpm typecheck    # Run TypeScript type checking
pnpm lint         # Run ESLint
pnpm lint:fix     # Auto-fix ESLint issues
pnpm format       # Format code with Prettier

# Testing
pnpm test         # Run unit tests
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Generate coverage report

# Quality & Analysis
pnpm validate     # Run all quality checks
pnpm analyze      # Analyze bundle size and dependencies

# Deployment
pnpm package      # Create distributable package
pnpm deploy       # Run deployment workflow
```

### Development Tools

#### Interactive Development Menu
```bash
# Run the development workflow menu
node scripts/dev-workflow.js
```

This provides an interactive menu for:
- Code validation (TypeScript, ESLint, tests)
- Building and packaging
- Running tests
- Development server management
- Codebase analysis

#### Configuration Wizard
```bash
# Re-run configuration wizard
node scripts/configure.js
```

Use this to:
- Update AI provider settings
- Configure payment system
- Set up analytics
- Enable advanced features

## 📁 Project Structure

```
chrome-extension-starter/
├── 📁 components/          # React UI components
│   ├── ai-chat-panel.tsx   # AI chat interface
│   ├── upgrade-modal.tsx   # Subscription upgrade UI
│   └── usage-tracker.tsx   # Usage monitoring
├── 📁 lib/                 # Core logic
│   ├── 📁 services/        # Business logic layer
│   │   ├── ai-service.ts   # AI provider integration
│   │   ├── payment-service.ts # Payment & subscriptions
│   │   └── license-validator.ts # License validation
│   ├── 📁 stores/          # State management (Zustand)
│   │   ├── ai-store.ts     # AI conversation state
│   │   └── payment-store.ts # Payment & user state
│   ├── 📁 types/           # TypeScript definitions
│   └── 📁 utils/           # Utility functions
├── 📁 scripts/             # Development automation
│   ├── setup.js           # Interactive setup wizard
│   ├── configure.js       # Configuration wizard
│   ├── dev-workflow.js    # Development tools
│   └── deploy.js          # Deployment automation
├── 📁 docs/               # Documentation
└── 📁 __tests__/          # Test files
```

## 🎨 Customization Guide

### 1. Branding & UI

Update your extension's identity:

```typescript
// package.json
{
  "name": "your-extension-name",
  "displayName": "Your Extension Display Name",
  "description": "Your extension description"
}

// manifest.json (auto-updated by setup)
{
  "name": "Your Extension Name",
  "description": "Your extension description",
  "icons": {
    "16": "icon16.png",    // Add your icons
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

### 2. AI Features

Customize AI functionality:

```typescript
// lib/services/ai-service.ts
// Add custom AI functions
async customFeature(input: string): Promise<string> {
  return await this.chat([
    { role: 'system', content: 'Your custom system prompt' },
    { role: 'user', content: input }
  ])
}
```

### 3. UI Components

Customize the interface:

```typescript
// components/your-component.tsx
import { useAIStore } from '../lib/stores/ai-store'
import { usePaymentStore } from '../lib/stores/payment-store'

export const YourComponent = () => {
  const { conversations } = useAIStore()
  const { user, subscription } = usePaymentStore()
  
  // Your component logic
}
```

## 🔐 Security Best Practices

### Environment Variables
- Never commit `.env` files to version control
- Use different `.env` files for different environments
- Regularly rotate API keys
- Use strong RSA keys for license validation

### Content Security Policy
The extension includes secure CSP headers. When adding new features:

```json
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Input Validation
All user inputs are validated:

```typescript
// lib/utils/validation.ts
export const validateInput = (input: string): ValidationResult => {
  // Validation logic
}
```

## 🧪 Testing Strategy

### Unit Tests
```bash
# Run all tests
pnpm test

# Test specific component
pnpm test ai-service

# Watch mode
pnpm test:watch
```

### Test Structure
```
__tests__/
├── components/         # UI component tests
├── services/          # Business logic tests
├── hooks/            # Custom hook tests
└── utils/            # Utility function tests
```

### Writing Tests
```typescript
// __tests__/services/ai-service.test.ts
import { AIService } from '../../lib/services/ai-service'

describe('AIService', () => {
  it('should process AI requests', async () => {
    const service = new AIService(mockConfig)
    const result = await service.chat([
      { role: 'user', content: 'Hello' }
    ])
    
    expect(result.content).toBeDefined()
  })
})
```

## 🚀 Deployment Guide

### 1. Pre-deployment Checklist
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] ESLint validation passed
- [ ] Environment variables configured
- [ ] Icons and assets added
- [ ] Privacy policy updated (if collecting data)
- [ ] Store listing content prepared

### 2. Building for Production
```bash
# Build and package
pnpm build
pnpm package

# Or use deployment script
node scripts/deploy.js
```

### 3. Store Submission

#### Chrome Web Store
1. Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Upload the generated ZIP file
3. Fill in store listing details
4. Submit for review

#### Other Stores
- **Microsoft Edge**: [Partner Center](https://partner.microsoft.com/)
- **Firefox**: [AMO Developer Hub](https://addons.mozilla.org/developers/)

## 📚 Learning Resources

### Documentation
- [Chrome Extension Architecture](./chrome-extension-architecture-patterns.md)
- [Separation of Concerns Guide](./separation-of-concerns-guide.md)
- [CORS Handling Strategies](./cors-handling-strategies.md)
- [Backend Architecture Guide](./backend-architecture-guide.md)

### External Resources
- [Plasmo Framework Docs](https://docs.plasmo.com/)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Getting Help

### Common Issues
1. **Extension not loading**: Check console for errors, verify manifest.json
2. **AI not working**: Verify API keys in .env file
3. **Build failures**: Run `pnpm clean` and rebuild
4. **Type errors**: Run `pnpm typecheck` for detailed information

### Support Channels
- 📖 Documentation: Check the `docs/` folder
- 🐛 Issues: GitHub repository issues
- 💬 Discussions: GitHub discussions
- 📧 Email: Your support email

## 🎉 Next Steps

Now that you're set up:

1. **Explore the codebase**: Understand the architecture and patterns
2. **Customize for your needs**: Add your specific features and branding
3. **Test thoroughly**: Use the built-in testing tools
4. **Deploy confidently**: Use the automated deployment scripts
5. **Monitor and iterate**: Use analytics to improve your extension

Welcome to modern Chrome extension development! 🚀