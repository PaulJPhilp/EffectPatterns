# Effect Patterns Code Assistant

**Status**: Phase 1 - Basic Setup
**Goal**: Test Supermemory integration with chat interface

This is the Vercel [coding-agent-template](https://github.com/vercel-labs/coding-agent-template) integrated into the Effect Patterns Hub project. It provides a professional chat interface with AI-powered coding capabilities.

## Current Phase: Phase 1

**Objective**: Get basic chat interface running for Supermemory testing.

### What's Included

- ✅ Full chat interface with message history
- ✅ Multi-agent support (Claude Code, Cursor, OpenAI, etc.)
- ✅ Real-time streaming responses
- ✅ Task management and tracking
- ✅ Sandbox execution environment
- ✅ Git integration (branch creation, PR management)
- ✅ Effect Patterns toolkit integration (ready to use)
- ✅ Supermemory tools support

### What's NOT Configured Yet

- ⏸️ Effect-specific custom tools (searchPatterns, reviewCode, etc.)
- ⏸️ Chat-only mode (sandbox execution is enabled)
- ⏸️ Pattern-based code review workflows
- ⏸️ Migration analysis tools (TS → Effect, Effect 3 → 4)

## Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

**TL;DR**:
```bash
# 1. Copy environment template
cp .env.local.example .env.local

# 2. Edit .env.local with your credentials
# - Database (PostgreSQL or Neon)
# - Vercel Sandbox credentials
# - GitHub OAuth app
# - API keys (Anthropic, Supermemory)

# 3. Generate encryption keys
openssl rand -base64 32  # For JWE_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY

# 4. Install dependencies (from project root)
cd ../..
pnpm install

# 5. Set up database (from code-assistant directory)
cd app/code-assistant
pnpm db:push

# 6. Run dev server
pnpm dev

# 7. Open http://localhost:3000
```

## Testing Supermemory (Drop 2)

Once the basic setup works:

1. Add `SUPERMEMORY_API_KEY` to `.env.local`
2. Sign in to the app
3. Create a task (any simple coding task)
4. In the chat, test memory commands:
   - "Remember that I prefer Effect.gen over .pipe chains"
   - "Remember my coding style: functional, immutable, Effect-first"
   - "What do you remember about my preferences?"
5. If memory works, Drop 2 is validated ✅

## Architecture

```
app/code-assistant/
├── app/                    # Next.js routes
│   ├── api/               # API endpoints
│   ├── tasks/[taskId]/   # Task detail pages with chat
│   └── repos/            # Repository management
├── components/            # React components
│   ├── task-chat.tsx     # Main chat interface
│   ├── task-details.tsx  # Code viewer, file browser
│   └── ...
├── lib/                   # Utilities and helpers
│   ├── db/               # Database (Drizzle ORM)
│   ├── auth/             # OAuth (GitHub/Vercel)
│   └── ...
└── package.json
```

## Technology Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5.8
- **Styling**: Tailwind CSS with shadcn/ui and Radix primitives
- **Effects & Memory**: Effect-TS 3.18, Supermemory task recall
- **Data Layer**: Drizzle ORM over PostgreSQL (Vercel or self-hosted)
- **AI Runtime**: Vercel AI SDK 5 with Claude, Cursor, OpenAI adapters
- **Authentication**: GitHub and Vercel OAuth via NextAuth
- **Tooling**: pnpm workspace, Turborepo tasks, Bun-compatible scripts

## Key Features

### Chat Interfaces

The code assistant ships with two chat surfaces tailored to different workflows:

1. **Task Chat (tasks/[taskId])**
   - Conversational AI tied to a specific coding task
   - Full execution pipeline: sandbox spins up, agent runs, commits pushed
   - Real-time streaming responses with tool-call visualization
   - Message management (copy, retry, stop task, shimmer status)
   - PR / checks / deployment tabs alongside the conversation
   - Built for production AI pair-programming and task automation

2. **Chat Playground (`/chat`)**
   - Lightweight conversational interface for quick Q&A
   - No sandbox orchestration; great for Effect patterns or general guidance
   - Shares the same model roster and Supermemory context
   - Ideal for exploratory chats while keeping task board focused on execution

### Task Management
- Create tasks with repo URL + description
- Configure duration and keep-alive settings
- Select AI agent (Claude Code recommended for Effect)
- Track progress with real-time logs

### Code Review
- File browser for changed files
- Diff viewer with syntax highlighting
- Sandbox preview (live running app)
- PR integration (create, merge, comment)

### Multi-User Support
- GitHub or Vercel OAuth
- Per-user API keys
- Per-user task history
- Encrypted credential storage

## Next Steps (Phase 2+)

After Supermemory validation:

1. **Add Effect Tools** - Integrate pattern search and code review
2. **Chat-Only Mode** - Disable auto-commits for advisory mode
3. **Pattern Integration** - Load 150+ patterns into agent context
4. **Review Workflows**:
   - TypeScript → Effect migration assessment
   - Effect code → Pattern adherence checks
   - Effect 3 → Effect 4 migration detection
5. **Advanced Features** - AST analysis, automated refactoring

## Resources

- **Setup Guide**: [SETUP.md](./SETUP.md)
- **Original Template**: https://github.com/vercel-labs/coding-agent-template
- **Vercel Sandbox Docs**: https://vercel.com/docs/vercel-sandbox
- **AI SDK Docs**: https://ai-sdk.dev
- **Effect Patterns Toolkit**: `../../packages/toolkit`

## Troubleshooting

Common issues and solutions in [SETUP.md](./SETUP.md#troubleshooting).

## License

MIT (inherited from parent project)
