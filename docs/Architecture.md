# Architecture

This document consolidates architecture context and instructions from the project guides (CLAUDE.md and AGENTS.md).

**Effect Patterns rules** (for Claude, Cursor, Gemini, and other AI tools) live in a single canonical file: **[docs/Effect-Patterns-Rules.md](Effect-Patterns-Rules.md)**. AGENTS.md, CLAUDE.md, and GEMINI.md point to it; Cursor continues to receive a full copy via `ep install add --tool cursor`.

---

## Overview

**Effect Patterns** is a community-driven knowledge base of 700+ practical patterns for building robust applications with Effect-TS. The repository contains:

1. **Pattern Content** (`content/published/patterns/`) - Markdown-based pattern library with examples and explanations
2. **API Server** (`packages/api-server/`) - Next.js REST API with Effect services, database access, and Vercel deployment
3. **MCP Transport** (`packages/mcp-transport/`) - MCP protocol transports (stdio + streamable-http) — pure HTTP clients to the API
4. **Admin CLI** (`packages/ep-admin/`) - Internal tooling for pattern publishing, QA, and migrations
5. **End-user CLI** (`packages/ep-cli/`) - Public CLI for developers to search and generate code
6. **Toolkit** (`packages/toolkit/`) - Type-safe Effect library for pattern operations

---

## Workspace Structure

The repository uses **npm workspaces** for package management. All cross-package imports use `workspace:*` dependencies, **not** TypeScript path aliases.

```
Effect Patterns Hub
├── packages/
│   ├── api-server/           ← REST API server (Next.js + Effect + PostgreSQL)
│   ├── mcp-transport/        ← MCP protocol transports (stdio + streamable-http)
│   ├── toolkit/             ← Core pattern library & database layer
│   ├── ep-admin/            ← Admin CLI (pattern publishing, migrations)
│   ├── ep-cli/              ← End-user CLI
│   ├── analysis-core/      ← Code analysis rules & detectors
│   ├── ep-shared-services/  ← Shared utilities across packages
│   └── pipeline-state/     ← Publishing pipeline state machine
├── content/published/       ← Pattern markdown files (700+ patterns)
├── scripts/                 ← Utility scripts for publishing, testing
└── package.json             ← Root workspace definition
```

---

## API Server + MCP Transport Architecture

The system is split into two packages with clear ownership:

- **`api-server`** owns HTTP + database — Next.js routes, Effect services, auth, tracing
- **`mcp-transport`** owns MCP protocol + tool handlers — standalone Node.js binaries that call the API via `fetch`

The MCP transports have **zero database access** and **zero Next.js imports**. They are pure HTTP clients.

### API Server (`packages/api-server/`)

**HTTP Endpoints** (`app/api/`)
- 27 REST endpoints for pattern operations
- Authentication: API key validation + tier-based access control (Effect-based)
- Error handling: Centralized via `errorHandler.ts`

**Services** (`src/services/`)
- **Resilience Layer**: Cache, circuit-breaker, rate-limiter with KV fallback
- **Code Analysis**: Review-code, analyze-code, confidence-calculator, snippet-extractor, fix-plan-generator
- **Infrastructure**: Config, logger, metrics, validation, guidance-loader, pattern-generator
- All services use Effect.Service pattern for dependency injection and composition

**Auth** (`src/auth/`)
- `apiKey.ts` — HTTP API key validation (Effect-based)
- `adminAuth.ts` — Admin endpoint authentication
- `secureCompare.ts` — Constant-time string comparison

**Dependencies**: `effect`, `next`, `drizzle-orm`, `postgres`, `@effect-patterns/toolkit`

### MCP Transport (`packages/mcp-transport/`)

**Entry Points**
- `src/mcp-stdio.ts` — stdio transport for IDE integration (Claude Code, Cursor)
- `src/mcp-streamable-http.ts` — HTTP transport for remote MCP 2.0 connections
- `src/mcp-production-client.ts` — production HTTP client with pooling/dedup

**Tool Handlers** (`src/tools/`)
- `tool-implementations.ts` — tool registry with Zod schema validation
- `handlers/` — search-patterns, get-pattern, simple-handlers
- `tool-result-builder.ts` — rich MCP response formatting
- `elicitation-helpers.ts` — interactive tool clarification

**Schemas** (`src/schemas/`)
- `tool-schemas.ts` — Zod schemas for MCP tool inputs
- `output-schemas.ts` — Zod schemas for structured tool outputs
- `structured-output.ts` — MCP 2.0 content types (text, image, structured)

**Auth** (`src/auth/`)
- `mcpTransportAuth.ts` — transport-level API key validation
- `oauth-server.ts`, `oauth-config.ts`, `oauth-client.ts` — OAuth2 for MCP 2.0
- `pkce.ts` — PKCE challenge generation

**Dependencies**: `@modelcontextprotocol/sdk`, `zod` (no `effect`, no `next`, no `drizzle-orm`)

### Database (`packages/toolkit/src/db/`)
- PostgreSQL with Drizzle ORM
- Tables: `effect_patterns`, `application_patterns`, `pattern_relations`, `skills`, `skill_patterns`
- Connection pooling with serverless-aware configuration (Vercel KV fallback)

### Dependency Flow

```
MCP Clients (Claude Code, Cursor, etc.)
  ↓
MCP Transport (stdio or streamable-http)    ← packages/mcp-transport
  ↓ fetch()
API Server (Next.js routes)                 ← packages/api-server
  ↓
Route Handler Factory (applies auth, errors, logging)
  ↓
Effect Services (composition via Effect.Service)
  ├─ Circuit Breaker (protects external calls)
  ├─ Rate Limiter (per-client quotas)
  ├─ Cache (in-memory + TTL)
  ├─ Code Analysis Services (Claude API calls)
  └─ Database Layer (Toolkit package)
  ↓
PostgreSQL (via Drizzle ORM with connection pooling)
```

---

## Features and Tools

### Available Tools

**Free (MCP protocol):**
- `search_patterns` - Search 700+ patterns by query, category, difficulty
- `get_pattern` - Get full pattern details and code examples by ID
- `list_analysis_rules` - Browse analysis rule catalog (metadata only)

**Paid (HTTP API only):**
- Code review (`review_code`)
- Code analysis (`analyze_code`)
- Consistency analysis (`analyze_consistency`)
- Pattern generation (`generate_pattern`)
- Refactoring (`apply_refactoring`)
- See [MCP_CONFIG.md](../MCP_CONFIG.md) for HTTP API details

### Package Locations

- **API Server**: `packages/api-server/`
- **MCP Transport**: `packages/mcp-transport/`
- **Local API**: `http://localhost:3000` (run: `bun run api:dev`)
- **Staging**: `https://effect-patterns-mcp-staging.vercel.app`
- **Production**: `https://effect-patterns-mcp.vercel.app`

---

## Database Schema

### Core Tables (PostgreSQL)

**`effect_patterns`** - Main pattern records
- `id`, `slug` (unique), `title`, `skillLevel`, `category`, `difficulty`
- `examples`, `rules` (JSONB for flexibility)
- Indexed on: slug, skill_level

**`application_patterns`** - High-level classifications
- `id`, `slug` (unique), `name`, `description`
- `learningOrder`, `effectModule`, `subPatterns` (JSONB)
- Indexed on: slug, learning_order

**`pattern_relations`** - Related patterns
- Self-referential many-to-many linking related patterns

**`skills`** - Agent skills generated from patterns
- One per application pattern category, contains SKILL.md content

**`skill_patterns`** - Skill → Pattern join table
- Many-to-many linking skills to their constituent patterns

### Skill Levels
- Beginner - Fundamentals, first patterns
- Intermediate - Common use cases
- Advanced - Complex compositions

---

## Important Files and Their Purposes

### API Server Core

| File | Purpose |
|------|---------|
| `packages/api-server/src/server/init.ts` | Effect layer composition, runtime setup |
| `packages/api-server/src/server/errorHandler.ts` | Converts Effect errors to HTTP responses |
| `packages/api-server/src/server/routeHandler.ts` | Factory for authenticated route handlers |
| `packages/api-server/src/auth/apiKey.ts` | API key authentication (Effect-based) |
| `packages/api-server/src/tools/schemas.ts` | Effect Schema types shared with API routes |

### MCP Transport Core

| File | Purpose |
|------|---------|
| `packages/mcp-transport/src/mcp-stdio.ts` | MCP stdio transport for IDE integration |
| `packages/mcp-transport/src/mcp-streamable-http.ts` | MCP 2.0 streamable HTTP transport |
| `packages/mcp-transport/src/tools/tool-implementations.ts` | Tool registry and Zod schema validation |
| `packages/mcp-transport/src/mcp-content-builders.ts` | Rich MCP response formatting |
| `packages/mcp-transport/src/config/mcp-environments.ts` | Environment URL selection (local/staging/prod) |

### Services

| File | Purpose |
|------|---------|
| `packages/api-server/src/services/config/api.ts` | Centralized config, no async overhead |
| `packages/api-server/src/services/cache/api.ts` | In-memory cache with TTL and LRU eviction |
| `packages/api-server/src/services/circuit-breaker/api.ts` | Prevents cascading failures (3-state FSM) |
| `packages/api-server/src/services/rate-limit/api.ts` | Dual-layer: Vercel KV + in-memory fallback |
| `packages/api-server/src/services/review-code/api.ts` | Code analysis via Claude API |
| `packages/api-server/src/services/logger/api.ts` | Structured logging with operation context |
| `packages/api-server/src/services/metrics/api.ts` | Request/response timing and error tracking |

### Database

| File | Purpose |
|------|---------|
| `packages/toolkit/src/db/schema/index.ts` | Drizzle schema: patterns, jobs, relations |
| `packages/toolkit/src/db/client.ts` | Connection pooling, serverless-aware |
| `packages/toolkit/src/db/migrations/` | Incremental schema changes |

### Configuration

| File | Purpose |
|------|---------|
| `packages/api-server/src/services/config/api.ts` | API server environment variables, defaults |
| `packages/toolkit/src/services/config.ts` | Toolkit-specific config |
| `packages/mcp-transport/src/config/mcp-environments.ts` | MCP environment URL selection (local/staging/prod) |

### Error Handling

| File | Purpose |
|------|---------|
| `packages/api-server/src/errors.ts` | All error types (tagged unions) |
| `packages/api-server/src/server/errorHandler.ts` | Error to HTTP response mapping |

---

## Key Architecture Patterns

Use the **effect-patterns-services-agents** skill (`.cursor/skills/effect-patterns-services-agents/SKILL.md`) for Effect.Service, error-as-values, and Layer composition. Summary:

- **Effect-TS native**: Services via Effect.Service / Context.Tag; composition via `Effect.gen` and `Layer`.
- **Errors as values**: Tagged errors; recover with `Effect.catchTag`.
- **Workspace**: Use `workspace:*` deps; no path aliases; run from repo root.

### Database with Drizzle ORM

Type-safe SQL queries with Drizzle:

```typescript
// From packages/toolkit/src/db/schema/index.ts
const patterns = await db
  .select()
  .from(effectPatterns)
  .where(eq(effectPatterns.skillLevel, "intermediate"));
```

---

## Configuration

### Resilience Configuration

Located in `packages/api-server/src/services/config/api.ts`:

```typescript
const config = {
  // Circuit breaker (prevents cascading failures)
  circuitBreaker: {
    database: { failureThreshold: 5, timeout: "30s" },
    kvCache: { failureThreshold: 3, timeout: "10s" },
  },
  // Rate limiting (per-client quotas)
  rateLimiter: {
    requestsPerMinute: 60,
    fallbackToMemory: true, // Uses in-memory if KV unavailable
  },
  // Caching (in-memory, TTL-based, LRU eviction)
  cache: {
    enabled: true,
    maxSize: 1000,
    ttl: "1h",
  },
};
```

### Environment Variables

Key variables for development and deployment:

```bash
# API Server
PATTERN_API_KEY=your-key                        # API authentication
DATABASE_URL=postgres://user:pass@host/db       # PostgreSQL connection
KV_REST_API_URL=https://your-kv.vercel.sh       # Cache (Vercel KV, optional)
KV_REST_API_TOKEN=token

# Observability (API Server)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer token

# MCP Transport
EFFECT_PATTERNS_API_URL=http://localhost:3000    # API server URL
MCP_ENV=local|staging|production                # Environment selector
MCP_DEBUG=true                                  # Enable verbose logging

# Testing
STAGING_API_KEY=key                             # For staging deployment tests
PRODUCTION_API_KEY=key                          # For production deployment tests
```

See [packages/api-server/ENV_VARS.md](../packages/api-server/ENV_VARS.md) for complete reference.

### Configuration Files

- `.ai-cli-config.json` - AI CLI settings
- `config/environments.ts` - Environment configs
- `vercel.json` - Deployment settings

---

## Package Resolution

**Important**: No TypeScript path aliases. Use `workspace:*` dependencies instead.

```json
{
  "dependencies": {
    "@effect-patterns/toolkit": "workspace:*"
  }
}
```

This ensures:
- Packages resolve via npm workspaces, not tsconfig paths
- Each package has independent `tsconfig.json`
- Proper module resolution across environments (Node, browser, serverless)

Note: `api-server` depends on `toolkit` and `analysis-core`. `mcp-transport` has no workspace dependencies — it communicates with the API server purely via HTTP.

---

## Agents and Services

### Current Agents

**1. Pattern Analyzer Agent**
- **Location**: `docs/agents/analyzer/` (archived)
- **Purpose**: Analyzes Effect-TS patterns for correctness, best practices, and potential improvements.
- **Status**: Archived - functionality integrated into CLI tools

**2. API Server + MCP Transport**
- **API Server** (`packages/api-server/`): REST API with database access, Effect services, authentication, and Vercel deployment.
- **MCP Transport** (`packages/mcp-transport/`): Standalone MCP protocol transports (stdio + streamable-http) that call the API via fetch.
- **Features**: Serves patterns to Claude Code IDE; real-time pattern search and retrieval; context-aware suggestions; pattern generation with AI assistance; API key authentication.
- **Deployment**: API server deployed to Vercel (staging + production). MCP transports run locally as Node.js binaries.
- **API Dependencies**: `@effect-patterns/toolkit` (workspace:*), Next.js, Effect-TS, Drizzle ORM.
- **Transport Dependencies**: `@modelcontextprotocol/sdk`, `zod` (no Effect, no Next.js, no DB).

### Patterns and Structure

Use the **effect-patterns-services-agents** skill (`.cursor/skills/effect-patterns-services-agents/SKILL.md`) for Effect.Service pattern, agent/service folder layout (api, schema, service, types, __tests__), and Layer/error-handling conventions.

---

## Integration Points

### CLI Integration
Agents integrate with the `ep-admin` CLI through:
- Service composition using Effect layers
- Shared configuration via workspace packages
- Common error handling with Effect error types
- Unified logging through structured logging

### Database Integration
- PostgreSQL for pattern storage
- Effect repositories from `@effect-patterns/toolkit`
- Connection pooling and management via platform services

### API Integration
- RESTful endpoints via `api-server` for external access
- MCP protocol via `mcp-transport` for IDE integration
- MCP transports call the API server over HTTP — no shared code or direct imports
- Authentication at the API layer (API keys), transport-level auth for MCP connections

---

## Development Commands

### Building and Installation

```bash
bun install
bun run build
bun run --filter @effect-patterns/toolkit build
bun run typecheck
bun run lint
bun run lint:fix
bun run lint:effect
bun run lint:all
```

### API Server Development

```bash
bun run api:dev          # Start Next.js dev server on :3000
bun run api:build        # Build Next.js for production
bun run api:test         # Run api-server unit tests
bun run deploy:staging   # Preflight + deploy to Vercel staging
bun run deploy:production # Preflight + deploy to Vercel production
```

### MCP Transport Development

```bash
bun run mcp:stdio        # Build + run stdio transport
bun run mcp:http         # Build + run streamable-http transport
bun run mcp:build        # Build transport binaries
bun run mcp:test         # Run transport unit tests
```

### CLI Development

```bash
bun run ep:preflight
bun run ep:smoke-test
```

### Scripts (scaffold and lifecycle harness)

- **Scaffold** (`bun run scaffold`) creates new projects under `$HOME/Projects/TestRepos` (see [scripts/scaffold-test-project.ts](../scripts/scaffold-test-project.ts) and [docs/development/SCAFFOLD_USER_GUIDE.md](development/SCAFFOLD_USER_GUIDE.md)).
- **Lifecycle harness** (`bun run lifecycle-harness --seed <n>`) runs seedable E2E over real repos and the `ep` CLI (no mocks; real network/API). It uses the same repo root as the scaffold (`defaultScaffoldRootDir()` in `scripts/lifecycle-harness/src/paths.ts`), discovers the monorepo root by walking up from its script dir, and writes JSON reports under `scripts/lifecycle-harness/reports/`. Templates are assigned in round-robin by scenario index. Full documentation: **[scripts/lifecycle-harness/README.md](../scripts/lifecycle-harness/README.md)**.

### Testing

**Unit and integration:**
```bash
bun run test             # All workspace tests
bun run api:test         # API server tests
bun run mcp:test         # MCP transport tests
```

**Within api-server:**
```bash
bun run --filter @effect-patterns/api-server test:routes
bun run --filter @effect-patterns/api-server test:integration
bun run --filter @effect-patterns/api-server test:full
```

**Within mcp-transport:**
```bash
bun run --filter @effect-patterns/mcp-transport test:mcp:ci    # MCP protocol tests
bun run --filter @effect-patterns/mcp-transport test:mcp:local  # Against local server
```

**Deployment testing:**
```bash
export STAGING_API_KEY="your-key"
bun run --filter @effect-patterns/api-server test:deployment:staging

export PRODUCTION_API_KEY="your-key"
bun run --filter @effect-patterns/api-server test:deployment:production
```

**Stress testing:**
```bash
bun run test:stress:edge
bun run test:stress:volume
bun run test:stress:load
bun run test:stress:spike
bun run test:stress:endurance
bun run test:stress:all
```

**Other:**
```bash
bun run test:e2e
cd packages/api-server && bun run smoke-test
```

See [packages/api-server/TESTING_GUIDE.md](../packages/api-server/TESTING_GUIDE.md) for detailed testing setup.

### Pattern Publishing Pipeline

```bash
bun run pipeline
bun run validate
bun run generate
bun run ingest
bun run rules
bun run ep:admin publish pipeline
bun run ep:admin publish lint
bun run ep:admin publish validate
```

### Database Operations

```bash
bun run db:generate
bun run db:push
bun run db:migrate
bun run db:studio
bun run test:db
bun run test:db:quick
```

### Quality Assurance

```bash
bun run qa:process
bun run qa:report
bun run qa:repair
bun run qa:repair:dry
bun run qa:all
```

---

## Common Development Tasks

### Running a Single Test File

```bash
# API server unit test
bunx vitest run packages/api-server/src/services/cache/__tests__/cache.test.ts

# API server route test (needs DB)
DATABASE_URL=postgres://... bunx vitest run packages/api-server/tests/routes/health.route.test.ts --config vitest.routes.config.ts

# MCP transport tool test
cd packages/mcp-transport && bunx vitest run src/tools/__tests__/tool-handlers.test.ts
```

### Debugging Services

```bash
# In service test or debug script
const service = yield* MyService;
yield* Effect.log(`Debug: ${JSON.stringify(value)}`);
```

### Schema Changes

```bash
# 1. Edit: packages/toolkit/src/db/schema/index.ts
# 2. Generate migration
bun run db:generate
# 3. Review and apply
bun run db:push
```

### Adding New Analysis Rules

```bash
# Edit: packages/analysis-core/src/rules/
# Then regenerate rule catalog
bun run rules
bun run rules:claude
```

---

## Development Guidelines

### Creating New Agents

Follow the **effect-patterns-services-agents** skill. In this repo: run debug scripts from project root for correct module resolution; add tests and clear API docs.

### Example Agent Structure

See **effect-patterns-services-agents** skill for Effect.Service and folder layout.

---

## Deployment

### API Server

Deployed to Vercel with automatic scaling:
- Staging environment for testing
- Production environment for live use
- Health checks at `/api/health` and `/api/health?deep=true`

### MCP Transport

Runs locally as Node.js binaries:
- stdio transport for IDE integration (Claude Code, Cursor)
- Streamable HTTP transport for remote MCP 2.0 connections
- Connects to API server via `EFFECT_PATTERNS_API_URL` env var

### Local Development

```bash
bun install
bun run --filter @effect-patterns/toolkit build
bun run --filter @effect-patterns/pipeline-state build
bun run --filter @effect-patterns/ep-shared-services build

# Start API server
bun run api:dev

# In another terminal, run MCP transport
bun run mcp:stdio
```

---

## Security

### Authentication
- API key-based authentication
- Environment-specific keys
- Secure key rotation

### Rate Limiting
- 100 requests per 15 minutes
- Per-IP tracking
- Graceful degradation

### Data Privacy
- No sensitive data logging
- Secure data transmission
- GDPR compliance

---

## Monitoring

### Metrics
- Request counts and response times
- Error rates and types
- Resource utilization
- User interaction patterns

### Logging
- Structured logs with correlation IDs
- Different log levels for environments
- Centralized log aggregation

### Health Checks
- `/health` endpoint for monitoring
- Database connectivity checks
- Service dependency verification

---

## Debugging Guidelines

- **Always run from project root** - Ensures proper `node_modules` resolution
- **Check env vars first** - Use `bun run ep:admin ops health-check` to diagnose issues
- **Review errors as values** - Use `Effect.catchTag` to handle specific error types
- **Profile with time** - `time bun run test:mcp` to identify bottlenecks
- **Verify in CI** - GitHub Actions config: `.github/workflows/`

---

## Roadmap

### Planned Agents
1. Pattern Generator: Automated pattern creation
2. Test Generator: Automated test case generation
3. Documentation Agent: Auto-generate documentation
4. Migration Agent: Assist with code migrations

### Enhancements
1. Multi-Model Support: Support for multiple AI providers
2. Context Awareness: Better understanding of project context
3. Collaboration: Multi-agent coordination
4. Learning: Agent improvement over time

---

## Contributing

When contributing to agents:

1. Follow Effect-TS patterns and conventions
2. Maintain backward compatibility
3. Add comprehensive tests
4. Update documentation
5. Consider security implications

---

## Resources

- [Effect-TS Documentation](https://effect.website)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Claude Code Integration Guide](https://docs.anthropic.com/claude/docs/claude-code)
- [Architecture (monorepo structure)](architecture/ARCHITECTURE.md)

---

## Recent Changes

### Package Split: mcp-server → api-server + mcp-transport (February 2026)
- Split `packages/mcp-server/` into two packages with clear ownership
- `packages/api-server/` — REST API with Effect services, DB access, Vercel deployment (renamed from mcp-server)
- `packages/mcp-transport/` — MCP protocol transports, tool handlers, Zod schemas (new package)
- The MCP transports had zero database access and zero Next.js imports — the split codifies this boundary
- Root scripts updated: `api:dev`, `api:build`, `api:test`, `mcp:stdio`, `mcp:http`, `mcp:build`, `mcp:test`

### Path Alias Migration (January 2026)
- Removed TypeScript path aliases from tsconfig.json
- Packages now resolve via npm workspaces (`workspace:*` dependencies)
- Each app has independent tsconfig.json configuration
- Improved build reliability and standard monorepo practices

---

*Source: consolidated from CLAUDE.md and AGENTS.md.*
