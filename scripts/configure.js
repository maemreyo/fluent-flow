#!/usr/bin/env node

/**
 * Chrome Extension Starter - Configuration Wizard
 * 
 * Advanced configuration wizard for AI providers, payment systems,
 * and other complex features after initial setup.
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

// Configuration sections
const configureAIProvider = async () => {
  log('\n🤖 AI PROVIDER CONFIGURATION', 'bright')
  
  const providers = [
    { 
      value: 'openai', 
      label: 'OpenAI', 
      description: 'GPT-4, GPT-3.5-turbo (requires OpenAI API key)',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    { 
      value: 'anthropic', 
      label: 'Anthropic Claude', 
      description: 'Claude 3 Opus, Sonnet, Haiku (requires Anthropic API key)',
      models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
    },
    { 
      value: 'custom', 
      label: 'Custom Provider', 
      description: 'Your own OpenAI-compatible API endpoint'
    }
  ]

  const selectedProvider = await multiChoice('Choose your AI provider:', providers)
  
  const config = {
    provider: selectedProvider.value,
    apiKey: '',
    model: '',
    baseUrl: '',
    maxTokens: 4000,
    temperature: 0.7,
    stream: false
  }

  if (selectedProvider.value === 'openai') {
    config.apiKey = await prompt('OpenAI API Key:') || 'your-openai-api-key-here'
    const modelChoice = await multiChoice('Choose model:', selectedProvider.models.map(m => ({ value: m, label: m })))
    config.model = modelChoice.value
  } else if (selectedProvider.value === 'anthropic') {
    config.apiKey = await prompt('Anthropic API Key:') || 'your-anthropic-api-key-here'
    const modelChoice = await multiChoice('Choose model:', selectedProvider.models.map(m => ({ value: m, label: m })))
    config.model = modelChoice.value
  } else if (selectedProvider.value === 'custom') {
    config.baseUrl = await prompt('Custom API Base URL:') || 'https://your-api-endpoint.com'
    config.apiKey = await prompt('Custom API Key:') || 'your-custom-api-key-here'
    config.model = await prompt('Model Name:') || 'your-model-name'
  }

  const maxTokensInput = await prompt(`Max Tokens (default: ${config.maxTokens}):`)
  if (maxTokensInput) config.maxTokens = parseInt(maxTokensInput)

  const temperatureInput = await prompt(`Temperature (0.0-2.0, default: ${config.temperature}):`)
  if (temperatureInput) config.temperature = parseFloat(temperatureInput)

  config.stream = await confirmPrompt('Enable streaming responses?')

  return config
}

const configurePaymentSystem = async () => {
  log('\n💳 PAYMENT SYSTEM CONFIGURATION', 'bright')
  
  const enable = await confirmPrompt('Enable payment/subscription system?')
  if (!enable) return { enabled: false }

  log('\n📋 Payment system requires:', 'yellow')
  log('  • Stripe account (for payment processing)', 'yellow')
  log('  • Backend API (for subscription management)', 'yellow')
  log('  • RSA key pair (for license signing)', 'yellow')
  log('  • Database (for user/subscription data)', 'yellow')

  const config = {
    enabled: true,
    stripePublishableKey: '',
    backendApiUrl: '',
    licensePublicKey: '',
    supportedPlans: []
  }

  config.stripePublishableKey = await prompt('Stripe Publishable Key:') || 'pk_test_your-stripe-publishable-key'
  config.backendApiUrl = await prompt('Backend API URL:') || 'https://your-backend-api.com'

  log('\n🔐 For license validation, you need an RSA key pair:', 'cyan')
  log('  Generate with: openssl genrsa -out private.pem 2048', 'blue')
  log('  Extract public: openssl rsa -in private.pem -pubout -out public.pem', 'blue')
  
  config.licensePublicKey = await prompt('RSA Public Key (paste here or file path):') || '-----BEGIN PUBLIC KEY-----\\nYour RSA public key here\\n-----END PUBLIC KEY-----'

  const setupPlans = await confirmPrompt('Configure subscription plans now?')
  if (setupPlans) {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        limits: { aiRequests: 10, conversations: 5 }
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 9.99,
        limits: { aiRequests: 1000, conversations: 100 }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 29.99,
        limits: { aiRequests: -1, conversations: -1 }
      }
    ]
    
    config.supportedPlans = plans
    log('✅ Added default subscription plans (Free, Pro, Enterprise)', 'green')
  }

  return config
}

const configureAnalytics = async () => {
  log('\n📊 ANALYTICS & MONITORING CONFIGURATION', 'bright')
  
  const enable = await confirmPrompt('Enable analytics and monitoring?')
  if (!enable) return { enabled: false }

  const config = {
    enabled: true,
    trackingId: '',
    sentryDsn: '',
    errorReporting: true,
    performanceMonitoring: true,
    userAnalytics: false
  }

  const providers = [
    { value: 'google', label: 'Google Analytics', description: 'Web analytics' },
    { value: 'mixpanel', label: 'Mixpanel', description: 'Event tracking' },
    { value: 'amplitude', label: 'Amplitude', description: 'Product analytics' },
    { value: 'custom', label: 'Custom', description: 'Your own analytics endpoint' }
  ]

  const selectedProvider = await multiChoice('Choose analytics provider:', providers)
  config.provider = selectedProvider.value
  config.trackingId = await prompt('Analytics Tracking ID:') || 'your-tracking-id'

  config.errorReporting = await confirmPrompt('Enable error reporting (Sentry)?')
  if (config.errorReporting) {
    config.sentryDsn = await prompt('Sentry DSN:') || 'your-sentry-dsn'
  }

  config.performanceMonitoring = await confirmPrompt('Enable performance monitoring?')
  config.userAnalytics = await confirmPrompt('Enable user behavior analytics?') 

  return config
}

const configureAdvancedFeatures = async () => {
  log('\n⚙️ ADVANCED FEATURES CONFIGURATION', 'bright')
  
  const config = {
    caching: true,
    rateLimiting: true,
    offlineMode: false,
    batchProcessing: false,
    experimentalFeatures: []
  }

  config.caching = await confirmPrompt('Enable intelligent caching? (recommended)')
  if (config.caching) {
    const cacheStrategy = await multiChoice('Choose caching strategy:', [
      { value: 'memory', label: 'Memory Only', description: 'Fast, but data lost on restart' },
      { value: 'storage', label: 'Storage Only', description: 'Persistent, but slower' },
      { value: 'hybrid', label: 'Hybrid', description: 'Best of both (recommended)' }
    ])
    config.cacheStrategy = cacheStrategy.value
  }

  config.rateLimiting = await confirmPrompt('Enable rate limiting? (recommended)')
  config.offlineMode = await confirmPrompt('Enable offline mode?')
  config.batchProcessing = await confirmPrompt('Enable batch processing?')

  const experimental = await confirmPrompt('Enable experimental features?')
  if (experimental) {
    const features = [
      { value: 'streaming-ai', label: 'Streaming AI Responses' },
      { value: 'voice-input', label: 'Voice Input Support' },
      { value: 'advanced-search', label: 'Advanced Text Search' },
      { value: 'auto-translate', label: 'Auto-Translation' },
      { value: 'smart-shortcuts', label: 'Smart Keyboard Shortcuts' }
    ]

    log('\nSelect experimental features to enable:', 'cyan')
    for (const feature of features) {
      const enable = await confirmPrompt(`  ${feature.label}?`)
      if (enable) config.experimentalFeatures.push(feature.value)
    }
  }

  return config
}

const generateConfigFiles = (configs) => {
  try {
    // Update .env file
    const envPath = '.env'
    let envContent = ''

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
    }

    // AI Configuration
    if (configs.ai) {
      envContent = updateEnvVariable(envContent, 'AI_PROVIDER', configs.ai.provider)
      if (configs.ai.provider === 'openai') {
        envContent = updateEnvVariable(envContent, 'OPENAI_API_KEY', configs.ai.apiKey)
        envContent = updateEnvVariable(envContent, 'OPENAI_MODEL', configs.ai.model)
      } else if (configs.ai.provider === 'anthropic') {
        envContent = updateEnvVariable(envContent, 'ANTHROPIC_API_KEY', configs.ai.apiKey)
        envContent = updateEnvVariable(envContent, 'ANTHROPIC_MODEL', configs.ai.model)
      } else if (configs.ai.provider === 'custom') {
        envContent = updateEnvVariable(envContent, 'CUSTOM_AI_BASE_URL', configs.ai.baseUrl)
        envContent = updateEnvVariable(envContent, 'CUSTOM_AI_API_KEY', configs.ai.apiKey)
        envContent = updateEnvVariable(envContent, 'CUSTOM_AI_MODEL', configs.ai.model)
      }
      envContent = updateEnvVariable(envContent, 'AI_MAX_TOKENS', configs.ai.maxTokens.toString())
      envContent = updateEnvVariable(envContent, 'AI_TEMPERATURE', configs.ai.temperature.toString())
      envContent = updateEnvVariable(envContent, 'AI_STREAM', configs.ai.stream.toString())
    }

    // Payment Configuration
    if (configs.payment && configs.payment.enabled) {
      envContent = updateEnvVariable(envContent, 'PAYMENT_API_BASE_URL', configs.payment.backendApiUrl)
      envContent = updateEnvVariable(envContent, 'STRIPE_PUBLISHABLE_KEY', configs.payment.stripePublishableKey)
      envContent = updateEnvVariable(envContent, 'LICENSE_PUBLIC_KEY', configs.payment.licensePublicKey)
    }

    // Analytics Configuration
    if (configs.analytics && configs.analytics.enabled) {
      envContent = updateEnvVariable(envContent, 'ANALYTICS_TRACKING_ID', configs.analytics.trackingId)
      if (configs.analytics.errorReporting) {
        envContent = updateEnvVariable(envContent, 'SENTRY_DSN', configs.analytics.sentryDsn)
      }
      envContent = updateEnvVariable(envContent, 'ERROR_REPORTING', configs.analytics.errorReporting.toString())
    }

    // Advanced Features
    if (configs.advanced) {
      envContent = updateEnvVariable(envContent, 'ENABLE_CACHING', configs.advanced.caching.toString())
      envContent = updateEnvVariable(envContent, 'ENABLE_RATE_LIMITING', configs.advanced.rateLimiting.toString())
      envContent = updateEnvVariable(envContent, 'ENABLE_OFFLINE_MODE', configs.advanced.offlineMode.toString())
      envContent = updateEnvVariable(envContent, 'ENABLE_BATCH_PROCESSING', configs.advanced.batchProcessing.toString())
      if (configs.advanced.experimentalFeatures.length > 0) {
        envContent = updateEnvVariable(envContent, 'EXPERIMENTAL_FEATURES', configs.advanced.experimentalFeatures.join(','))
      }
    }

    fs.writeFileSync(envPath, envContent)
    log('✅ Updated .env configuration', 'green')

    // Generate config summary
    const summaryPath = 'CONFIGURATION_SUMMARY.md'
    const summary = generateConfigSummary(configs)
    fs.writeFileSync(summaryPath, summary)
    log('✅ Generated CONFIGURATION_SUMMARY.md', 'green')

    return true
  } catch (error) {
    log(`❌ Error generating config files: ${error.message}`, 'red')
    return false
  }
}

const updateEnvVariable = (content, key, value) => {
  const regex = new RegExp(`^${key}=.*$`, 'm')
  const line = `${key}="${value}"`
  
  if (regex.test(content)) {
    return content.replace(regex, line)
  } else {
    return content + (content.endsWith('\n') ? '' : '\n') + line + '\n'
  }
}

const generateConfigSummary = (configs) => {
  let summary = `# Chrome Extension Configuration Summary

Generated on: ${new Date().toISOString()}

## Configuration Overview

`

  if (configs.ai) {
    summary += `### AI Provider
- **Provider**: ${configs.ai.provider}
- **Model**: ${configs.ai.model}
- **Max Tokens**: ${configs.ai.maxTokens}
- **Temperature**: ${configs.ai.temperature}
- **Streaming**: ${configs.ai.stream ? 'Enabled' : 'Disabled'}
${configs.ai.baseUrl ? `- **Base URL**: ${configs.ai.baseUrl}` : ''}

`
  }

  if (configs.payment && configs.payment.enabled) {
    summary += `### Payment System
- **Status**: Enabled
- **Backend API**: ${configs.payment.backendApiUrl}
- **Stripe Integration**: Configured
${configs.payment.supportedPlans.length > 0 ? `- **Plans**: ${configs.payment.supportedPlans.map(p => p.name).join(', ')}` : ''}

`
  }

  if (configs.analytics && configs.analytics.enabled) {
    summary += `### Analytics & Monitoring
- **Status**: Enabled
- **Provider**: ${configs.analytics.provider}
- **Error Reporting**: ${configs.analytics.errorReporting ? 'Enabled' : 'Disabled'}
- **Performance Monitoring**: ${configs.analytics.performanceMonitoring ? 'Enabled' : 'Disabled'}
- **User Analytics**: ${configs.analytics.userAnalytics ? 'Enabled' : 'Disabled'}

`
  }

  if (configs.advanced) {
    summary += `### Advanced Features
- **Caching**: ${configs.advanced.caching ? 'Enabled' : 'Disabled'}
- **Rate Limiting**: ${configs.advanced.rateLimiting ? 'Enabled' : 'Disabled'}
- **Offline Mode**: ${configs.advanced.offlineMode ? 'Enabled' : 'Disabled'}
- **Batch Processing**: ${configs.advanced.batchProcessing ? 'Enabled' : 'Disabled'}
${configs.advanced.experimentalFeatures.length > 0 ? `- **Experimental Features**: ${configs.advanced.experimentalFeatures.join(', ')}` : ''}

`
  }

  summary += `## Next Steps

1. **Review Configuration**: Check the .env file and update any placeholder values
2. **API Keys**: Add your actual API keys to the .env file
3. **Backend Setup**: If payments are enabled, set up your backend API
4. **Testing**: Run \`pnpm dev\` to test your configuration
5. **Documentation**: Check the docs/ folder for feature-specific guides

## Security Reminders

- Never commit your .env file to version control
- Regularly rotate your API keys
- Use environment-specific configurations for production
- Enable HTTPS for all API endpoints

## Support

- Documentation: ./docs/README.md
- Issues: GitHub repository
- Configuration: This file and .env
`

  return summary
}

// Main configuration flow
const runConfiguration = async () => {
  log('\n🔧 CHROME EXTENSION CONFIGURATION WIZARD', 'bright')
  log('This wizard will help you configure advanced features for your extension.\n', 'cyan')

  const configs = {}

  // Choose what to configure
  const sections = [
    { value: 'ai', label: 'AI Provider', description: 'Configure OpenAI, Anthropic, or custom AI' },
    { value: 'payment', label: 'Payment System', description: 'Set up subscriptions and monetization' },
    { value: 'analytics', label: 'Analytics', description: 'Configure tracking and monitoring' },
    { value: 'advanced', label: 'Advanced Features', description: 'Caching, rate limiting, experimental features' }
  ]

  log('Select sections to configure:', 'bright')
  const sectionsToConfig = []
  for (const section of sections) {
    const configure = await confirmPrompt(`  Configure ${section.label}?`)
    if (configure) sectionsToConfig.push(section.value)
  }

  if (sectionsToConfig.length === 0) {
    log('No sections selected. Exiting...', 'yellow')
    return
  }

  // Configure selected sections
  for (const section of sectionsToConfig) {
    switch (section) {
      case 'ai':
        configs.ai = await configureAIProvider()
        break
      case 'payment':
        configs.payment = await configurePaymentSystem()
        break
      case 'analytics':
        configs.analytics = await configureAnalytics()
        break
      case 'advanced':
        configs.advanced = await configureAdvancedFeatures()
        break
    }
  }

  // Generate configuration files
  log('\n📁 GENERATING CONFIGURATION...', 'bright')
  const success = generateConfigFiles(configs)

  if (success) {
    log('\n🎉 CONFIGURATION COMPLETE!', 'bright')
    log('\n📋 FILES UPDATED:', 'cyan')
    log('• .env - Environment variables', 'green')
    log('• CONFIGURATION_SUMMARY.md - Configuration overview', 'green')

    log('\n🔧 NEXT STEPS:', 'cyan')
    log('1. Review and update the .env file with your actual values', 'yellow')
    log('2. Add your API keys and secrets', 'yellow')
    log('3. Test your configuration with "pnpm dev"', 'yellow')
    log('4. Check CONFIGURATION_SUMMARY.md for details', 'yellow')

    log('\n⚠️  SECURITY REMINDER:', 'magenta')
    log('Never commit .env files to version control!', 'red')
  } else {
    log('\n❌ Configuration failed. Please check the errors above.', 'red')
  }
}

// Run configuration if called directly
if (require.main === module) {
  runConfiguration()
    .catch((error) => {
      log(`\n❌ Configuration failed: ${error.message}`, 'red')
      process.exit(1)
    })
    .finally(() => {
      rl.close()
    })
}

module.exports = { runConfiguration }