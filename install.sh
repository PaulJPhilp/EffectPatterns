#!/bin/bash

# Installation script for Effect Patterns
# Works around the @effect/rpc import issue

echo "🔧 Installing Effect Patterns..."

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build all packages
echo "🏗️  Building packages..."
bun run build

# Test the CLI
echo "🧪 Testing CLI..."
if node packages/ep-cli/dist/index.js --help > /dev/null 2>&1; then
    echo "✅ CLI installation successful!"
    echo ""
    echo "🚀 You can now use:"
    echo "   bun run ep --help"
    echo "   bun run ep list"
    echo "   bun run ep search <pattern>"
else
    echo "❌ CLI test failed"
    echo ""
    echo "📝 Known Issue:"
    echo "   There's a temporary issue with @effect/rpc imports"
    echo "   See INSTALLATION_FIX.md for details"
    echo ""
    echo "🔄 Workaround:"
    echo "   Use 'node packages/ep-cli/dist/index.js' instead of 'bun run ep'"
fi

echo ""
echo "📚 For more information:"
echo "   - Read INSTALLATION_FIX.md for known issues"
echo "   - Check README.md for usage instructions"
echo "   - Visit GitHub issues for troubleshooting"
