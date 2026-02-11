#!/bin/bash

# Effect Patterns MCP Server - Local Setup Script
# This script helps you configure and run the MCP server locally

echo "🚀 Effect Patterns MCP Server - Local Setup"
echo "=========================================="

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL is not running. Please start PostgreSQL first:"
    echo "   - On macOS: brew services start postgresql"
    echo "   - On Ubuntu: sudo systemctl start postgresql"
    echo "   - With Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15"
    echo ""
    echo "   Then create the database:"
    echo "   createdb effect_patterns"
    echo ""
    read -p "Press Enter to continue anyway (some features may not work)..."
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
    echo ""
    echo "Required settings:"
    echo "  - PATTERN_API_KEY: Set your API key for authentication"
    echo "  - DATABASE_URL: PostgreSQL connection string"
    echo ""
    read -p "Press Enter to continue..."
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install
fi

# Build workspace packages
echo "🔨 Building workspace packages..."
echo "Building @effect-patterns/toolkit..."
cd ../..
bun run --filter @effect-patterns/toolkit build
cd packages/mcp-server

echo "Building @effect-patterns/analysis-core..."
cd ../..
bun run --filter @effect-patterns/analysis-core build
cd packages/mcp-server

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the server:"
echo "  bun run dev          # Start development server (http://localhost:3000)"
echo "  bun run build        # Build for production"
echo "  bun run start        # Start production server"
echo ""
echo "Environment variables:"
echo "  PORT=3000           # Server port (default: 3000)"
echo "  NODE_ENV=development # Environment (default: development)"
