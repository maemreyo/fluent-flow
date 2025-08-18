#!/usr/bin/env node

/**
 * Chrome Extension Starter - Development Workflow Automation
 * 
 * Automates common development tasks like testing, building,
 * code quality checks, and extension reload.
 */

const fs = require('fs')
const path = require('path')
const { execSync, spawn } = require('child_process')
const readline = require('readline')

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

// Development tasks
const tasks = {
  async validate() {
    log('\n🔍 RUNNING CODE VALIDATION...', 'bright')
    
    const checks = [
      { name: 'TypeScript Check', command: 'pnpm run typecheck', required: true },
      { name: 'ESLint', command: 'pnpm run lint', required: true },
      { name: 'Prettier Format Check', command: 'pnpm run format --check', required: false },
      { name: 'Unit Tests', command: 'pnpm run test', required: false }
    ]

    let passed = 0
    let failed = 0

    for (const check of checks) {
      try {
        log(`Running ${check.name}...`, 'cyan')
        execSync(check.command, { stdio: 'pipe' })
        log(`✅ ${check.name} passed`, 'green')
        passed++
      } catch (error) {
        log(`❌ ${check.name} failed`, 'red')
        if (check.required) {
          log(`Error: ${error.message}`, 'red')
          failed++
        } else {
          log(`Warning: ${check.name} failed but not required`, 'yellow')
        }
      }
    }

    log(`\n📊 Validation Results: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green')
    return failed === 0
  },

  async build() {
    log('\n🏗️  BUILDING EXTENSION...', 'bright')
    
    try {
      // Clean previous build
      if (fs.existsSync('build')) {
        execSync('rm -rf build')
        log('🧹 Cleaned previous build', 'blue')
      }

      // Build extension
      execSync('pnpm run build', { stdio: 'inherit' })
      log('✅ Build completed successfully', 'green')

      // Validate build output
      const requiredFiles = [
        'build/manifest.json',
        'build/background.js',
        'build/popup.html'
      ]

      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          throw new Error(`Required file missing: ${file}`)
        }
      }

      log('✅ Build validation passed', 'green')
      
      // Show build info
      const stats = this.getBuildStats()
      log(`📦 Build size: ${stats.totalSize}KB`, 'blue')
      log(`📄 Files: ${stats.fileCount}`, 'blue')
      
      return true
    } catch (error) {
      log(`❌ Build failed: ${error.message}`, 'red')
      return false
    }
  },

  getBuildStats() {
    const buildDir = 'build'
    let totalSize = 0
    let fileCount = 0

    const getSize = (dir) => {
      const files = fs.readdirSync(dir)
      
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          getSize(filePath)
        } else {
          totalSize += stat.size
          fileCount++
        }
      }
    }

    if (fs.existsSync(buildDir)) {
      getSize(buildDir)
    }

    return {
      totalSize: Math.round(totalSize / 1024),
      fileCount
    }
  },

  async watch() {
    log('\n👀 STARTING DEVELOPMENT WATCH...', 'bright')
    
    try {
      // Start Plasmo dev server
      const devProcess = spawn('pnpm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true
      })

      log('🚀 Development server started', 'green')
      log('📝 Watching for file changes...', 'blue')
      log('🔄 Extension will auto-reload on changes', 'blue')
      log('Press Ctrl+C to stop', 'yellow')

      // Handle process termination
      process.on('SIGINT', () => {
        log('\n🛑 Stopping development server...', 'yellow')
        devProcess.kill('SIGINT')
        process.exit(0)
      })

      return devProcess
    } catch (error) {
      log(`❌ Failed to start development server: ${error.message}`, 'red')
      return null
    }
  },

  async test() {
    log('\n🧪 RUNNING TESTS...', 'bright')
    
    const testCommands = [
      { name: 'Unit Tests', command: 'pnpm run test', required: true },
      { name: 'Coverage Report', command: 'pnpm run test:coverage', required: false },
      { name: 'E2E Tests', command: 'pnpm run test:e2e', required: false }
    ]

    for (const test of testCommands) {
      try {
        log(`Running ${test.name}...`, 'cyan')
        execSync(test.command, { stdio: 'inherit' })
        log(`✅ ${test.name} completed`, 'green')
      } catch (error) {
        if (test.required) {
          log(`❌ ${test.name} failed`, 'red')
          return false
        } else {
          log(`⚠️  ${test.name} failed (optional)`, 'yellow')
        }
      }
    }

    return true
  },

  async reload() {
    log('\n🔄 RELOADING EXTENSION...', 'bright')
    
    try {
      // This would work with chrome extension API if available
      log('📋 Manual reload required:', 'yellow')
      log('1. Open chrome://extensions/', 'blue')
      log('2. Find your extension', 'blue')
      log('3. Click the reload button', 'blue')
      log('Or use the Chrome Extension Reload extension for automatic reload', 'cyan')
      
      return true
    } catch (error) {
      log(`❌ Reload failed: ${error.message}`, 'red')
      return false
    }
  },

  async package() {
    log('\n📦 PACKAGING EXTENSION...', 'bright')
    
    try {
      // Build first
      const buildSuccess = await this.build()
      if (!buildSuccess) {
        throw new Error('Build failed')
      }

      // Create package
      execSync('pnpm run package', { stdio: 'inherit' })
      
      // Find the generated zip file
      const files = fs.readdirSync('.').filter(f => f.endsWith('.zip'))
      if (files.length > 0) {
        const zipFile = files[0]
        const stats = fs.statSync(zipFile)
        log(`✅ Package created: ${zipFile} (${Math.round(stats.size / 1024)}KB)`, 'green')
      } else {
        log('✅ Package created successfully', 'green')
      }

      return true
    } catch (error) {
      log(`❌ Packaging failed: ${error.message}`, 'red')
      return false
    }
  },

  async analyze() {
    log('\n📊 ANALYZING CODEBASE...', 'bright')
    
    try {
      const analysis = {
        files: this.countFiles(),
        dependencies: this.analyzeDependencies(),
        codeQuality: await this.analyzeCodeQuality()
      }

      log(`📄 Total files: ${analysis.files.total}`, 'blue')
      log(`  - TypeScript: ${analysis.files.typescript}`, 'cyan')
      log(`  - JavaScript: ${analysis.files.javascript}`, 'cyan')
      log(`  - React components: ${analysis.files.react}`, 'cyan')
      log(`  - Test files: ${analysis.files.tests}`, 'cyan')

      log(`📦 Dependencies: ${analysis.dependencies.total}`, 'blue')
      log(`  - Production: ${analysis.dependencies.production}`, 'cyan')
      log(`  - Development: ${analysis.dependencies.development}`, 'cyan')

      if (analysis.codeQuality) {
        log(`📈 Code Quality: ${analysis.codeQuality.score}/100`, 'blue')
      }

      return analysis
    } catch (error) {
      log(`❌ Analysis failed: ${error.message}`, 'red')
      return null
    }
  },

  countFiles() {
    const extensions = {
      typescript: ['.ts', '.tsx'],
      javascript: ['.js', '.jsx'],
      react: ['.tsx', '.jsx'],
      tests: ['.test.ts', '.test.tsx', '.test.js', '.spec.ts']
    }

    const counts = {
      total: 0,
      typescript: 0,
      javascript: 0,
      react: 0,
      tests: 0
    }

    const countInDir = (dir) => {
      if (!fs.existsSync(dir)) return
      
      const files = fs.readdirSync(dir)
      
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          countInDir(filePath)
        } else if (stat.isFile()) {
          counts.total++
          
          for (const [type, exts] of Object.entries(extensions)) {
            if (exts.some(ext => file.endsWith(ext))) {
              counts[type]++
            }
          }
        }
      }
    }

    countInDir('.')
    return counts
  },

  analyzeDependencies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      const deps = packageJson.dependencies || {}
      const devDeps = packageJson.devDependencies || {}
      
      return {
        total: Object.keys(deps).length + Object.keys(devDeps).length,
        production: Object.keys(deps).length,
        development: Object.keys(devDeps).length
      }
    } catch (error) {
      return { total: 0, production: 0, development: 0 }
    }
  },

  async analyzeCodeQuality() {
    try {
      // This is a simplified code quality check
      const checks = [
        { command: 'pnpm run typecheck', weight: 30 },
        { command: 'pnpm run lint', weight: 30 },
        { command: 'pnpm run test', weight: 40 }
      ]

      let score = 0
      for (const check of checks) {
        try {
          execSync(check.command, { stdio: 'pipe' })
          score += check.weight
        } catch {
          // Check failed
        }
      }

      return { score }
    } catch {
      return null
    }
  },

  async clean() {
    log('\n🧹 CLEANING PROJECT...', 'bright')
    
    const dirsToClean = ['build', 'dist', '.plasmo', 'node_modules/.cache']
    const filesToClean = ['*.zip', '*.crx']

    try {
      for (const dir of dirsToClean) {
        if (fs.existsSync(dir)) {
          execSync(`rm -rf ${dir}`)
          log(`✅ Cleaned ${dir}`, 'green')
        }
      }

      for (const pattern of filesToClean) {
        try {
          execSync(`rm -f ${pattern}`)
          log(`✅ Cleaned ${pattern}`, 'green')
        } catch {
          // File pattern not found, ignore
        }
      }

      log('✅ Project cleaned successfully', 'green')
      return true
    } catch (error) {
      log(`❌ Clean failed: ${error.message}`, 'red')
      return false
    }
  }
}

// Interactive menu
const showMenu = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const prompt = (question) => {
    return new Promise((resolve) => {
      rl.question(`${colors.cyan}${question}${colors.reset} `, resolve)
    })
  }

  while (true) {
    log('\n🔧 DEVELOPMENT WORKFLOW MENU', 'bright')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')
    log('1. 🔍 Validate Code (TypeScript, ESLint, Tests)', 'cyan')
    log('2. 🏗️  Build Extension', 'cyan')
    log('3. 👀 Start Development Watch', 'cyan')
    log('4. 🧪 Run Tests', 'cyan')
    log('5. 🔄 Reload Extension', 'cyan')
    log('6. 📦 Package Extension', 'cyan')
    log('7. 📊 Analyze Codebase', 'cyan')
    log('8. 🧹 Clean Project', 'cyan')
    log('9. 🚀 Full CI Pipeline (validate + build + test)', 'cyan')
    log('0. ❌ Exit', 'cyan')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')

    const choice = await prompt('Choose an option (0-9):')

    switch (choice.trim()) {
      case '1':
        await tasks.validate()
        break
      case '2':
        await tasks.build()
        break
      case '3':
        const watcher = await tasks.watch()
        if (watcher) {
          return // Exit menu to let watch run
        }
        break
      case '4':
        await tasks.test()
        break
      case '5':
        await tasks.reload()
        break
      case '6':
        await tasks.package()
        break
      case '7':
        await tasks.analyze()
        break
      case '8':
        await tasks.clean()
        break
      case '9':
        log('\n🚀 RUNNING FULL CI PIPELINE...', 'bright')
        const validate = await tasks.validate()
        if (validate) {
          const build = await tasks.build()
          if (build) {
            await tasks.test()
          }
        }
        break
      case '0':
        log('👋 Goodbye!', 'green')
        rl.close()
        return
      default:
        log('❌ Invalid choice. Please try again.', 'red')
    }

    await prompt('\nPress Enter to continue...')
  }
}

// Command line interface
const runCLI = async () => {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    return showMenu()
  }

  const command = args[0]
  
  switch (command) {
    case 'validate':
      return tasks.validate()
    case 'build':
      return tasks.build()
    case 'watch':
      return tasks.watch()
    case 'test':
      return tasks.test()
    case 'reload':
      return tasks.reload()
    case 'package':
      return tasks.package()
    case 'analyze':
      return tasks.analyze()
    case 'clean':
      return tasks.clean()
    case 'ci':
      const validate = await tasks.validate()
      if (validate) {
        const build = await tasks.build()
        if (build) {
          return tasks.test()
        }
      }
      return false
    default:
      log(`❌ Unknown command: ${command}`, 'red')
      log('Available commands: validate, build, watch, test, reload, package, analyze, clean, ci', 'yellow')
      return false
  }
}

// Main execution
if (require.main === module) {
  runCLI()
    .then((result) => {
      if (result === false) {
        process.exit(1)
      }
    })
    .catch((error) => {
      log(`❌ Error: ${error.message}`, 'red')
      process.exit(1)
    })
}

module.exports = { tasks, runCLI, showMenu }