# Architecture

This document consolidates architecture context and instructions from the project guides (CLAUDE.md and AGENTS.md).

**Effect Patterns rules** (for Claude, Cursor, Gemini, and other AI tools) live in a single canonical file: **[docs/Effect-Patterns-Rules.md](Effect-Patterns-Rules.md)**. AGENTS.md, CLAUDE.md, and GEMINI.md point to it; Cursor continues to receive a full copy via `ep install add --tool cursor`.

---

## Overview

**Effect Patterns** is a community-driven knowledge base of 700+ practical patterns for building robust applications with Effect-TS. The repository contains:

1. **Pattern Content** (`content/published/patterns/`) - Markdown-based pattern library with examples and explanations
2. **API Server** (`packages/api-server/`) - REST API for pattern search, code analysis, and generation
2b. **MCP Transport** (`packages/mcp-transport/`) - MCP protocol transports (stdio + streamable-http)
3. **Admin CLI** (`packages/ep-admin/`) - Internal tooling for pattern publishing, QA, and migrations
4. **End-user CLI** (`packages/ep-cli/`) - Public CLI for developers to search and generate code
5. **Toolkit** (`packages/toolkit/`) - Type-safe Effect library for pattern operations

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

## MCP Server Architecture

### Core Components

**HTTP Endpoints** (`packages/api-server/app/api/`)
- 27 REST endpoints for pattern operations
- Authentication: API key validation + tier-based access control
- Error handling: Centralized via `errorHandler.ts`

**Services** (`packages/api-server/src/services/`)
- **Resilience Layer**: Cache, circuit-breaker, rate-limiter with KV fallback
- **Code Analysis**: Review-code, analyze-code, pattern-diff-generator, confidence-calculator
- **Infrastructure**: Config, logger, metrics, validation, tier-management
- All services use Effect.Service pattern for dependency injection and composition

**Database** (`packages/toolkit/src/db/`)
- PostgreSQL with Drizzle ORM
- Tables: `effect_patterns`, `application_patterns`, `pattern_relations`, `skills`, `skill_patterns`
- Connection pooling with serverless-aware configuration (Vercel KV fallback)

**MCP Protocol** (`packages/mcp-transport/src/mcp-stdio.ts`)
- Handles Model Context Protocol via stdio transport
- Tools: `search_patterns`, `get_pattern`, `list_analysis_rules`
- HTTP client pooling with in-flight deduplication and LRU cache

### Dependency Flow

```
Next.js Routes (app/api/)
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

### MCP Server Locations

- **Source**: `packages/api-server/`
- **Local Development**: `http://localhost:3000` (run: `bun run mcp:dev`)
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

### MCP Server Core

| File | Purpose |
|------|---------|
| `packages/api-server/src/server/init.ts` | Effect layer composition, runtime setup |
| `packages/mcp-transport/src/mcp-stdio.ts` | MCP protocol implementation via stdio |
| `packages/mcp-transport/src/tools/tool-implementations.ts` | Tool registry and handlers |
| `packages/api-server/src/server/errorHandler.ts` | Converts Effect errors to HTTP responses |
| `packages/api-server/src/server/routeHandler.ts` | Factory for authenticated route handlers |

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
| `packages/api-server/src/services/config/api.ts` | All environment variables, defaults |
| `packages/toolkit/src/services/config.ts` | Toolkit-specific config |
| `packages/mcp-transport/src/config/mcp-environments.ts` | MCP environment selection (local/staging/prod) |

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
# API & Authentication
PATTERN_API_KEY=your-key                        # MCP authentication
STAGING_API_KEY=key                             # For staging tests
PRODUCTION_API_KEY=key                           # For production tests

# Database (Toolkit)
DATABASE_URL=postgres://user:pass@host/db       # PostgreSQL connection

# Cache (Vercel KV, optional)
KV_REST_API_URL=https://your-kv.vercel.sh
KV_REST_API_TOKEN=token

# Observability (OpenTelemetry)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer token

# MCP Configuration
MCP_ENV=local|staging|production                # Affects available tools
MCP_DEBUG=true                                  # Enable verbose logging

# Agent configuration (optional)
AGENT_ENABLED=true
AGENT_LOG_LEVEL=info
AGENT_TIMEOUT=30000
MCP_SERVER_URL=https://effect-patterns-mcp.vercel.app
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
    "@effect-patterns/toolkit": "workspace:*",
    "@effect-patterns/api-server": "workspace:*"
  }
}
```

This ensures:
- Packages resolve via npm workspaces, not tsconfig paths
- Each package has independent `tsconfig.json`
- Proper module resolution across environment (Node, browser, serverless)
- Apps have independent tsconfig configurations

---

## Agents and Services

### Current Agents

**1. Pattern Analyzer Agent**
- **Location**: `docs/agents/analyzer/` (archived)
- **Purpose**: Analyzes Effect-TS patterns for correctness, best practices, and potential improvements.
- **Status**: Archived - functionality integrated into CLI tools

**2. MCP (Model Context Protocol) Server**
- **Location**: `packages/api-server/`
- **Purpose**: Provides Effect Patterns to Claude Code via MCP protocol.
- **Features**: Serves patterns to Claude Code IDE; real-time pattern search and retrieval; context-aware suggestions; pattern generation with AI assistance; API key authentication.
- **Deployment**: Staging and Production (see MCP Server Locations above).
- **Dependencies**: `@effect-patterns/toolkit` (workspace:*), Next.js, Effect-TS for service composition.

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
- RESTful endpoints for external access
- MCP protocol for IDE integration
- Authentication and authorization
- Workspace-based package resolution

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

### MCP Server Development

```bash
bun run mcp:dev
bun run mcp:build
bun run smoke-test
bun run deploy:staging
bun run deploy:production
```

### CLI Development

```bash
bun run ep:preflight
bun run ep:smoke-test
```

### Testing

**Unit and integration:**
```bash
bun run test
bun run test:mcp
bun run test:routes
bun run test:integration
bun run test:full
```

**Deployment testing:**
```bash
export STAGING_API_KEY="your-key"
bun run mcp:test:deployment

export PRODUCTION_API_KEY="your-key"
bun run mcp:test:deployment
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
bun run test:agents
bun run test:e2e
cd packages/mcp-server && bun run smoke-test
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
bunx vitest run packages/api-server/src/services/cache/__tests__/cache.test.ts

DATABASE_URL=postgres://... bunx vitest run packages/api-server/tests/routes/health.route.test.ts --config vitest.routes.config.ts

bunx vitest run packages/mcp-transport/tests/mcp-protocol/tools/search-patterns.test.ts --config vitest.mcp.config.ts
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

### MCP Server

Deployed to Vercel with automatic scaling:
- Staging environment for testing
- Production environment for live use
- Health checks and monitoring

### Local Development

```bash
bun install
bun run --filter @effect-patterns/toolkit build
bun run --filter @effect-patterns/pipeline-state build
bun run --filter @effect-patterns/ep-shared-services build
cd packages/mcp-server
bun run dev
bun run smoke-test
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

### Path Alias Migration (January 2026)
- Removed TypeScript path aliases from tsconfig.json
- Packages now resolve via npm workspaces (`workspace:*` dependencies)
- Each app has independent tsconfig.json configuration
- Improved build reliability and standard monorepo practices

---

*Source: consolidated from CLAUDE.md and AGENTS.md.*
