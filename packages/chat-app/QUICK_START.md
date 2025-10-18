# Quick Start Guide

## Run the Chat App

```bash
# From repository root
bun run chat:dev
```

App opens at: **http://localhost:5173**

## Test with MCP Server

### Terminal 1: MCP Server
```bash
cd /Users/paul/Projects/Effect-Patterns
bun run mcp:dev
```

Server starts at: **http://localhost:3000**

### Terminal 2: Chat App
```bash
cd /Users/paul/Projects/Effect-Patterns
bun run chat:dev
```

## Environment Setup

Create `.env` file (or copy from `.env.example`):

```env
VITE_MCP_BASE_URL=http://localhost:3000
VITE_PATTERN_API_KEY=test-api-key
```

## Available Commands

```bash
# Development
bun run chat:dev        # Start dev server

# Building
bun run chat:build      # Build for production
bun run chat:preview    # Preview production build

# Type Checking
bun run typecheck       # Check TypeScript types
```

## Quick Test

1. **Start the app**: `bun run chat:dev`
2. **Enter a search**: Type "error handling"
3. **Click Search** or press Enter
4. **See results**: Pattern cards should appear

## Troubleshooting

### "Cannot connect to MCP Server"
- Make sure MCP server is running: `bun run mcp:dev`
- Check `.env` has correct `VITE_MCP_BASE_URL`
- Verify API key in `.env` matches server

### "No patterns found"
- Check MCP server is running
- Check API endpoint: `curl http://localhost:3000/api/patterns/search?q=test`
- Verify authentication works

### TypeScript errors
- Run: `bun run typecheck`
- Check toolkit is built: `ls packages/toolkit/dist/`
- Reinstall if needed: `bun install`

## Project Structure

```
src/
├── components/
│   ├── ChatInterface.tsx    # Main chat UI
│   ├── SearchBar.tsx         # Search input
│   └── PatternCard.tsx       # Pattern display
├── services/
│   └── McpClient.ts          # MCP Server API client
└── hooks/
    └── useEffectState.ts     # Effect + React hooks
```

## Key Files

- `src/App.tsx` - Entry point
- `src/services/McpClient.ts` - MCP Server integration
- `src/hooks/useEffectState.ts` - Effect React hooks
- `vite.config.ts` - Vite configuration
- `.env` - Environment variables

## Next Steps

- Try different search queries
- Test pattern selection
- Check the network tab for API calls
- Explore the code structure

## Documentation

- [Full README](./README.md)
- [Setup Guide](./SETUP_COMPLETE.md)
- [Implementation Details](./IMPLEMENTATION_COMPLETE.md)
- [Main Project README](../../README.md)

---

**Happy testing!** 🚀
