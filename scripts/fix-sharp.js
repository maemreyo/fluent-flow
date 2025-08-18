#!/usr/bin/env node

/**
 * Automatic Sharp Fix Script
 * 
 * This script fixes the recurring Sharp module installation issue on macOS ARM64.
 * The issue occurs when Sharp's native binaries aren't properly built for the current architecture.
 * 
 * Usage: node scripts/fix-sharp.js
 * Or add to package.json scripts: "fix-sharp": "node scripts/fix-sharp.js"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Sharp Fix Script - Fixing recurring Sharp installation issues...\n');

function runCommand(command, description) {
  console.log(`📋 ${description}`);
  try {
    const output = execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd() 
    });
    console.log(`✅ Success: ${description}\n`);
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${description}`);
    console.log(`Error: ${error.message}\n`);
    return false;
  }
}

function fixSharpIssue() {
  console.log('🚀 Starting Sharp fix process...\n');

  // Step 1: Remove problematic Sharp installations
  console.log('Step 1: Cleaning up Sharp installations');
  const sharpPaths = [
    'node_modules/sharp',
    'node_modules/plasmo/node_modules/sharp'
  ];

  sharpPaths.forEach(sharpPath => {
    if (fs.existsSync(sharpPath)) {
      try {
        runCommand(`rm -rf ${sharpPath}`, `Removing ${sharpPath}`);
      } catch (error) {
        console.log(`⚠️  Could not remove ${sharpPath}: ${error.message}`);
      }
    }
  });

  // Step 2: Force reinstall Sharp with proper bindings
  console.log('Step 2: Reinstalling Sharp with proper native bindings');
  const success = runCommand(
    'npm install --ignore-scripts=false --foreground-scripts --force sharp',
    'Force installing Sharp with native bindings'
  );

  if (!success) {
    console.log('❌ Failed to fix Sharp. You may need to:');
    console.log('1. Clear npm cache: npm cache clean --force');
    console.log('2. Remove node_modules and reinstall: rm -rf node_modules && pnpm install');
    console.log('3. Check Node.js version compatibility');
    process.exit(1);
  }

  // Step 3: Verify the fix
  console.log('Step 3: Verifying the fix');
  const buildSuccess = runCommand('pnpm build', 'Testing build process');

  if (buildSuccess) {
    console.log('🎉 Sharp fix completed successfully!');
    console.log('✅ Build is now working properly');
  } else {
    console.log('❌ Build still failing. Additional troubleshooting may be needed.');
    process.exit(1);
  }
}

// Run the fix
fixSharpIssue();