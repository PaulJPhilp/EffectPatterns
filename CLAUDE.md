# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Effect Patterns Hub - Claude Code Context

**Version:** 0.4.1
**Last Updated:** 2025-10-30

This document provides comprehensive context for Claude Code when working on the Effect Patterns Hub project.

## Quick Start

For first-time setup or getting started:

```bash
bun install                    # Install dependencies
bun test                       # Verify setup
bun run ep search "effect"     # Test CLI
```

See "Common Commands" below for your specific task, or jump to the relevant section:
- **Adding a pattern?** → "Pattern Development Cycle"
- **Working on the CLI?** → "Working with the CLI"
- **Running the Code Assistant?** → "Code Assistant (NEW - Phase 1 Complete)"
- **Debugging the API?** → "Working with the MCP Server"

## Project Overview

Effect Patterns Hub is a community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS. The project includes:

1. **Pattern Library** - 150+ curated patterns with TypeScript examples
2. **CLI Tool (`ep`)** - Search, discover, and install patterns
3. **Effect Patterns Toolkit** - Type-safe library for pattern operations
4. **MCP Server** - REST API for programmatic access
5. **Code Assistant** - AI-powered coding agent with Supermemory integration (NEW!)
6. **Chat Assistant** - Legacy chat interface for patterns
7. **AI Coding Rules** - Machine-readable rules for 10+ AI tools
8. **Data Analysis Engine** - Discord export service and LangGraph-powered thematic analysis for data-driven pattern discovery

## Architecture

### Monorepo Structure

```
Effect-Patterns/
├── app/                    # AI Assistant Applications
│   ├── code-assistant/    # Vercel coding-agent with Supermemory (Phase 1) ✨ NEW
│   │   ├── app/           # Next.js 16 routes
│   │   │   ├── api/       # API endpoints
│   │   │   ├── chat/      # Chat mode (Supermemory + Effect Patterns)
│   │   │   └── tasks/     # Task mode (coding agent with sandbox)
│   │   ├── lib/           # Database, auth, sandbox utilities
│   │   ├── components/    # React components
│   │   └── .env.local     # Environment configuration
│   │
│   └── chat-assistant/    # Legacy chat interface
│       ├── app/           # Next.js 15 app directory
│       └── package.json   # App dependencies
│
├── packages/
│   ├── toolkit/           # Effect Patterns Toolkit
│   │   ├── src/
│   │   │   ├── patterns/  # Pattern data access layer
│   │   │   ├── search/    # Search and filtering
│   │   │   ├── generate/  # Code generation
│   │   │   ├── schemas/   # Effect schemas and validators
│   │   │   └── index.ts   # Public API
│   │   └── dist/          # Built toolkit (ESM + CJS)
│   │
│   └── effect-discord/    # Discord integration service
│       ├── src/
│       │   ├── index.ts   # Service definitions and API
│       │   └── layer.ts   # Live implementation
│       ├── test/
│       │   └── integration.test.ts  # Integration tests
│       ├── INTEGRATION_TESTS.md     # Test setup guide
│       └── dist/          # Built package
│
├── services/
│   └── mcp-server/        # MCP server implementation
│       ├── src/
│       │   ├── auth/      # API key authentication
│       │   ├── tracing/   # OpenTelemetry integration
│       │   ├── handlers/  # Request handlers
│       │   └── server/    # Server initialization
│       └── tests/         # Integration tests
│
├── content/
│   ├── published/         # Published patterns (150+ MDX files)
│   ├── new/               # Patterns being developed
│   │   ├── src/          # TypeScript examples
│   │   └── *.mdx         # Pattern documentation
│   ├── src/               # All TypeScript examples
│   └── raw/               # Raw pattern data
│
├── scripts/
│   ├── ep.ts              # CLI entry point
│   ├── ingest-discord.ts  # Discord channel data ingestion
│   ├── analyzer.ts        # Entry point for LangGraph analysis agent
│   ├── analyzer/          # LangGraph-powered thematic analysis
│   │   ├── graph.ts       # LangGraph workflow orchestration
│   │   ├── nodes.ts       # Analysis workflow nodes (chunk, analyze, aggregate)
│   │   ├── state.ts       # Workflow state management
│   │   ├── services/      # Effect services (LLM, file operations)
│   │   └── __tests__/     # Live integration tests
│   ├── publish/           # Publishing pipeline
│   │   ├── pipeline.ts    # Main orchestration
│   │   ├── validate.ts    # Pattern validation
│   │   ├── publish.ts     # Pattern publishing
│   │   ├── rules.ts       # AI rules generation
│   │   └── generate-claude-rules.ts  # Claude-specific rules
│   ├── ingest/            # Pattern ingestion
│   │   └── ingest-pipeline-improved.ts
│   └── qa/                # Quality assurance
│
├── rules/                 # AI coding rules
│   └── generated/         # Generated from patterns
│       ├── rules-for-claude.md      # Claude Code rules (377KB)
│       ├── rules-for-cursor.md      # Cursor rules
│       ├── rules-for-windsurf.md    # Windsurf rules
│       └── ...            # Other AI tool rules
│
└── docs/                  # Documentation
    ├── guides/            # User guides
    ├── implementation/    # Technical docs
    ├── claude-plugin/     # Plugin development
    └── release/           # Release management
```

### Key Technologies

- **Effect-TS** (v3.18+) - Functional TypeScript framework
- **Bun** (v1.0+) - Fast JavaScript runtime (recommended)
- **TypeScript** (5.8+) - Type safety
- **Next.js** (15.3+) - React framework for web apps
- **Vercel** - Serverless deployment
- **OpenTelemetry** - Observability and tracing
- **Biome** - Fast linter and formatter
- **Vitest** - Testing framework

### Monorepo Workspace Structure

The project uses Bun workspaces (configured in `package.json`):

- **Root workspace** - Core patterns, CLI, toolkit, MCP server, and scripts
  - `packages/` - Shared libraries (toolkit, effect-discord)
  - `services/mcp-server/` - REST API server
  - `scripts/` - Build and automation scripts
  - `content/` - Pattern data and examples

- **App workspaces** - Separate Next.js projects
  - `app/code-assistant/` - Next.js 16 coding agent with sandbox
  - `app/chat-assistant/` - Next.js 15 conversational interface

Each workspace has its own `package.json` but shares dependencies via Bun's workspace hoisting.

## Development Workflow

### Common Commands

**Root-level commands use Bun:**

```bash
# Pattern Management
bun run ingest              # Ingest new patterns from content/new/
bun run pipeline            # Full publishing pipeline (validate → test → publish → rules)
bun run validate            # Validate pattern structure and frontmatter
bun run publish             # Publish validated patterns to content/published/

# Data Pipeline
bun run ingest:discord      # Export and anonymize Discord channel data
bun run analyze             # Run LangGraph thematic analysis on ingested data

# Testing
bun test                    # Run all tests
bun run test:behavioral     # Behavioral tests
bun run test:integration    # Integration tests with mock OTLP
bun run test:all            # All test suites
bun run test:server         # MCP server tests
bun run test:cli            # CLI tests

# Linting & Type Checking
bun run lint                # Lint with Biome
bun run lint:effect         # Effect-specific linting
bun run typecheck           # TypeScript type checking

# CLI Development
bun run ep                  # Run CLI in development
bun run ep search "query"   # Test search
bun run ep install add --tool cursor --dry-run  # Test install

# Toolkit
bun run toolkit:build       # Build toolkit package
bun run toolkit:test        # Test toolkit

# MCP Server
bun run mcp:dev             # Start in dev mode (watch)
bun run mcp:build           # Build for production
bun run mcp:test            # Run server tests

# Rules Generation
bun run rules               # Generate all AI tool rules
bun run rules:claude        # Generate Claude-specific rules
```

**App commands use Bun (with `bun run`):**

```bash
# Code Assistant (Next.js 16 + React 19)
cd app/code-assistant
bun run dev                 # Start dev server (localhost:3002)
bun run build               # Build for production

# Chat Assistant (Next.js 15)
cd app/chat-assistant
bun run dev                 # Start dev server (localhost:3000)
bun run build               # Build for production
```

> **Note:** Root-level commands use Bun because it provides a monorepo workspace setup. The `app/*` directories also use Bun but are configured as separate Next.js projects with their own package management.

### Pattern Development Cycle

#### 1. Create a New Pattern

```bash
# 1. Create pattern files
mkdir -p content/new/src
touch content/new/src/my-pattern.ts
touch content/new/my-pattern.mdx

# 2. Write the TypeScript example
# Edit content/new/src/my-pattern.ts

# 3. Fill out the MDX template
# Edit content/new/my-pattern.mdx with frontmatter and content

# 4. Run the ingest pipeline
bun run ingest
# This validates and moves files to content/src and content/raw

# 5. Run the full pipeline
bun run pipeline
# This:
# - Validates all patterns
# - Tests TypeScript examples
# - Publishes to content/published
# - Updates README.md
# - Generates AI rules
```

#### 2. Pattern File Structure

**TypeScript Example (`content/new/src/my-pattern.ts`):**
```typescript
import { Effect } from "effect"

// Demonstrate the pattern with clear, runnable code
const example = Effect.gen(function* () {
  // Pattern implementation
})

Effect.runPromise(example)
```

**MDX Documentation (`content/new/my-pattern.mdx`):**
```markdown
---
id: my-pattern
title: Pattern Title
summary: One-sentence description
skillLevel: intermediate
useCase: ["Domain Modeling", "Error Handling"]
tags: [validation, schema, branded-types]
related: [other-pattern-id]
author: YourName
rule:
  description: "Use X to achieve Y in Z context"
---

## Use Case
When to use this pattern...

## Good Example
\`\`\`typescript
// Well-implemented example
\`\`\`

## Anti-Pattern
\`\`\`typescript
// What NOT to do
\`\`\`

## Rationale
Why this pattern works...

## Trade-offs
- Pros: ...
- Cons: ...
```

#### 3. Validation Requirements

Patterns must include:
- ✅ Valid YAML frontmatter
- ✅ Unique `id` (kebab-case)
- ✅ `skillLevel`: `beginner`, `intermediate`, or `advanced`
- ✅ `useCase` array with valid categories
- ✅ At least 3 `tags`
- ✅ Working TypeScript code in `content/src/`
- ✅ Sections: Use Case, Good Example, Anti-Pattern, Rationale
- ✅ Rule description for AI tools

### Working with the CLI

The `ep` CLI is the main interface for pattern discovery and installation.

**CLI Structure:**
```
ep
├── search <query>              # Search patterns
├── list                        # List all patterns
│   └── --skill-level <level>  # Filter by skill level
├── show <pattern-id>           # Show pattern details
└── install
    ├── add                     # Install AI rules
    │   ├── --tool <name>      # Specify AI tool
    │   ├── --skill-level <level>
    │   ├── --use-case <case>
    │   └── --dry-run          # Preview without installing
    └── list-tools              # List supported tools
```

**CLI Implementation:**
- Entry point: `scripts/ep.ts`
- Uses `@effect/cli` for command parsing
- Commands in `scripts/publish/`
- Tests in `scripts/__tests__/`

### Working with the MCP Server

The MCP (Model Context Protocol) server provides a REST API for pattern access.

**API Endpoints:**

```bash
# Search patterns
GET /api/patterns/search?q=retry&skillLevel=intermediate

# Get specific pattern
GET /api/patterns/{pattern-id}

# Explain a pattern with context
POST /api/patterns/explain
{
  "patternId": "handle-errors-with-catch",
  "context": "HTTP API with multiple error types"
}

# Generate code snippet
POST /api/patterns/generate
{
  "patternId": "retry-based-on-specific-errors",
  "customName": "retryHttpRequest",
  "customInput": "fetch('/api/data')"
}

# Health check
GET /api/health
```

**Authentication:**
- API key required: `x-api-key` header or `?key=` query param
- Set via `PATTERN_API_KEY` environment variable
- Separate keys for staging/production

**Deployment:**
- Production: `https://effect-patterns.vercel.app`
- Staging: `https://effect-patterns-staging.vercel.app`

### Working with the Discord Service

The `@effect-patterns/effect-discord` package provides an Effect-native service for Discord operations.

**Purpose**: Export Discord channel data for pattern discovery and curation (e.g., common questions from the Effect-TS Discord community).

**Key Features:**
- Effect.Service pattern with Layer.effect
- Wraps DiscordChatExporter.Cli tool
- Secure token handling with Effect.Secret
- Tagged errors (CommandFailed, FileNotFound, JsonParseError)
- Resource cleanup with Effect.ensuring
- Comprehensive integration tests with real Discord API

**Usage Example:**
```typescript
import { Discord, DiscordLive, DiscordConfig } from "@effect-patterns/effect-discord";
import { Effect, Layer, Secret } from "effect";
import { NodeContext } from "@effect/platform-node";

const ConfigLive = Layer.succeed(DiscordConfig, {
  botToken: Secret.fromString(process.env.DISCORD_BOT_TOKEN!),
  exporterPath: "./tools/DiscordChatExporter.Cli",
});

const program = Effect.gen(function* () {
  const discord = yield* Discord;
  const result = yield* discord.exportChannel("channel-id");
  console.log(`Exported ${result.messages.length} messages`);
  return result;
});

await Effect.runPromise(
  program.pipe(
    Effect.provide(DiscordLive),
    Effect.provide(ConfigLive),
    Effect.provide(NodeContext.layer),
  )
);
```

**Testing:**
```bash
# Run integration tests (requires Discord bot setup)
bun test packages/effect-discord/test/integration.test.ts

# Skip integration tests
SKIP_INTEGRATION_TESTS=true bun test packages/effect-discord/test/integration.test.ts
```

See:
- [packages/effect-discord/README.md](./packages/effect-discord/README.md) - User documentation
- [packages/effect-discord/CLAUDE.md](./packages/effect-discord/CLAUDE.md) - Development guide
- [packages/effect-discord/INTEGRATION_TESTS.md](./packages/effect-discord/INTEGRATION_TESTS.md) - Test setup
- [scripts/ingest-discord.ts](./scripts/ingest-discord.ts) - Production example

### Working with the Data Analysis Engine

The Data Analysis Engine combines Discord data export with AI-powered thematic analysis to identify community patterns and guide content strategy.

**Architecture:**
- **Discord Exporter** (`@effect-patterns/effect-discord`) - Effect-native service for exporting Discord channel data
- **Analysis Agent** (`scripts/analyzer/`) - LangGraph workflow for thematic analysis using Effect services
- **LLM Service** (`scripts/analyzer/services/llm.ts`) - Effect service wrapping Anthropic Claude for analysis
- **File Service** (`scripts/analyzer/services/file.ts`) - Effect service for reading/writing analysis results

**Workflow:**

1. **Data Ingestion** (`bun run ingest:discord`):
   - Exports Discord channel messages using DiscordChatExporter.Cli
   - Anonymizes user data (replaces usernames/IDs with hashes)
   - Saves to `/tmp/discord-exports/` directory
   - Returns structured `ChannelExport` data

2. **Thematic Analysis** (`bun run analyze`):
   - Loads exported Discord data from disk
   - Chunks messages into analyzable segments
   - Sends chunks to Claude via LLM service
   - Aggregates themes across all chunks
   - Generates markdown report with:
     - Top themes and pain points
     - Code examples and patterns
     - Pattern recommendations
     - Community insights

**Usage Example:**

```bash
# Step 1: Export Discord data
export DISCORD_BOT_TOKEN="your-bot-token"
bun run ingest:discord

# Step 2: Run analysis
export ANTHROPIC_API_KEY="your-api-key"
bun run analyze

# Results saved to:
# - /tmp/discord-exports/channel-{id}-{timestamp}.json (raw data)
# - data/analysis/analysis-report-{timestamp}.md (analysis report)
```

**Analysis Agent Structure:**

```typescript
// scripts/analyzer/graph.ts - Main workflow orchestration
const workflow = new StateGraph<AnalysisState>()
  .addNode("chunk", chunkNode)      // Split data into chunks
  .addNode("analyze", analyzeNode)  // Analyze each chunk
  .addNode("aggregate", aggregateNode) // Combine results
  .addEdge(START, "chunk")
  .addEdge("chunk", "analyze")
  .addEdge("analyze", "aggregate")
  .addEdge("aggregate", END)

// Effect services provide dependencies
const program = Effect.gen(function* () {
  const llm = yield* LLMService
  const file = yield* FileService

  // Run LangGraph workflow
  const result = await workflow.invoke({
    messages: exportedData.messages,
    chunks: [],
    analyses: [],
    finalReport: null
  })

  // Save report
  yield* file.writeReport(result.finalReport)
})
```

**Key Features:**

- **Effect-First Architecture**: All I/O operations use Effect services
- **Type-Safe State Management**: LangGraph state is fully typed with TypeScript
- **Streaming Support**: LLM responses can be streamed for real-time feedback
- **Error Handling**: Tagged errors throughout (DiscordError, LLMError, FileError)
- **Testable**: Mock services for unit tests, live tests for integration
- **Observability**: Structured logging and OpenTelemetry integration

**Testing:**

```bash
# Unit tests (mocked services)
bun test scripts/analyzer/__tests__/nodes.test.ts

# Integration tests (real Discord + Claude APIs)
bun test scripts/analyzer/__tests__/graph.test.ts

# Skip integration tests
SKIP_INTEGRATION_TESTS=true bun test scripts/analyzer/
```

**Configuration:**

Environment variables:
- `DISCORD_BOT_TOKEN` - Discord bot authentication
- `ANTHROPIC_API_KEY` - Claude API key for analysis
- `ANALYSIS_OUTPUT_DIR` - Output directory (default: `data/analysis/`)
- `DISCORD_EXPORT_DIR` - Export directory (default: `/tmp/discord-exports/`)

See:
- [scripts/analyzer/README.md](./scripts/analyzer/README.md) - Detailed architecture
- [scripts/analyzer/graph.ts](./scripts/analyzer/graph.ts) - Workflow implementation
- [scripts/analyzer/services/](./scripts/analyzer/services/) - Effect services

### Working with the Toolkit

The toolkit is a pure Effect library for pattern operations.

**Core Modules:**

```typescript
import {
  loadPatternsFromJson,
  searchPatterns,
  getPatternById,
  buildSnippet,
  validateGenerateRequest,
} from "@effect-patterns/toolkit"

// Search patterns
const results = yield* searchPatterns({
  query: "error handling",
  skillLevel: "intermediate",
  useCase: ["Error Management"],
})

// Get pattern details
const pattern = yield* getPatternById("handle-errors-with-catch")

// Generate code snippet
const snippet = yield* buildSnippet({
  patternId: "retry-with-backoff",
  customName: "retryRequest",
  moduleType: "esm",
})
```

**Schemas:**
- Located in `packages/toolkit/src/schemas/`
- Uses `@effect/schema` for runtime validation
- Generates JSON Schema for OpenAPI
- All validation is type-safe with Effect

## Code Style & Conventions

### TypeScript

- **Strict mode enabled** - No implicit any
- **Effect-first** - Use Effect primitives for all async/error handling
- **No Promise in core** - Use `Effect.tryPromise` to convert
- **Prefer `Effect.gen`** over `.pipe` for readability in complex flows
- **Use `.pipe`** for simple, linear transformations
- **NEVER use `Context.Tag`** - Always use `Effect.Service` pattern with class syntax instead

**Good Example:**
```typescript
import { Effect } from "effect"

const fetchUser = (id: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() => fetch(`/users/${id}`))
    const user = yield* Effect.tryPromise(() => response.json())
    return user
  })
```

**Anti-Pattern:**
```typescript
// ❌ Don't use raw Promise
async function fetchUser(id: string) {
  const response = await fetch(`/users/${id}`)
  return response.json()
}
```

### Error Handling

- **Use tagged errors** extending `Data.TaggedError`
- **Explicit error types** in Effect signature: `Effect<A, E, R>`
- **catchTag** for specific error recovery
- **mapError** to transform errors at boundaries

**Example:**
```typescript
import { Data } from "effect"

class NetworkError extends Data.TaggedError("NetworkError")<{
  cause: unknown
}> {}

class ParseError extends Data.TaggedError("ParseError")<{
  message: string
}> {}

const fetchData = (url: string): Effect.Effect<Data, NetworkError | ParseError> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (cause) => new NetworkError({ cause }),
    })

    const data = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => new ParseError({ message: "Invalid JSON" }),
    })

    return data
  })
```

### Testing

- **Use Vitest** for all tests
- **Effect.runPromise** to run Effects in tests
- **Layer-based DI** for mocking dependencies
- **Test files** colocated with source or in `__tests__/`

**Test Structure:**
```typescript
import { Effect, Layer } from "effect"
import { describe, it, expect } from "vitest"

describe("MyService", () => {
  const TestLayer = Layer.succeed(
    MyService,
    MyService.of({
      // Mock implementation
    })
  )

  it("should do something", async () => {
    const result = await Effect.runPromise(
      myFunction().pipe(Effect.provide(TestLayer))
    )

    expect(result).toBe("expected")
  })
})
```

### Naming Conventions

- **Files:** kebab-case (`my-pattern.ts`, `handle-errors.mdx`)
- **Pattern IDs:** kebab-case (`retry-based-on-specific-errors`)
- **Functions:** camelCase (`buildSnippet`, `searchPatterns`)
- **Types/Interfaces:** PascalCase (`PatternSummary`, `GenerateRequest`)
- **Services:** PascalCase (`PatternService`, `AuthService`)
- **Layers:** PascalCase suffix (`PatternServiceLive`, `AuthLayer`)

## Important File Locations

### Configuration

| File | Purpose |
|------|---------|
| `package.json` | Root package, workspaces, scripts |
| `tsconfig.json` | TypeScript configuration |
| `biome.json` | Linter/formatter config |
| `vercel.json` | Vercel deployment settings |
| `.env` | Environment variables (gitignored) |

### Pattern Data

| Location | Contents |
|----------|----------|
| `content/published/*.mdx` | Published patterns (150+) |
| `content/new/*.mdx` | Patterns in development |
| `content/src/*.ts` | TypeScript examples |
| `data/patterns.json` | Generated pattern index |

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/ep.ts` | CLI entry point |
| `scripts/publish/pipeline.ts` | Main pipeline orchestrator |
| `scripts/publish/validate.ts` | Pattern validation |
| `scripts/publish/publish.ts` | Pattern publishing |
| `scripts/publish/rules.ts` | AI rules generation |
| `scripts/ingest/ingest-pipeline-improved.ts` | Pattern ingestion |
| `scripts/ingest-discord.ts` | Discord data export and anonymization |
| `scripts/analyzer.ts` | Analysis agent entry point |
| `scripts/analyzer/graph.ts` | LangGraph workflow orchestration |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Main project README |
| `SETUP.md` | Setup and installation guide |
| `TESTING.md` | Testing documentation |
| `SECURITY.md` | Security policy and best practices |
| `ROADMAP.md` | Future features and plans |
| `CHANGELOG-CLI.md` | CLI version history |
| `docs/guides/CONTRIBUTING.md` | Contribution guidelines |
| `docs/implementation/` | Technical implementation docs |

## Dependencies

### Core Dependencies

- `effect` (3.18+) - Effect-TS framework
- `@effect/schema` - Runtime validation
- `@effect/cli` - CLI framework
- `@effect/platform` - Platform abstractions
- `@effect/platform-node` - Node.js integration
- `@effect/ai` - AI integrations

### Build & Dev Tools

- `bun` - JavaScript runtime
- `typescript` (5.8+) - Type checking
- `@biomejs/biome` - Linting and formatting
- `vitest` - Testing framework
- `tsx` - TypeScript execution

### App Dependencies

- `next` (15.3+) - React framework
- `react` (19.0+) - UI library
- `tailwindcss` - CSS framework
- `zod` - Schema validation (minimal use)

### Observability

- `@opentelemetry/sdk-node` - OpenTelemetry SDK
- `@opentelemetry/exporter-trace-otlp-http` - OTLP exporter
- `@opentelemetry/resources` - Resource management
- `@opentelemetry/semantic-conventions` - Standard conventions

## CI/CD

### GitHub Actions

**Workflows:**
- `.github/workflows/ci.yml` - Main CI pipeline
  - Runs tests
  - Type checking
  - Linting
  - Coverage reports
- `.github/workflows/security-scan.yml` - Security scanning
  - Dependency audits
  - Vulnerability scanning
- `.github/workflows/app-ci.yml` - ChatGPT app CI
  - App-specific tests
  - Build verification

### Deployment

**Vercel:**
- Automatic deployments on push to main
- Preview deployments for PRs
- Environment variables:
  - `PATTERN_API_KEY` - API authentication
  - `OTLP_ENDPOINT` - Telemetry endpoint
  - `OTLP_HEADERS` - Telemetry auth headers

## Security

### Best Practices

1. **Never commit secrets** - Use environment variables
2. **API key rotation** - Quarterly rotation recommended
3. **Input sanitization** - All user input sanitized in toolkit
4. **No code execution** - Templates only, no eval()
5. **HTTPS only** - Enforced by Vercel
6. **Dependencies** - Weekly security scans via Dependabot

### Current Security Posture

✅ **GOOD** - See `SECURITY_AUDIT_REPORT.md` for details

- 0 critical/high vulnerabilities
- API key authentication
- Input sanitization
- OpenTelemetry integration
- No hardcoded secrets

## AI Coding Rules

### Generated Rules

The project generates AI-specific coding rules from patterns:

```bash
# Generate all rules
bun run rules

# Generate Claude-specific rules
bun run rules:claude
```

**Output:**
- `rules/generated/rules-for-claude.md` (377KB, 11,308 lines)
- `rules/generated/rules-for-cursor.md`
- `rules/generated/rules-for-windsurf.md`
- And 7 more AI tool formats

**Rule Structure:**
Each pattern is converted to a rule with:
- Rule description
- Use cases
- Rationale
- Good example
- Anti-pattern
- Organized by skill level

### Claude Code Integration

Claude Code can access these rules for context-aware assistance:
- Pattern recommendations
- Code generation
- Error detection
- Best practice enforcement

## Code Assistant (NEW - Phase 1 Complete)

### Overview

The Code Assistant is a production-ready AI-powered coding platform built on Vercel's coding-agent-template with:

- **Dual-Mode Architecture**:
  - **Chat Mode** (`/chat`) - Conversational AI with Supermemory for user preferences
  - **Task Mode** (`/tasks`) - Full coding agent with sandbox execution and Git integration

- **Tech Stack**:
  - Next.js 16 + React 19
  - Vercel Sandbox for isolated code execution
  - Neon PostgreSQL (via Vercel)
  - GitHub OAuth authentication
  - AI SDK 5 with multiple agent support

- **AI Agents Supported**:
  - Claude Code CLI (recommended for Effect-TS)
  - OpenAI Codex
  - Cursor CLI
  - Google Gemini CLI
  - GitHub Copilot CLI
  - OpenCode

### Running the Code Assistant

```bash
# Development
cd app/code-assistant
bun run dev
# Open: http://localhost:3002 (or available port)

# Chat mode: http://localhost:3002/chat
# Task mode: http://localhost:3002/tasks
```

### Key Features (Phase 1)

**Chat Mode** (✅ Complete):
- Conversational AI powered by Claude
- Supermemory integration for user preferences
- Effect Patterns search (ready to enable)
- No sandbox execution - pure conversational

**Task Mode** (✅ Complete):
- Full coding agent with sandbox execution
- Automatic Git branch creation and commits
- File browser and diff viewer
- PR creation and management
- Real-time logs and progress tracking

### Configuration

See `app/code-assistant/.env.local` for environment variables:

**Required**:
- `POSTGRES_URL` - Neon database connection
- `ANTHROPIC_API_KEY` - For Claude agent
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - OAuth
- `JWE_SECRET` / `ENCRYPTION_KEY` - Security keys

**Optional** (for Task mode):
- `SANDBOX_VERCEL_TEAM_ID` - Vercel sandbox credentials
- `SANDBOX_VERCEL_PROJECT_ID`
- `SANDBOX_VERCEL_TOKEN`

**Optional** (for features):
- `SUPERMEMORY_API_KEY` - Memory features
- `OPENAI_API_KEY`, `GEMINI_API_KEY`, etc. - Other agents

### Documentation

- `app/code-assistant/READY_TO_TEST.md` - Testing guide (Drop 2)
- `app/code-assistant/SETUP_CHECKLIST.md` - Setup instructions
- `app/code-assistant/SUPERMEMORY_SETUP.md` - Supermemory integration
- `app/code-assistant/SUPERMEMORY_INTEGRATION.md` - Architecture details
- `CODE_ASSISTANT_PHASE1.md` (root) - Overview and setup summary

### Phase 2 Roadmap

- Add Effect Patterns toolkit integration to chat
- Create MCP server for Supermemory (unified memory across modes)
- Code review tools with AST analysis
- Migration assessment (TS → Effect, Effect 3 → 4)
- Pattern violation detection
- Automated refactoring suggestions

## Common Tasks

### Add a Pattern

1. Create files in `content/new/`
2. Run `bun run ingest`
3. Fill out the pattern
4. Run `bun run pipeline`
5. Commit and push

### Update the README

After adding patterns:
```bash
bun run pipeline
# README.md is automatically updated with new patterns
```

### Regenerate AI Rules

After pattern changes:
```bash
bun run rules:claude
# Or for all tools:
bun run rules
```

### Run Tests

```bash
# All tests
bun test

# Specific suite
bun run test:server
bun run test:cli
bun run test:integration

# With coverage
bun test --coverage
```

### Debug the MCP Server

```bash
# Start with logs
bun run mcp:dev

# Test endpoint
curl http://localhost:3000/api/patterns/search?q=retry

# With authentication
curl -H "x-api-key: your-key" http://localhost:3000/api/patterns/search?q=retry
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to staging
vercel

# Deploy to production
vercel --prod
```

## Troubleshooting

### Common Issues

**Pattern validation fails:**
- Check frontmatter YAML syntax
- Ensure all required fields present
- Verify `id` is unique and kebab-case
- Check `skillLevel` is valid: beginner, intermediate, or advanced

**TypeScript examples don't run:**
- Ensure imports are correct
- Check Effect version compatibility
- Verify no syntax errors
- Run `bun run typecheck`

**Tests fail:**
- Clear `node_modules` and reinstall: `rm -rf node_modules && bun install`
- Check test file imports
- Verify test data is valid
- Run with verbose: `bun test --reporter=verbose`

**CLI doesn't work:**
- Reinstall globally: `bun install -g .`
- Check `ep` is in PATH
- Try with `bun run ep` instead
- Verify permissions on `scripts/ep.ts`

**MCP server errors:**
- Check `PATTERN_API_KEY` is set
- Verify `data/patterns.json` exists
- Run `bun run toolkit:build` first
- Check server logs

### Getting Help

- **Documentation:** Check `docs/` directory
- **Issues:** Create a GitHub issue
- **Discussions:** Use GitHub Discussions
- **Discord:** Effect-TS Discord server

## Project Goals

### Current Focus (v0.4.0)

- ✅ 150+ curated patterns
- ✅ CLI tool with pattern search and installation
- ✅ MCP server with REST API
- ✅ ChatGPT app for interactive exploration
- ✅ AI coding rules for 10+ tools
- ✅ Data analysis engine with Discord export and LangGraph thematic analysis
- ✅ Comprehensive test coverage (80%+)
- ✅ CI/CD with GitHub Actions
- ✅ Vercel deployment

### Roadmap (Next 3 Months)

- [ ] Package manager support (npm, pnpm)
- [ ] Re-enable Effect-TS linter
- [ ] Interactive rule selection in CLI
- [ ] Rule update notifications
- [ ] Additional AI tool support
- [ ] Pattern templates
- [ ] Web UI for pattern browsing

See `ROADMAP.md` for detailed roadmap.

## Additional Resources

- [Effect-TS Documentation](https://effect.website/)
- [Effect Discord](https://discord.gg/effect-ts)
- [GitHub Repository](https://github.com/PaulJPhilp/Effect-Patterns)
- [Contributing Guide](./docs/guides/CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)

---

**This document is maintained by the Effect Patterns Hub team. Last updated: 2025-10-10**

**For Claude Code:** This context should be loaded when working on any part of the Effect Patterns Hub project to ensure consistency with project structure, conventions, and best practices.
