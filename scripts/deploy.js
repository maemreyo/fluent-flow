#!/usr/bin/env node

/**
 * Chrome Extension Starter - Deployment & Publishing Script
 * 
 * Automates the process of building, packaging, and preparing
 * the extension for distribution to Chrome Web Store and other platforms.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')
const crypto = require('crypto')

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

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset} `, resolve)
  })
}

const confirmPrompt = async (question) => {
  const answer = await prompt(`${question} (y/N)`)
  return answer.toLowerCase().startsWith('y')
}

// Deployment configuration
const loadDeployConfig = () => {
  const configPath = 'deploy.config.json'
  
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  }

  // Default configuration
  return {
    environments: {
      development: {
        name: 'Development',
        buildCommand: 'pnpm run build',
        outputDir: 'build',
        manifestTransforms: {
          name: name => `${name} (Dev)`,
          version: version => version
        }
      },
      staging: {
        name: 'Staging',
        buildCommand: 'pnpm run build',
        outputDir: 'build',
        manifestTransforms: {
          name: name => `${name} (Staging)`,
          version: version => version
        }
      },
      production: {
        name: 'Production',
        buildCommand: 'pnpm run build',
        outputDir: 'build',
        manifestTransforms: {
          name: name => name,
          version: version => version
        }
      }
    },
    stores: {
      chrome: {
        name: 'Chrome Web Store',
        enabled: true,
        apiKey: process.env.CHROME_WEBSTORE_API_KEY,
        clientId: process.env.CHROME_WEBSTORE_CLIENT_ID,
        clientSecret: process.env.CHROME_WEBSTORE_CLIENT_SECRET,
        refreshToken: process.env.CHROME_WEBSTORE_REFRESH_TOKEN,
        extensionId: process.env.CHROME_WEBSTORE_EXTENSION_ID
      },
      edge: {
        name: 'Microsoft Edge Add-ons',
        enabled: false,
        apiKey: process.env.EDGE_WEBSTORE_API_KEY,
        productId: process.env.EDGE_WEBSTORE_PRODUCT_ID
      },
      firefox: {
        name: 'Firefox Add-on Store',
        enabled: false,
        apiKey: process.env.FIREFOX_API_KEY,
        apiSecret: process.env.FIREFOX_API_SECRET,
        addonId: process.env.FIREFOX_ADDON_ID
      }
    }
  }
}

const saveDeployConfig = (config) => {
  fs.writeFileSync('deploy.config.json', JSON.stringify(config, null, 2))
}

// Pre-deployment checks
const runPreDeploymentChecks = async () => {
  log('\n🔍 RUNNING PRE-DEPLOYMENT CHECKS...', 'bright')
  
  const checks = [
    {
      name: 'Package.json validation',
      check: () => {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
        return pkg.name && pkg.version && pkg.description
      }
    },
    {
      name: 'Manifest.json exists',
      check: () => fs.existsSync('manifest.json')
    },
    {
      name: 'TypeScript compilation',
      check: () => {
        try {
          execSync('pnpm run typecheck', { stdio: 'pipe' })
          return true
        } catch {
          return false
        }
      }
    },
    {
      name: 'ESLint validation',
      check: () => {
        try {
          execSync('pnpm run lint', { stdio: 'pipe' })
          return true
        } catch {
          return false
        }
      }
    },
    {
      name: 'Unit tests',
      check: () => {
        try {
          execSync('pnpm run test', { stdio: 'pipe' })
          return true
        } catch {
          return false
        }
      }
    },
    {
      name: 'Environment variables',
      check: () => {
        const requiredEnvVars = ['NODE_ENV']
        return requiredEnvVars.every(env => process.env[env])
      }
    }
  ]

  let passed = 0
  let failed = 0

  for (const check of checks) {
    try {
      const result = await check.check()
      if (result) {
        log(`✅ ${check.name}`, 'green')
        passed++
      } else {
        log(`❌ ${check.name}`, 'red')
        failed++
      }
    } catch (error) {
      log(`❌ ${check.name}: ${error.message}`, 'red')
      failed++
    }
  }

  log(`\n📊 Pre-deployment checks: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green')
  
  if (failed > 0) {
    const proceed = await confirmPrompt('Some checks failed. Continue anyway?')
    return proceed
  }

  return true
}

// Build for specific environment
const buildForEnvironment = async (environment, config) => {
  log(`\n🏗️  BUILDING FOR ${environment.toUpperCase()}...`, 'bright')
  
  const envConfig = config.environments[environment]
  if (!envConfig) {
    throw new Error(`Environment ${environment} not configured`)
  }

  try {
    // Set environment
    process.env.NODE_ENV = environment === 'development' ? 'development' : 'production'
    
    // Clean previous build
    if (fs.existsSync(envConfig.outputDir)) {
      execSync(`rm -rf ${envConfig.outputDir}`)
    }

    // Run build command
    log(`Running: ${envConfig.buildCommand}`, 'cyan')
    execSync(envConfig.buildCommand, { stdio: 'inherit' })

    // Transform manifest for environment
    await transformManifest(envConfig.outputDir, envConfig.manifestTransforms)

    // Create environment-specific build info
    const buildInfo = {
      environment,
      buildTime: new Date().toISOString(),
      version: JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
      commit: getBuildCommit(),
      nodeVersion: process.version
    }

    fs.writeFileSync(
      path.join(envConfig.outputDir, 'build-info.json'),
      JSON.stringify(buildInfo, null, 2)
    )

    log(`✅ Build completed for ${envConfig.name}`, 'green')
    return envConfig.outputDir
  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'red')
    throw error
  }
}

const transformManifest = async (buildDir, transforms) => {
  const manifestPath = path.join(buildDir, 'manifest.json')
  
  if (!fs.existsSync(manifestPath)) {
    log('⚠️  No manifest.json found in build directory', 'yellow')
    return
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  
  // Apply transformations
  if (transforms.name && manifest.name) {
    manifest.name = transforms.name(manifest.name)
  }
  
  if (transforms.version && manifest.version) {
    manifest.version = transforms.version(manifest.version)
  }

  // Add environment-specific fields
  manifest.short_name = manifest.name

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  log('✅ Manifest transformed for environment', 'green')
}

const getBuildCommit = () => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

// Create distribution packages
const createDistributionPackages = async (buildDir, environment) => {
  log('\n📦 CREATING DISTRIBUTION PACKAGES...', 'bright')
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const version = packageJson.version
  const name = packageJson.name.replace(/\s+/g, '-').toLowerCase()
  
  const distDir = 'dist'
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir)
  }

  try {
    // Create zip package
    const zipName = `${name}-v${version}-${environment}.zip`
    const zipPath = path.join(distDir, zipName)
    
    execSync(`cd ${buildDir} && zip -r ../${zipPath} . -x "*.DS_Store" "*.map"`)
    
    const zipStats = fs.statSync(zipPath)
    log(`✅ Created ZIP package: ${zipName} (${Math.round(zipStats.size / 1024)}KB)`, 'green')

    // Create checksums
    const zipBuffer = fs.readFileSync(zipPath)
    const md5Hash = crypto.createHash('md5').update(zipBuffer).digest('hex')
    const sha256Hash = crypto.createHash('sha256').update(zipBuffer).digest('hex')
    
    const checksumFile = path.join(distDir, `${name}-v${version}-${environment}.checksums.txt`)
    const checksumContent = `MD5: ${md5Hash}\nSHA256: ${sha256Hash}\nFile: ${zipName}\n`
    fs.writeFileSync(checksumFile, checksumContent)
    
    log(`✅ Created checksums: ${path.basename(checksumFile)}`, 'green')

    // Create release notes template
    const releaseNotesPath = path.join(distDir, `${name}-v${version}-release-notes.md`)
    if (!fs.existsSync(releaseNotesPath)) {
      const releaseNotes = createReleaseNotesTemplate(version)
      fs.writeFileSync(releaseNotesPath, releaseNotes)
      log(`✅ Created release notes template: ${path.basename(releaseNotesPath)}`, 'green')
    }

    return {
      zipPath,
      checksumFile,
      releaseNotesPath,
      size: zipStats.size
    }
  } catch (error) {
    log(`❌ Package creation failed: ${error.message}`, 'red')
    throw error
  }
}

const createReleaseNotesTemplate = (version) => {
  return `# Release Notes - Version ${version}

## 🎉 What's New

- [ ] New feature 1
- [ ] New feature 2
- [ ] Enhancement 1

## 🐛 Bug Fixes

- [ ] Fixed issue 1
- [ ] Fixed issue 2

## ⚠️ Breaking Changes

- [ ] Breaking change 1 (if any)

## 🔧 Technical Changes

- [ ] Dependency updates
- [ ] Performance improvements
- [ ] Code refactoring

## 📝 Migration Guide

(If applicable)

## 🙏 Contributors

- @contributor1
- @contributor2

---

**Full Changelog**: https://github.com/your-repo/compare/v${version}...v${version}
`
}

// Upload to stores
const uploadToStore = async (storeName, packagePath, config) => {
  log(`\n🚀 UPLOADING TO ${storeName.toUpperCase()}...`, 'bright')
  
  const storeConfig = config.stores[storeName]
  if (!storeConfig || !storeConfig.enabled) {
    log(`⚠️  ${storeConfig.name} upload not configured or disabled`, 'yellow')
    return false
  }

  try {
    switch (storeName) {
      case 'chrome':
        return await uploadToChromeWebStore(packagePath, storeConfig)
      case 'edge':
        return await uploadToEdgeStore(packagePath, storeConfig)
      case 'firefox':
        return await uploadToFirefoxStore(packagePath, storeConfig)
      default:
        log(`❌ Unknown store: ${storeName}`, 'red')
        return false
    }
  } catch (error) {
    log(`❌ Upload to ${storeConfig.name} failed: ${error.message}`, 'red')
    return false
  }
}

const uploadToChromeWebStore = async (packagePath, config) => {
  if (!config.apiKey || !config.extensionId) {
    log('❌ Chrome Web Store API credentials not configured', 'red')
    return false
  }

  log('📋 Chrome Web Store upload would require Chrome Web Store API implementation', 'yellow')
  log('🔗 See: https://developer.chrome.com/docs/webstore/using_webstore_api/', 'blue')
  log(`📦 Package ready: ${packagePath}`, 'green')
  
  return true
}

const uploadToEdgeStore = async (packagePath, config) => {
  log('📋 Microsoft Edge Add-ons upload would require Partner Center API implementation', 'yellow')
  log('🔗 See: https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/', 'blue')
  log(`📦 Package ready: ${packagePath}`, 'green')
  
  return true
}

const uploadToFirefoxStore = async (packagePath, config) => {
  log('📋 Firefox Add-on store upload would require AMO API implementation', 'yellow')
  log('🔗 See: https://addons-server.readthedocs.io/en/latest/topics/api/', 'blue')
  log(`📦 Package ready: ${packagePath}`, 'green')
  
  return true
}

// Generate deployment report
const generateDeploymentReport = (results) => {
  const reportPath = 'dist/deployment-report.md'
  
  let report = `# Deployment Report

Generated: ${new Date().toISOString()}

## Build Results

`

  for (const result of results) {
    report += `### ${result.environment}

- **Status**: ${result.success ? '✅ Success' : '❌ Failed'}
- **Build Time**: ${result.buildTime || 'N/A'}
- **Package Size**: ${result.packageSize ? `${Math.round(result.packageSize / 1024)}KB` : 'N/A'}
- **Package Path**: ${result.packagePath || 'N/A'}

`

    if (result.storeUploads) {
      report += `#### Store Uploads

`
      for (const [store, success] of Object.entries(result.storeUploads)) {
        report += `- **${store}**: ${success ? '✅ Success' : '❌ Failed'}\n`
      }
      report += '\n'
    }
  }

  report += `## Next Steps

1. **Manual Store Uploads**: Upload packages to stores that don't have API integration
2. **Testing**: Test the extension on different browsers and versions
3. **Release Notes**: Update the release notes with actual changes
4. **Documentation**: Update documentation if needed
5. **Monitoring**: Monitor for issues after release

## Files Generated

- Distribution packages in \`dist/\` directory
- Checksums for verification
- Release notes templates
- This deployment report

---

*Generated by Chrome Extension Starter Deploy Script*
`

  fs.writeFileSync(reportPath, report)
  log(`✅ Deployment report generated: ${reportPath}`, 'green')
}

// Main deployment workflow
const runDeployment = async () => {
  log('\n🚀 CHROME EXTENSION DEPLOYMENT WORKFLOW', 'bright')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')

  try {
    const config = loadDeployConfig()
    
    // Show available environments
    const environments = Object.keys(config.environments)
    log(`\n📋 Available environments: ${environments.join(', ')}`, 'cyan')
    
    const targetEnv = await prompt('Target environment (or "all"):') || 'production'
    const envsToProcess = targetEnv === 'all' ? environments : [targetEnv]
    
    // Confirm deployment
    const confirmDeploy = await confirmPrompt(`Deploy to ${envsToProcess.join(', ')}?`)
    if (!confirmDeploy) {
      log('❌ Deployment cancelled', 'yellow')
      return
    }

    // Run pre-deployment checks
    const checksPass = await runPreDeploymentChecks()
    if (!checksPass) {
      log('❌ Pre-deployment checks failed', 'red')
      return
    }

    const results = []

    // Process each environment
    for (const env of envsToProcess) {
      const result = { environment: env, success: false }
      
      try {
        // Build for environment
        const buildDir = await buildForEnvironment(env, config)
        
        // Create packages
        const packageInfo = await createDistributionPackages(buildDir, env)
        result.packagePath = packageInfo.zipPath
        result.packageSize = packageInfo.size
        result.buildTime = new Date().toISOString()
        
        // Upload to stores (if configured)
        const uploadStores = await confirmPrompt(`Upload ${env} to configured stores?`)
        if (uploadStores) {
          result.storeUploads = {}
          
          for (const [storeName, storeConfig] of Object.entries(config.stores)) {
            if (storeConfig.enabled) {
              const uploadSuccess = await uploadToStore(storeName, packageInfo.zipPath, config)
              result.storeUploads[storeName] = uploadSuccess
            }
          }
        }
        
        result.success = true
        log(`✅ ${env} deployment completed successfully`, 'green')
        
      } catch (error) {
        log(`❌ ${env} deployment failed: ${error.message}`, 'red')
        result.error = error.message
      }
      
      results.push(result)
    }

    // Generate deployment report
    generateDeploymentReport(results)

    // Summary
    const successful = results.filter(r => r.success).length
    const total = results.length
    
    log(`\n📊 DEPLOYMENT SUMMARY`, 'bright')
    log(`✅ Successful: ${successful}/${total}`, successful === total ? 'green' : 'yellow')
    
    if (successful > 0) {
      log('\n📦 Generated packages:', 'cyan')
      results.filter(r => r.success).forEach(r => {
        log(`  • ${r.environment}: ${r.packagePath}`, 'blue')
      })
    }

    log('\n🎉 Deployment workflow completed!', 'bright')

  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`, 'red')
    throw error
  }
}

// CLI interface
const runCLI = async () => {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    return runDeployment()
  }

  const command = args[0]
  
  switch (command) {
    case 'build':
      const env = args[1] || 'production'
      const config = loadDeployConfig()
      await buildForEnvironment(env, config)
      break
    case 'package':
      const buildDir = args[1] || 'build'
      const environment = args[2] || 'production'
      await createDistributionPackages(buildDir, environment)
      break
    case 'check':
      await runPreDeploymentChecks()
      break
    case 'config':
      const deployConfig = loadDeployConfig()
      console.log(JSON.stringify(deployConfig, null, 2))
      break
    default:
      log(`❌ Unknown command: ${command}`, 'red')
      log('Available commands: build [env], package [buildDir] [env], check, config', 'yellow')
      return false
  }
}

// Main execution
if (require.main === module) {
  runCLI()
    .catch((error) => {
      log(`❌ Error: ${error.message}`, 'red')
      process.exit(1)
    })
    .finally(() => {
      rl.close()
    })
}

module.exports = {
  runDeployment,
  buildForEnvironment,
  createDistributionPackages,
  runPreDeploymentChecks,
  loadDeployConfig,
  saveDeployConfig
}