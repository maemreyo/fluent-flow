# Chrome Extension Starter - Scripts Documentation

This directory contains automation scripts that streamline the development workflow for Chrome extension projects. These scripts provide interactive wizards, automated testing, building, and deployment capabilities.

## 📋 Available Scripts

### 🚀 setup.js - Interactive Setup Wizard
The main onboarding script for new developers joining the project.

```bash
node scripts/setup.js
# or
pnpm run setup
```

**Features:**
- ✅ System requirements validation (Node.js, package manager, Chrome)
- 🎯 Interactive project configuration
- 🤖 AI provider selection and setup (OpenAI, Anthropic, Custom)
- 💳 Payment system configuration (optional)
- 📊 Analytics setup (optional)
- 📁 Automatic file generation (.env, runtime config)
- 🧹 Dependency installation and quality checks

**Generated Files:**
- `.env.example` - Environment variables template
- `.env` - Your actual environment file
- `lib/config/runtime-config.ts` - TypeScript configuration interface
- Updated `package.json` and `manifest.json`

### 🔧 configure.js - Advanced Configuration Wizard
Detailed configuration wizard for complex features after initial setup.

```bash
node scripts/configure.js
```

**Features:**
- 🤖 **AI Provider Configuration**: Detailed setup for OpenAI, Anthropic, or custom providers
- 💳 **Payment System Setup**: Complete Stripe integration, subscription plans, license validation
- 📊 **Analytics Configuration**: Google Analytics, Mixpanel, Amplitude, or custom analytics
- ⚙️ **Advanced Features**: Caching strategies, rate limiting, experimental features
- 📝 **Configuration Summary**: Generated markdown report of your settings

**Configuration Sections:**
1. **AI Provider**: API keys, models, parameters, streaming settings
2. **Payment System**: Stripe keys, backend API, RSA keys, subscription plans
3. **Analytics**: Tracking IDs, error reporting, performance monitoring
4. **Advanced Features**: Caching, rate limiting, offline mode, experimental features

### 🛠 dev-workflow.js - Development Automation
Interactive development workflow automation with both CLI and menu interfaces.

```bash
# Interactive menu
node scripts/dev-workflow.js

# Direct commands
node scripts/dev-workflow.js validate
node scripts/dev-workflow.js build
node scripts/dev-workflow.js watch
node scripts/dev-workflow.js test
```

**Available Tasks:**
1. **🔍 Validate Code**: TypeScript, ESLint, Prettier, Tests
2. **🏗️ Build Extension**: Production build with validation
3. **👀 Start Development Watch**: Hot-reload development server
4. **🧪 Run Tests**: Unit tests, coverage, E2E tests
5. **🔄 Reload Extension**: Chrome extension reload helper
6. **📦 Package Extension**: Create distributable ZIP
7. **📊 Analyze Codebase**: File counts, dependencies, code quality
8. **🧹 Clean Project**: Remove build artifacts
9. **🚀 Full CI Pipeline**: Complete validation → build → test workflow

**Analysis Features:**
- File type counting (TypeScript, JavaScript, React, Tests)
- Dependency analysis (production vs development)
- Code quality scoring based on checks
- Bundle size analysis

### 🚀 deploy.js - Deployment & Publishing
Comprehensive deployment automation for multiple environments and store distribution.

```bash
# Interactive deployment
node scripts/deploy.js

# Direct commands
node scripts/deploy.js build production
node scripts/deploy.js package build production
node scripts/deploy.js check
```

**Deployment Features:**
- 🔍 **Pre-deployment Checks**: Comprehensive validation before deployment
- 🏗️ **Multi-environment Builds**: Development, staging, production
- 📦 **Distribution Packages**: ZIP files with checksums and release notes
- 🚀 **Store Upload Preparation**: Chrome Web Store, Edge, Firefox ready packages
- 📊 **Deployment Reports**: Detailed markdown reports of deployment results

**Supported Environments:**
- **Development**: Debug builds with dev-specific manifest transforms
- **Staging**: Pre-production testing builds
- **Production**: Optimized builds for store distribution

**Store Integration Ready:**
- **Chrome Web Store**: API integration framework (requires setup)
- **Microsoft Edge Add-ons**: Partner Center API ready
- **Firefox AMO**: Add-on store API framework

## 🎯 Usage Workflows

### For New Developers
```bash
# 1. Initial setup
node scripts/setup.js

# 2. Configure advanced features (optional)
node scripts/configure.js

# 3. Start development
pnpm dev
```

### Daily Development
```bash
# Quick development menu
node scripts/dev-workflow.js

# Or specific tasks
node scripts/dev-workflow.js validate  # Check code quality
node scripts/dev-workflow.js test      # Run tests
node scripts/dev-workflow.js build     # Build extension
```

### Deployment & Release
```bash
# Full deployment workflow
node scripts/deploy.js

# Or step by step
node scripts/deploy.js check           # Pre-deployment checks
node scripts/deploy.js build production # Production build
node scripts/deploy.js package         # Create distribution packages
```

## 📁 Generated Files & Directories

### Configuration Files
```
.env                          # Environment variables (don't commit!)
.env.example                  # Template with placeholders
deploy.config.json           # Deployment configuration
lib/config/runtime-config.ts # TypeScript configuration interface
CONFIGURATION_SUMMARY.md     # Configuration overview
```

### Build & Distribution
```
build/                       # Development build output
dist/                       # Distribution packages
  ├── extension-v1.0.0-production.zip
  ├── extension-v1.0.0-production.checksums.txt
  ├── extension-v1.0.0-release-notes.md
  └── deployment-report.md
```

## 🔧 Customization

### Adding Custom Setup Steps
Edit `scripts/setup.js` to add project-specific setup:

```javascript
// Add custom configuration section
const configureCustomFeature = async () => {
  const enabled = await confirmPrompt('Enable custom feature?')
  return { enabled }
}

// Add to main setup flow
const config = await runInteractiveSetup()
config.customFeature = await configureCustomFeature()
```

### Custom Deployment Environments
Edit `deploy.config.json` or modify `scripts/deploy.js`:

```json
{
  "environments": {
    "beta": {
      "name": "Beta",
      "buildCommand": "pnpm run build:beta",
      "outputDir": "build-beta",
      "manifestTransforms": {
        "name": "name => `${name} (Beta)`"
      }
    }
  }
}
```

### Adding Development Tasks
Extend `scripts/dev-workflow.js`:

```javascript
const tasks = {
  // Add custom task
  async customTask() {
    log('Running custom task...', 'bright')
    // Your custom logic
    return true
  }
}
```

## 🔐 Security Considerations

### Environment Variables
- Scripts never commit `.env` files to version control
- API keys are validated but never logged
- Sensitive data is marked clearly in generated files

### Configuration Validation
- Input validation for all user-provided data
- Safe file operations with error handling
- Secure defaults for all configurations

### Deployment Security
- Checksums generated for all packages
- Build validation before deployment
- Secure manifest transformations

## 🐛 Troubleshooting

### Common Issues

**Setup Script Fails**
```bash
# Check Node.js version
node --version  # Should be >= 18.0.0

# Check package manager
pnpm --version  # or npm --version

# Clean and retry
rm -rf node_modules package-lock.json
pnpm install
```

**Configuration Issues**
```bash
# Reset configuration
rm .env deploy.config.json lib/config/runtime-config.ts
node scripts/setup.js  # Re-run setup
```

**Build Failures**
```bash
# Clean everything
node scripts/dev-workflow.js clean

# Validate configuration
node scripts/dev-workflow.js validate

# Check system requirements
node scripts/setup.js  # Will validate system
```

**Deployment Issues**
```bash
# Run pre-deployment checks
node scripts/deploy.js check

# Build specific environment
node scripts/deploy.js build development

# Check deployment configuration
node scripts/deploy.js config
```

### Script-Specific Debugging

Enable verbose logging by setting environment variable:
```bash
DEBUG=1 node scripts/setup.js
VERBOSE=1 node scripts/dev-workflow.js validate
```

## 📚 Script Architecture

### Design Principles
- **Interactive First**: All scripts provide guided, interactive experiences
- **Fallback to CLI**: Command-line arguments for automation
- **Comprehensive Validation**: Extensive checks before operations
- **Graceful Error Handling**: Clear error messages and recovery suggestions
- **Idempotent Operations**: Safe to run multiple times

### Code Structure
```javascript
// Common pattern in all scripts
const colors = { /* color definitions */ }
const log = (message, color) => { /* colored logging */ }
const prompt = (question) => { /* interactive prompts */ }
const confirmPrompt = (question) => { /* yes/no prompts */ }

// Main workflow
const runWorkflow = async () => {
  try {
    // Validation
    // Interactive configuration  
    // File operations
    // Success reporting
  } catch (error) {
    // Error handling
  } finally {
    // Cleanup
  }
}
```

### Dependencies
All scripts use only Node.js built-ins plus:
- `readline` - Interactive prompts
- `fs/path` - File operations  
- `child_process` - Command execution
- `crypto` - Checksums and hashing

## 🚀 Contributing

### Adding New Scripts
1. Follow the established patterns (colors, logging, error handling)
2. Include both interactive and CLI modes
3. Add comprehensive validation
4. Update this README
5. Add to package.json scripts section

### Script Guidelines
- Always validate inputs
- Provide clear progress feedback
- Handle errors gracefully
- Generate helpful output files
- Include usage examples in comments

### Testing Scripts
```bash
# Test with different inputs
DEBUG=1 node scripts/your-script.js

# Test CLI modes
node scripts/your-script.js command arg1 arg2

# Test error conditions
# (invalid inputs, missing files, etc.)
```

---

These scripts represent a complete development automation suite, designed to make Chrome extension development as smooth and professional as possible. They embody best practices for developer onboarding, workflow automation, and deployment processes.