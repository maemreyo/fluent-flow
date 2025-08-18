#!/usr/bin/env node

/**
 * Setup Script for Chrome Extension Starter
 * Initializes the project with user preferences and configurations
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

class ExtensionSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    this.config = {
      name: '',
      description: '',
      version: '1.0.0',
      author: '',
      homepage: '',
      apiBaseUrl: '',
      features: {
        caching: true,
        rateLimiting: true,
        analytics: false,
        debugMode: true
      }
    }
  }

  async run() {
    console.log('🚀 Chrome Extension Starter Setup')
    console.log('=====================================\n')

    try {
      await this.collectUserInput()
      await this.updateProjectFiles()
      await this.showCompletionMessage()
    } catch (error) {
      console.error('❌ Setup failed:', error.message)
      process.exit(1)
    } finally {
      this.rl.close()
    }
  }

  async collectUserInput() {
    console.log('📝 Project Configuration\n')

    this.config.name = await this.question('Extension name: ', 'My Chrome Extension')
    this.config.description = await this.question('Description: ', 'A modern Chrome extension built with clean architecture')
    this.config.version = await this.question('Version: ', '1.0.0')
    this.config.author = await this.question('Author: ', '')
    this.config.homepage = await this.question('Homepage URL (optional): ', '')
    
    console.log('\n🔧 Feature Configuration\n')
    
    this.config.features.caching = await this.confirm('Enable caching? ', true)
    this.config.features.rateLimiting = await this.confirm('Enable rate limiting? ', true)
    this.config.features.analytics = await this.confirm('Enable analytics? ', false)
    this.config.features.debugMode = await this.confirm('Enable debug mode? ', true)
    
    console.log('\n🌐 API Configuration\n')
    
    this.config.apiBaseUrl = await this.question('API base URL (optional): ', 'https://jsonplaceholder.typicode.com')
  }

  async updateProjectFiles() {
    console.log('\n📦 Updating project files...\n')

    await this.updatePackageJson()
    await this.updateManifest()
    await this.updateConstants()
    await this.createEnvFile()
    
    console.log('✅ All files updated successfully!')
  }

  async updatePackageJson() {
    const packagePath = path.join(__dirname, 'package.json')
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

    packageData.name = this.config.name.toLowerCase().replace(/\s+/g, '-')
    packageData.description = this.config.description
    packageData.version = this.config.version
    packageData.author = this.config.author
    
    if (this.config.homepage) {
      packageData.homepage = this.config.homepage
    }

    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2))
    console.log('📄 Updated package.json')
  }

  async updateManifest() {
    const manifestPath = path.join(__dirname, 'manifest.json')
    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

    manifestData.name = this.config.name
    manifestData.description = this.config.description
    manifestData.version = this.config.version

    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2))
    console.log('📄 Updated manifest.json')
  }

  async updateConstants() {
    const constantsPath = path.join(__dirname, 'lib', 'utils', 'constants.ts')
    let constantsContent = fs.readFileSync(constantsPath, 'utf8')

    // Update extension config
    constantsContent = constantsContent.replace(
      /NAME: '[^']*'/,
      `NAME: '${this.config.name}'`
    )
    
    constantsContent = constantsContent.replace(
      /VERSION: '[^']*'/,
      `VERSION: '${this.config.version}'`
    )
    
    constantsContent = constantsContent.replace(
      /AUTHOR: '[^']*'/,
      `AUTHOR: '${this.config.author}'`
    )

    // Update API base URL in environment configs
    if (this.config.apiBaseUrl) {
      constantsContent = constantsContent.replace(
        /API_BASE_URL: '[^']*'/g,
        `API_BASE_URL: '${this.config.apiBaseUrl}'`
      )
    }

    // Update feature flags
    const featureFlags = [
      `ENABLE_CACHING: ${this.config.features.caching}`,
      `ENABLE_RATE_LIMITING: ${this.config.features.rateLimiting}`,
      `ENABLE_ANALYTICS: ${this.config.features.analytics}`,
      `ENABLE_DEBUG_MODE: ${this.config.features.debugMode}`
    ]

    const featureFlagsRegex = /export const FEATURE_FLAGS = \{[^}]+\}/s
    const newFeatureFlags = `export const FEATURE_FLAGS = {
  ${featureFlags.join(',\n  ')}
} as const`

    constantsContent = constantsContent.replace(featureFlagsRegex, newFeatureFlags)

    fs.writeFileSync(constantsPath, constantsContent)
    console.log('📄 Updated constants.ts')
  }

  async createEnvFile() {
    const envContent = `# Chrome Extension Environment Variables
NODE_ENV=development
EXTENSION_NAME="${this.config.name}"
API_BASE_URL="${this.config.apiBaseUrl}"
ENABLE_DEBUG=${this.config.features.debugMode}
ENABLE_ANALYTICS=${this.config.features.analytics}

# Add your API keys here (never commit to version control)
# API_KEY=your_api_key_here
# ANALYTICS_ID=your_analytics_id_here
`

    fs.writeFileSync(path.join(__dirname, '.env'), envContent)
    console.log('📄 Created .env file')
  }

  async showCompletionMessage() {
    console.log('\n🎉 Setup Complete!')
    console.log('===================\n')
    
    console.log('📋 Configuration Summary:')
    console.log(`   Name: ${this.config.name}`)
    console.log(`   Version: ${this.config.version}`)
    console.log(`   Author: ${this.config.author}`)
    console.log(`   API URL: ${this.config.apiBaseUrl || 'Not configured'}`)
    
    console.log('\n🔧 Enabled Features:')
    Object.entries(this.config.features).forEach(([feature, enabled]) => {
      console.log(`   ${feature}: ${enabled ? '✅' : '❌'}`)
    })
    
    console.log('\n🚀 Next Steps:')
    console.log('   1. Run "pnpm install" to install dependencies')
    console.log('   2. Run "pnpm build" to build the extension')
    console.log('   3. Load the extension in Chrome:')
    console.log('      • Open chrome://extensions/')
    console.log('      • Enable Developer mode')
    console.log('      • Click "Load unpacked" and select the "dist" folder')
    
    console.log('\n📚 Documentation:')
    console.log('   • README.md - Project overview and usage')
    console.log('   • docs/ - Detailed architecture documentation')
    
    console.log('\n💡 Tips:')
    console.log('   • Modify lib/utils/constants.ts to change configuration')
    console.log('   • Add API keys to .env file (never commit secrets!)')
    console.log('   • Use "pnpm dev" for development with hot reload')
    
    console.log('\n✨ Happy coding!')
  }

  question(prompt, defaultValue = '') {
    return new Promise((resolve) => {
      const fullPrompt = defaultValue 
        ? `${prompt}(${defaultValue}): `
        : `${prompt}: `
      
      this.rl.question(fullPrompt, (answer) => {
        resolve(answer.trim() || defaultValue)
      })
    })
  }

  confirm(prompt, defaultValue = false) {
    return new Promise((resolve) => {
      const defaultText = defaultValue ? 'Y/n' : 'y/N'
      this.rl.question(`${prompt}(${defaultText}): `, (answer) => {
        const normalized = answer.toLowerCase().trim()
        if (normalized === '') {
          resolve(defaultValue)
        } else {
          resolve(normalized === 'y' || normalized === 'yes')
        }
      })
    })
  }
}

// Self-executing setup if called directly
if (require.main === module) {
  const setup = new ExtensionSetup()
  setup.run().catch(console.error)
}

module.exports = ExtensionSetup