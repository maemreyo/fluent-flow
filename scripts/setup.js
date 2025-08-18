#!/usr/bin/env node

/**
 * Chrome Extension Starter - Interactive Setup Script
 * 
 * This script guides developers through the initial setup process,
 * configuring AI providers, payment systems, and project settings.
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { execSync } = require('child_process')

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Utility functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset} `, resolve)
  })
}

const confirmPrompt = async (question) => {
  const answer = await prompt(`${question} (y/N)`)
  return answer.toLowerCase().startsWith('y')
}

const multiChoice = async (question, choices) => {
  log(`\n${question}`, 'bright')
  choices.forEach((choice, index) => {
    log(`  ${index + 1}. ${choice.label} ${choice.description ? `- ${choice.description}` : ''}`)
  })
  
  let choice
  while (true) {
    const answer = await prompt(`Choose (1-${choices.length}):`)
    choice = parseInt(answer) - 1
    if (choice >= 0 && choice < choices.length) break
    log('Invalid choice. Please try again.', 'red')
  }
  
  return choices[choice]
}

console.log('🚀 Setting up Chrome Extension Starter...\n')

// Check Node.js version
const nodeVersion = process.version
const requiredVersion = '18.0.0'
console.log(`📋 Node.js version: ${nodeVersion}`)

if (nodeVersion < `v${requiredVersion}`) {
  console.error(`❌ Node.js ${requiredVersion} or higher is required`)
  process.exit(1)
}

// Check if package manager is available
function checkPackageManager() {
  const managers = ['pnpm', 'npm', 'yarn']
  
  for (const manager of managers) {
    try {
      execSync(`${manager} --version`, { stdio: 'ignore' })
      console.log(`✅ Package manager: ${manager}`)
      return manager
    } catch (error) {
      continue
    }
  }
  
  console.error('❌ No package manager found (npm, pnpm, or yarn required)')
  process.exit(1)
}

const packageManager = checkPackageManager()

// Create .env.local if it doesn't exist
function setupEnvironment() {
  const envExample = path.join(__dirname, '..', '.env.example')
  const envLocal = path.join(__dirname, '..', '.env.local')
  
  if (!fs.existsSync(envLocal) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envLocal)
    console.log('✅ Created .env.local from .env.example')
    console.log('📝 Please update .env.local with your API keys and configuration')
  }
}

// Install dependencies
function installDependencies() {
  console.log('\n📦 Installing dependencies...')
  try {
    execSync(`${packageManager} install`, { stdio: 'inherit' })
    console.log('✅ Dependencies installed successfully')
  } catch (error) {
    console.error('❌ Failed to install dependencies')
    process.exit(1)
  }
}

// Run type checking
function runTypeCheck() {
  console.log('\n🔍 Running type check...')
  try {
    execSync(`${packageManager} run typecheck`, { stdio: 'inherit' })
    console.log('✅ Type check passed')
  } catch (error) {
    console.warn('⚠️  Type check failed - you may need to fix TypeScript errors')
  }
}

// Run linting
function runLinting() {
  console.log('\n🧹 Running linter...')
  try {
    execSync(`${packageManager} run lint`, { stdio: 'inherit' })
    console.log('✅ Linting passed')
  } catch (error) {
    console.warn('⚠️  Linting failed - running auto-fix...')
    try {
      execSync(`${packageManager} run lint:fix`, { stdio: 'inherit' })
      console.log('✅ Auto-fix completed')
    } catch (fixError) {
      console.warn('⚠️  Some linting issues need manual fixing')
    }
  }
}

// Check Chrome browser
function checkChrome() {
  console.log('\n🌐 Checking Chrome browser...')
  const chromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows 32-bit
    '/usr/bin/google-chrome', // Linux
    '/usr/bin/chromium-browser' // Linux Chromium
  ]
  
  const chromeExists = chromePaths.some(chromePath => fs.existsSync(chromePath))
  
  if (chromeExists) {
    console.log('✅ Chrome browser found')
  } else {
    console.warn('⚠️  Chrome browser not found in standard locations')
    console.log('   Please ensure Chrome is installed for extension development')
  }
}

// Create build directory
function setupBuildDirectory() {
  const buildDir = path.join(__dirname, '..', 'build')
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true })
    console.log('✅ Created build directory')
  }
}

// Configuration templates
const createEnvTemplate = (config) => `# Chrome Extension Starter - Environment Configuration
# Copy this file to .env and fill in your actual values

# Project Information
PROJECT_NAME="${config.projectName}"
PROJECT_DESCRIPTION="${config.projectDescription}"
PROJECT_VERSION="1.0.0"
EXTENSION_ID="${config.extensionId || 'your-extension-id-here'}"

# Development Settings
NODE_ENV="development"
DEBUG_MODE="true"
VERBOSE_LOGGING="true"

# AI Provider Configuration
AI_PROVIDER="${config.aiProvider}"
${config.aiProvider === 'openai' ? `OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4"` : ''}
${config.aiProvider === 'anthropic' ? `ANTHROPIC_API_KEY="your-anthropic-api-key-here"
ANTHROPIC_MODEL="claude-3-sonnet-20240229"` : ''}
${config.aiProvider === 'custom' ? `CUSTOM_AI_BASE_URL="https://your-api-endpoint.com"
CUSTOM_AI_API_KEY="your-custom-api-key-here"
CUSTOM_AI_MODEL="your-model-name"` : ''}

# Payment & Subscription Settings (if enabled)
${config.enablePayments ? `PAYMENT_API_BASE_URL="https://your-backend-api.com"
STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\nYour RSA public key here\\n-----END PUBLIC KEY-----"` : '# Payment system disabled'}

# Analytics & Monitoring (optional)
${config.enableAnalytics ? `ANALYTICS_TRACKING_ID="your-tracking-id"
SENTRY_DSN="your-sentry-dsn"
ERROR_REPORTING="true"` : '# Analytics disabled'}

# Feature Flags
ENABLE_CACHING="true"
ENABLE_RATE_LIMITING="true"
ENABLE_OFFLINE_MODE="true"
ENABLE_BATCH_PROCESSING="true"
EXPERIMENTAL_FEATURES="streaming-ai,advanced-search"

# Security Settings
CORS_ORIGINS="https://your-domain.com,https://localhost:3000"
MAX_REQUEST_SIZE="10mb"
REQUEST_TIMEOUT="30000"

# Performance Settings
CACHE_TTL="3600000"
MAX_CACHE_SIZE="100"
BATCH_SIZE="10"
RATE_LIMIT_REQUESTS="100"
RATE_LIMIT_WINDOW="60000"
`

const createConfigTemplate = (config) => `/**
 * Chrome Extension Starter - Runtime Configuration
 * 
 * This file contains runtime configuration that can be loaded
 * dynamically based on environment variables.
 */

export interface RuntimeConfig {
  project: {
    name: string
    description: string
    version: string
    extensionId: string
  }
  environment: {
    isDevelopment: boolean
    debugMode: boolean
    verboseLogging: boolean
  }
  ai: {
    provider: 'openai' | 'anthropic' | 'custom'
    model: string
    baseUrl?: string
    maxTokens: number
    temperature: number
    stream: boolean
  }
  payments?: {
    apiBaseUrl: string
    stripePublishableKey: string
    licensePublicKey: string
  }
  features: {
    caching: boolean
    rateLimiting: boolean
    analytics: boolean
    payments: boolean
    offlineMode: boolean
    batchProcessing: boolean
  }
  performance: {
    cacheSettings: {
      ttl: number
      maxSize: number
    }
    rateLimiting: {
      requests: number
      windowMs: number
    }
    batchSize: number
    requestTimeout: number
  }
}

// Load configuration from environment variables
const loadConfig = (): RuntimeConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return {
    project: {
      name: process.env.PROJECT_NAME || '${config.projectName}',
      description: process.env.PROJECT_DESCRIPTION || '${config.projectDescription}',
      version: process.env.PROJECT_VERSION || '1.0.0',
      extensionId: process.env.EXTENSION_ID || chrome?.runtime?.id || ''
    },
    environment: {
      isDevelopment,
      debugMode: process.env.DEBUG_MODE === 'true' || isDevelopment,
      verboseLogging: process.env.VERBOSE_LOGGING === 'true' || isDevelopment
    },
    ai: {
      provider: process.env.AI_PROVIDER as any || '${config.aiProvider}',
      model: process.env.${config.aiProvider.toUpperCase()}_MODEL || '${config.aiProvider === 'openai' ? 'gpt-4' : config.aiProvider === 'anthropic' ? 'claude-3-sonnet-20240229' : 'default-model'}',
      ${config.aiProvider === 'custom' ? 'baseUrl: process.env.CUSTOM_AI_BASE_URL,' : ''}
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      stream: process.env.AI_STREAM === 'true'
    },
    ${config.enablePayments ? `payments: {
      apiBaseUrl: process.env.PAYMENT_API_BASE_URL || '',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      licensePublicKey: process.env.LICENSE_PUBLIC_KEY || ''
    },` : ''}
    features: {
      caching: process.env.ENABLE_CACHING === 'true',
      rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
      analytics: process.env.ANALYTICS_TRACKING_ID !== undefined,
      payments: ${config.enablePayments},
      offlineMode: process.env.ENABLE_OFFLINE_MODE === 'true',
      batchProcessing: process.env.ENABLE_BATCH_PROCESSING === 'true'
    },
    performance: {
      cacheSettings: {
        ttl: parseInt(process.env.CACHE_TTL || '3600000'),
        maxSize: parseInt(process.env.MAX_CACHE_SIZE || '100')
      },
      rateLimiting: {
        requests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000')
      },
      batchSize: parseInt(process.env.BATCH_SIZE || '10'),
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000')
    }
  }
}

export const config = loadConfig()
export default config
`

const updateManifestAndPackage = (config) => {
  try {
    // Update package.json
    const packagePath = path.join(__dirname, '..', 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    
    packageJson.name = config.projectName.toLowerCase().replace(/\s+/g, '-')
    packageJson.displayName = config.projectName
    packageJson.description = config.projectDescription
    packageJson.author = config.author
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))
    log('✅ Updated package.json', 'green')
    
    return true
  } catch (error) {
    log(`❌ Error updating project files: ${error.message}`, 'red')
    return false
  }
}

// Interactive configuration flow
const runInteractiveSetup = async () => {
  log('\n🎯 INTERACTIVE CONFIGURATION', 'bright')
  const useDefaults = await confirmPrompt('Skip interactive setup and use defaults?')
  
  if (useDefaults) {
    return {
      projectName: 'My Chrome Extension',
      projectDescription: 'A powerful Chrome extension built with modern tools',
      author: 'Extension Developer',
      aiProvider: 'openai',
      enablePayments: false,
      enableAnalytics: false
    }
  }

  const config = {}

  // Project Information
  log('\n📋 PROJECT INFORMATION', 'bright')
  config.projectName = await prompt('Extension Name:') || 'My Chrome Extension'
  config.projectDescription = await prompt('Extension Description:') || 'A powerful Chrome extension built with modern tools'
  config.author = await prompt('Author Name:') || 'Extension Developer'

  // AI Provider Selection
  const aiProviders = [
    { 
      value: 'openai', 
      label: 'OpenAI', 
      description: 'ChatGPT, GPT-4 (requires OpenAI API key)' 
    },
    { 
      value: 'anthropic', 
      label: 'Anthropic Claude', 
      description: 'Claude 3 (requires Anthropic API key)' 
    },
    { 
      value: 'custom', 
      label: 'Custom Provider', 
      description: 'Your own AI API endpoint' 
    }
  ]

  const selectedProvider = await multiChoice(
    '\n🤖 Choose your AI provider:',
    aiProviders
  )
  config.aiProvider = selectedProvider.value

  // Payment System
  log('\n💳 PAYMENT & MONETIZATION', 'bright')
  config.enablePayments = await confirmPrompt('Enable payment/subscription system?')
  
  if (config.enablePayments) {
    log('  ℹ️  You\'ll need to set up Stripe and create a backend API', 'yellow')
    log('  ℹ️  Check the documentation for backend setup instructions', 'yellow')
  }

  // Analytics
  log('\n📊 ANALYTICS & MONITORING', 'bright')
  config.enableAnalytics = await confirmPrompt('Enable analytics and error tracking?')

  return config
}

// Main setup function
async function main() {
  try {
    // System checks
    const packageManager = checkPackageManager()
    checkChrome()
    
    // Interactive configuration
    const config = await runInteractiveSetup()
    
    log('\n📁 GENERATING CONFIGURATION FILES...', 'bright')

    // Create .env.example
    const envTemplate = createEnvTemplate(config)
    fs.writeFileSync('.env.example', envTemplate)
    log('✅ Created .env.example', 'green')

    // Create runtime config
    const configTemplate = createConfigTemplate(config)
    const configDir = path.join(__dirname, '..', 'lib', 'config')
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    fs.writeFileSync(path.join(configDir, 'runtime-config.ts'), configTemplate)
    log('✅ Created lib/config/runtime-config.ts', 'green')

    // Update project files
    updateManifestAndPackage(config)

    // Create .env from template if it doesn't exist
    if (!fs.existsSync('.env')) {
      fs.copyFileSync('.env.example', '.env')
      log('✅ Created .env file (please update with your API keys)', 'green')
    }

    // Run remaining setup steps
    setupEnvironment()
    installDependencies()
    setupBuildDirectory()
    runTypeCheck()
    runLinting()
    
    log('\n🎉 SETUP COMPLETE!', 'bright')
    log('\n📋 NEXT STEPS:', 'cyan')
    log('1. Edit the .env file with your API keys and configuration', 'yellow')
    log('2. Run "pnpm dev" to start development', 'yellow')
    log('3. Load the extension in Chrome from chrome://extensions/', 'yellow')
    log('4. Enable "Developer mode" and click "Load unpacked"', 'yellow')
    log('5. Select the "build" directory', 'yellow')
    
    if (config.enablePayments) {
      log('6. Set up your backend API for payment processing', 'yellow')
      log('7. Configure Stripe webhooks and license validation', 'yellow')
    }

    log('\n📚 USEFUL COMMANDS:', 'cyan')
    log('• pnpm dev          - Start development server', 'blue')
    log('• pnpm build        - Build for production', 'blue')
    log('• pnpm test         - Run tests', 'blue')
    log('• pnpm lint         - Check code quality', 'blue')
    log('• pnpm typecheck    - Check TypeScript types', 'blue')

    log('\n📖 DOCUMENTATION:', 'cyan')
    log('• Check the docs/ folder for detailed guides', 'blue')
    log('• See README.md for quick start instructions', 'blue')
    log('• Visit the GitHub repository for examples', 'blue')

    if (config.aiProvider !== 'custom') {
      const providerName = config.aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'
      log(`\n🔑 Don't forget to add your ${providerName} API key to the .env file!`, 'magenta')
    }

    log('\nHappy coding! 🚀', 'green')
    
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red')
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()