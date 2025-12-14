# Architecture & Monorepo Structure

Complete technical overview of the Effect Patterns Hub architecture.

**Table of Contents:**
- [Monorepo Structure](#monorepo-structure)
- [Key Technologies](#key-technologies)
- [Workspace Organization](#workspace-organization)
- [Package Overview](#package-overview)
- [Content Directories](#content-directories)

---

## Monorepo Structure

```
Effect-Patterns/
├── app/                    # AI Assistant Applications
│   ├── web/               # Web UI for pattern browsing
│   │   ├── app/           # Next.js 16 routes
│   │   └── components/    # React components
│   │
│   ├── patterns-chat-app/ # Supermemory-integrated chat interface
│   │   ├── app/           # Next.js app directory
│   │   ├── lib/           # Utilities and services
│   │   └── components/    # React components
│   │
│   ├── code-assistant/    # Code Assistant app (Phase 1 complete)
│   │   ├── app/           # Next.js 16 app directory
│   │   ├── components/    # UI components
│   │   ├── lib/           # Core logic
│   │   └── SETUP_CHECKLIST.md  # Setup instructions
│   │
│   └── sm-cli/            # Supermemory CLI integration (legacy)
│
├── packages/
│   ├── ep-cli/            # CLI entry point (@effect-patterns/ep-cli)
│   │   ├── src/
│   │   │   └── index.ts   # CLI command definitions
│   │   └── dist/          # Built CLI (ESM)
│   │
│   ├── ep-admin/          # Admin CLI tool (@effect-patterns/ep-admin)
│   │   ├── src/
│   │   │   └── index.ts   # Admin commands
│   │   └── dist/          # Built admin tool
│   │
│   ├── toolkit/           # Effect Patterns Toolkit
│   │   ├── src/
│   │   │   ├── patterns/  # Pattern data access layer
│   │   │   ├── search/    # Search and filtering
│   │   │   ├── generate/  # Code generation
│   │   │   ├── schemas/   # Effect schemas and validators
│   │   │   └── index.ts   # Public API
│   │   └── dist/          # Built toolkit (ESM + CJS)
│   │
│   ├── effect-discord/    # Discord integration service
│   │   ├── src/
│   │   │   ├── index.ts   # Service definitions and API
│   │   │   └── layer.ts   # Live implementation
│   │   ├── test/
│   │   │   └── integration.test.ts
│   │   ├── INTEGRATION_TESTS.md  # Test setup guide
│   │   └── dist/          # Built package
│   │
│   ├── cli/               # Shared CLI utilities
│   ├── design-system/     # UI components library
│   └── shared/            # Shared utilities
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
│   ├── published/         # Final published patterns (150+ MDX files)
│   │
│   └── new/               # Pattern development working directory
│       ├── raw/           # Raw MDX input (before processing)
│       ├── src/           # TypeScript examples (extracted during ingest)
│       ├── processed/     # MDX with component tags (output of ingest)
│       ├── published/     # Pipeline output (before final move)
│       ├── qa/            # QA validation results
│       └── ingest-reports/# Ingest process reports
│
│   ├── src/               # (Legacy location - not actively used)
│   └── raw/               # (Legacy location - not actively used)
│
├── scripts/
│   ├── ep.ts              # CLI entry point (legacy compatibility)
│   ├── ingest-discord.ts  # Discord channel data ingestion
│   ├── analyzer.ts        # Entry point for LangGraph analysis agent
│   │
│   ├── analyzer/          # LangGraph-powered thematic analysis
│   │   ├── graph.ts       # LangGraph workflow orchestration
│   │   ├── nodes.ts       # Analysis workflow nodes (chunk, analyze, aggregate)
│   │   ├── state.ts       # Workflow state management
│   │   ├── services/      # Effect services (LLM, file operations)
│   │   └── __tests__/     # Live integration tests
│   │
│   ├── publish/           # Publishing pipeline (22 scripts)
│   │   ├── pipeline.ts              # Main orchestrator (5-step workflow)
│   │   ├── test-improved.ts         # Enhanced TypeScript testing
│   │   ├── publish.ts               # MDX code embedding
│   │   ├── validate-improved.ts     # Enhanced validation (parallel)
│   │   ├── generate.ts              # README generation
│   │   ├── generate-claude-rules.ts # Claude-specific rules
│   │   ├── rules-improved.ts        # Enhanced rules (6 formats)
│   │   ├── move-to-published.ts     # Finalize pattern publication
│   │   └── ...                      # Other pipeline scripts
│   │
│   ├── ingest/            # Pattern ingestion
│   │   └── ingest-pipeline-improved.ts
│   │
│   └── qa/                # Quality assurance
│
├── rules/                 # AI coding rules (generated)
│   └── generated/
│       ├── rules-for-claude.md      # Claude Code rules (377KB)
│       ├── rules-for-cursor.md      # Cursor rules
│       ├── rules-for-windsurf.md    # Windsurf rules
│       └── ...            # Other AI tool rules
│
└── docs/                  # Documentation
    ├── guides/            # User guides
    ├── implementation/    # Technical docs
    └── release/           # Release management
```

---

## Key Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Effect-TS** | v3.18+ | Functional TypeScript framework |
| **TypeScript** | 5.8+ | Type safety and tooling |
| **Bun** | v1.0+ | Fast JavaScript runtime (recommended) |
| **Node.js** | 18+ | Alternative JavaScript runtime |
| **Next.js** | 15.3+ | React framework for web apps |
| **React** | 19.0+ | UI library for web apps |
| **Vercel** | - | Serverless deployment platform |
| **Neon PostgreSQL** | - | Managed database (Code Assistant) |
| **OpenTelemetry** | - | Observability and tracing |
| **Biome** | - | Fast linter and formatter |
| **Vitest** | - | Testing framework |
| **LangGraph** | - | Agent orchestration (analysis engine) |

---

## Workspace Organization

The project uses **Bun workspaces** (configured in `package.json`):

### Root Workspace
Core patterns, CLI, toolkit, MCP server, and automation scripts:
- `packages/` - Shared libraries (toolkit, effect-discord, cli, design-system)
- `services/mcp-server/` - REST API server
- `scripts/` - Build and automation scripts
- `content/` - Pattern data and TypeScript examples

### App Workspaces
Separate Next.js projects with independent configurations:
- `app/code-assistant/` - Next.js 16 + React 19 coding agent
- `app/chat-assistant/` - Next.js 15 conversational interface
- `app/web/` - Next.js web UI for browsing patterns

**Dependency Management:**
- Each workspace has its own `package.json`
- Bun's workspace hoisting shares common dependencies
- Workspaces can depend on each other

---

## Package Overview

### Core Libraries

**@effect-patterns/toolkit** (`packages/toolkit/`)
- Pure Effect library for pattern operations
- Data access layer for pattern queries
- Search and filtering functionality
- Code generation and schema validation
- **Exports:** `searchPatterns`, `getPatternById`, `buildSnippet`, validation schemas

**@effect-patterns/effect-discord** (`packages/effect-discord/`)
- Effect-native Discord integration service
- Wraps DiscordChatExporter.Cli for data export
- Secure token handling with Effect.Secret
- Tagged errors and resource cleanup
- **Usage:** Pattern discovery from Discord community

**@effect-patterns/ep-cli** (`packages/ep-cli/`)
- Main CLI entry point for end users
- Commands: search, list, show, install
- Built as standalone ESM executable
- **Installation:** Can be used globally or via `bun run`

**@effect-patterns/ep-admin** (`packages/ep-admin/`)
- Admin CLI for pipeline management
- Commands: pipeline-state management, pattern operations
- Dev-only tool for maintainers

**@effect-patterns/cli** (`packages/cli/`)
- Shared CLI utilities and helpers
- Reusable command patterns
- CLI infrastructure

**@effect-patterns/design-system** (`packages/design-system/`)
- React UI component library
- Shared styling and themes
- Used by web apps

**@effect-patterns/shared** (`packages/shared/`)
- Common utilities and types
- Shared constants
- Helper functions

### MCP Server

**services/mcp-server/**
- REST API for programmatic pattern access
- Authentication via API keys
- OpenTelemetry integration for observability
- Endpoints: search, get, explain, generate

### CLI Entry Points

**`scripts/ep.ts`** (Legacy)
- Maintained for backwards compatibility
- Delegates to `@effect-patterns/ep-cli`

**`scripts/analyzer.ts`**
- Entry point for LangGraph analysis agent
- Orchestrates Discord data analysis

---

## Content Directories

### Published Patterns
**`content/published/`** (150+ MDX files)
- Final, approved patterns
- Read by: README generator, rules generator, web UI
- Format: MDX with YAML frontmatter

### Development Pipeline
**`content/new/`** - Working directory during development

- **`raw/`** - Raw MDX input before ingest
- **`src/`** - TypeScript examples extracted during ingest
- **`processed/`** - MDX with `<Example />` component tags
- **`published/`** - Pipeline output (not yet finalized)
- **`qa/`** - QA validation reports
- **`ingest-reports/`** - Ingest process logs

**Flow:**
```
content/new/raw/*.mdx
    ↓ (ingest)
content/new/src/*.ts
content/new/processed/*.mdx
    ↓ (pipeline)
content/new/published/*.mdx
    ↓ (move-to-published)
content/published/*.mdx
```

### Legacy Locations
- `content/src/` - Not actively used
- `content/raw/` - Not actively used

---

## Valid Use Case Categories

Patterns are organized by 13+ use case categories:

**Core Categories:**
- `core-concepts`
- `error-management` (aliases: `error-handling`)
- `concurrency` (aliases: `async`, `callback`)
- `resource-management`
- `dependency-injection` (aliases: `custom-layers`, `advanced-dependency-injection`)
- `testing`
- `observability` (aliases: `logging`, `instrumentation`, `metrics`, `monitoring`)
- `domain-modeling`
- `application-architecture`
- `building-apis` (aliases: `making-http-requests`)
- `network-requests`
- `file-handling`
- `database-connections`

**Additional Categories:**
See pattern frontmatter for comprehensive list of valid use cases.

---

## Important Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Root package, workspaces, npm scripts |
| `tsconfig.json` | TypeScript compiler options |
| `biome.json` | Biome linter/formatter configuration |
| `vercel.json` | Vercel deployment settings |
| `.env` | Environment variables (gitignored) |
| `vitest.config.ts` | Vitest test runner configuration |
| `.pipeline-state.json` | Pipeline state machine state (generated) |

---

## See Also

- [Publishing Pipeline Details](./PUBLISHING_PIPELINE.md)
- [Pipeline State Machine](./PIPELINE_STATE.md)
- [Discord Service & Data Analysis](./DATA_ANALYSIS.md)
- [Dependencies](./DEPENDENCIES.md)
