# Effect Patterns AI Assistant

An AI-powered code reviewer and interactive learning tool for the Effect-TS ecosystem.

## Current Status

**Phase 4 Complete** - Full-featured AI assistant with code review and enhanced UI.

### What's Working
- ✅ Effect Runtime bridge (singleton pattern for serverless)
- ✅ Chat interface with streaming responses
- ✅ Markdown rendering with syntax highlighting
- ✅ Code diff viewer for refactoring suggestions
- ✅ searchPatterns tool (currently returns mock data)
- ✅ reviewCodeSnippet tool with full McpClient integration
- ✅ Clean separation between Next.js and Effect

### What's Next
- Phase 5: Final testing and deployment preparation

## Getting Started

## 🤖 Agent Overview

- **Chat Assistant Runtime (`app/server/runtime.ts`)**
  Provides the shared Effect runtime used by the assistant and any
  connected agents to execute pattern searches, code reviews, and
  other tools in a serverless-friendly way.
- **Tooling Surface (`app/server/tools.ts`)**
  Defines agent-accessible operations such as `searchPatterns` and
  `reviewCodeSnippet`, orchestrating Effect workflows for the chat UI.
- **MCP Integration (`app/server/services/mcp-client.ts`)**
  Bridges the chat assistant to the Effect Patterns MCP server so
  external agents can perform pattern lookups and analyses with
  streaming responses.

### Prerequisites
- Bun v1.0+ or Node.js v18+
- OpenAI API Key

### Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your OPENAI_API_KEY
   ```

3. **Run the development server:**
   ```bash
   bun run dev
   ```

4. **Open the application:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Testing

Try asking questions like:
- "How do I handle retries with backoff?"
- "Show me error handling patterns"
- "What's the best way to manage concurrency in Effect?"

The assistant will use the searchPatterns tool to find relevant patterns from the library.

## Architecture

### Key Components

**Effect Runtime Bridge** (`app/server/runtime.ts`)
- Singleton Effect Runtime optimized for serverless
- Provides `runEffect` helper for Promise-based interface
- Composes all application layers

**AI Tools** (`app/server/tools.ts`)
- `searchPatterns`: Search the Effect patterns library
- More tools coming in Phase 3

**API Route** (`app/api/chat/route.ts`)
- Thin Next.js layer
- Orchestrates between client and Effect services
- No business logic - all in Effect

**Services** (`app/server/services/`)
- `McpClient`: MCP server integration (stub in Phase 2)

### Data Flow

```
User Input → useChat Hook → /api/chat → streamText → Tools → Effect Services → Response
```

## Development

### Project Structure
```
app/
├── api/chat/route.ts       # Chat API endpoint
├── server/
│   ├── runtime.ts          # Effect Runtime bridge ⚡
│   ├── tools.ts            # AI tool definitions
│   └── services/
│       └── mcp-client.ts   # MCP server client
├── components/ui/          # React components
└── page.tsx                # Main chat page
```

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.9+
- **Core Logic:** Effect-TS
- **AI SDK:** Vercel AI SDK v4
- **LLM:** OpenAI GPT-4o
- **Styling:** Tailwind CSS v4

## Troubleshooting

### "Module not found" errors
```bash
bun install
```

### OpenAI API errors
- Check that `OPENAI_API_KEY` is set in `.env.local`
- Verify the key is valid

### Effect Runtime errors
- The runtime is instantiated once at module load
- If you modify services, restart the dev server

## Contributing

This is part of the Effect-Patterns monorepo. See the main README for contribution guidelines.

## License

MIT
