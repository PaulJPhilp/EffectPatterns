# Effect Patterns Chat App

A test chat application for demonstrating and testing the Effect Patterns Toolkit and MCP Server.

## Purpose

This chat app serves as:
- **Integration test** for the Effect Patterns Toolkit
- **Demo application** showing how to use the toolkit in a real app
- **MCP Server client** testing the REST API endpoints
- **Example implementation** of Effect-based React architecture

## Features

- Search patterns using the toolkit
- Real-time pattern suggestions
- Chat interface for natural language pattern discovery
- Integration with MCP Server API
- Effect-based state management
- Type-safe throughout with Effect schemas

## Development

```bash
# From repository root
bun run chat:dev

# Or from this directory
bun run dev
```

The app will be available at `http://localhost:5173`

## Architecture

### Services

- **McpClient** - HTTP client for MCP Server
- **PatternService** - Local pattern operations using toolkit
- **ChatService** - Chat state management

### Components

- **ChatInterface** - Main chat UI
- **PatternCard** - Display pattern results
- **SearchBar** - Pattern search input
- **MessageList** - Chat message history

## Environment Variables

Create a `.env` file in this directory:

```env
VITE_MCP_BASE_URL=http://localhost:3000
VITE_PATTERN_API_KEY=your-api-key-here
```

For production:
```env
VITE_MCP_BASE_URL=https://effect-patterns.vercel.app
VITE_PATTERN_API_KEY=your-production-key
```

## Testing with MCP Server

Start both the MCP server and chat app:

```bash
# Terminal 1: Start MCP server
bun run mcp:dev

# Terminal 2: Start chat app
bun run chat:dev
```

## Building

```bash
# Build for production
bun run build

# Preview production build
bun run preview
```

## Technology Stack

- **Vite** - Fast dev server and build tool
- **React 19** - UI framework
- **Effect-TS** - Functional TypeScript framework
- **Toolkit** - Local workspace package
- **TypeScript** - Type safety

## Project Structure

```
chat-app/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # React hooks (useEffect integration)
│   ├── services/       # Effect services
│   ├── styles/         # CSS styles
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
└── package.json        # Package configuration
```

## Contributing

This is a test application. Feel free to experiment and add features to test different aspects of the toolkit and MCP server.

## Related

- [Effect Patterns Toolkit](../toolkit/README.md)
- [MCP Server](../../services/mcp-server/README.md)
- [Main Project README](../../README.md)
