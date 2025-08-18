#!/bin/bash

# Sharp Fix Script - Quick Bash Version
# Fixes the recurring Sharp module installation issue on macOS ARM64
# Usage: ./scripts/fix-sharp.sh or chmod +x scripts/fix-sharp.sh && ./scripts/fix-sharp.sh

echo "🔧 Sharp Fix Script - Fixing recurring Sharp installation issues..."
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Step 1: Remove problematic Sharp installations
echo "📋 Step 1: Cleaning up Sharp installations"
rm -rf node_modules/sharp
rm -rf node_modules/plasmo/node_modules/sharp
echo "✅ Cleaned up existing Sharp installations"
echo

# Step 2: Force reinstall Sharp with proper bindings
echo "📋 Step 2: Force installing Sharp with native bindings"
npm install --ignore-scripts=false --foreground-scripts --force sharp

if [ $? -eq 0 ]; then
    echo "✅ Sharp installed successfully"
    echo
else
    echo "❌ Failed to install Sharp"
    echo "💡 Try these additional steps:"
    echo "   1. npm cache clean --force"
    echo "   2. rm -rf node_modules && pnpm install"
    echo "   3. Check Node.js version compatibility"
    exit 1
fi

# Step 3: Test the build
echo "📋 Step 3: Testing build process"
pnpm build

if [ $? -eq 0 ]; then
    echo
    echo "🎉 Sharp fix completed successfully!"
    echo "✅ Build is now working properly"
else
    echo
    echo "❌ Build still failing. Additional troubleshooting may be needed."
    exit 1
fi