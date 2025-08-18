# Environment Configuration

## Environment Files
- **Template**: `.env.example` (commit to repo)
- **Development**: `.env.local` (NOT committed, user creates)
- **Production**: Set via deployment environment

## Key Environment Variables

### Core Extension
- `NODE_ENV`: development/production
- `PLASMO_PUBLIC_EXTENSION_NAME`: Extension display name
- `PLASMO_PUBLIC_VERSION`: Version number

### API Configuration
- `PLASMO_PUBLIC_API_BASE_URL`: Main API endpoint
- `PLASMO_PUBLIC_API_TIMEOUT`: Request timeout (default: 30000ms)

### AI Services
- `PLASMO_PUBLIC_OPENAI_API_KEY`: OpenAI API key
- `PLASMO_PUBLIC_ANTHROPIC_API_KEY`: Anthropic Claude API key
- `PLASMO_PUBLIC_AI_DEFAULT_PROVIDER`: Default AI provider

### Payment System
- `PLASMO_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe public key
- `STRIPE_SECRET_KEY`: Stripe secret (backend only)
- `PLASMO_PUBLIC_PAYMENT_API_URL`: Payment backend URL

### Feature Flags
- `PLASMO_PUBLIC_ENABLE_AI_FEATURES`: Enable/disable AI features
- `PLASMO_PUBLIC_ENABLE_PAYMENT_FEATURES`: Enable/disable payments
- `PLASMO_PUBLIC_ENABLE_ANALYTICS`: Enable/disable analytics
- `PLASMO_PUBLIC_ENABLE_DEBUG_MODE`: Debug mode toggle

### Security
- `JWT_SECRET`: JWT signing secret (backend)
- `ENCRYPTION_KEY`: Data encryption key
- `PLASMO_PUBLIC_CSP_NONCE`: Content Security Policy nonce

### Rate Limiting & Caching
- `PLASMO_PUBLIC_RATE_LIMIT_REQUESTS`: Max requests per window
- `PLASMO_PUBLIC_RATE_LIMIT_WINDOW`: Rate limit window (ms)
- `PLASMO_PUBLIC_CACHE_TTL`: Cache time-to-live (ms)
- `PLASMO_PUBLIC_CACHE_MAX_SIZE`: Max cache entries

## Environment Setup Process
1. Copy `.env.example` to `.env.local`
2. Fill in required API keys and configuration
3. Ensure `.env.local` is in `.gitignore`
4. Use environment variables in code via `process.env.PLASMO_PUBLIC_*`

## Security Notes
- Only `PLASMO_PUBLIC_*` variables are accessible in browser
- Never commit real API keys to repository
- Use different keys for development/production
- Rotate keys regularly