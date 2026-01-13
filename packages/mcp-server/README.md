# Effect Patterns MCP Server

API server for the Effect Patterns Claude Code Plugin, providing pattern search, code analysis, and refactoring capabilities.

## Features

- **Pattern Search**: Search Effect-TS patterns by category, skill level, and keywords
- **Code Analysis**: TypeScript code analysis with Effect-TS best practices recommendations
- **Pattern Generation**: Generate customized Effect-TS code from templates
- **Consistency Analysis**: Detect code inconsistencies across multiple files
- **Refactoring Engine**: Apply automated refactoring patterns
- **Enterprise Features**: Rate limiting, caching, metrics, tracing, and comprehensive logging

## Quick Start

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm
- PostgreSQL database (for pattern storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/effect-patterns.git
cd effect-patterns/packages/mcp-server

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
bun run migrate

# Start development server
bun run dev
```

### Environment Variables

Create a `.env` file with the following variables:

```bash
# API Configuration
PATTERN_API_KEY=your-secret-api-key
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/effect_patterns

# OpenTelemetry Tracing
TRACING_ENABLED=true
OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTLP_HEADERS=authorization=Bearer your-token
SERVICE_NAME=effect-patterns-mcp-server
SERVICE_VERSION=0.5.1

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Caching
CACHE_ENABLED=true
CACHE_DEFAULT_TTL_MS=300000
CACHE_MAX_ENTRIES=1000

# Logging
LOGGING_ENABLED=true
LOG_LEVEL=info

# Metrics
METRICS_ENABLED=true
```

## API Reference

### Authentication

All endpoints (except `/api/health`) require authentication via API key:

```bash
# Header authentication (recommended)
curl -H "x-api-key: your-api-key" https://your-server.com/api/patterns

# Query parameter authentication
curl "https://your-server.com/api/patterns?key=your-api-key"
```

### Endpoints

#### Health Check

```http
GET /api/health
```

Returns service health status (no authentication required).

**Response:**
```json
{
  "ok": true,
  "version": "0.5.1",
  "service": "effect-patterns-mcp-server",
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

#### Pattern Search

```http
GET /api/patterns?q=query&category=error-handling&difficulty=beginner&limit=10
```

Search for Effect-TS patterns with optional filters.

**Parameters:**
- `q` (string): Search query
- `category` (string): Pattern category (e.g., "error-handling", "concurrency")
- `difficulty` (string): "beginner" | "intermediate" | "advanced"
- `limit` (number): Maximum results (default: 50)

**Response:**
```json
{
  "count": 5,
  "patterns": [
    {
      "id": "retry-with-backoff",
      "title": "Retry with Backoff",
      "description": "Exponential backoff retry pattern",
      "category": "error-handling",
      "skillLevel": "intermediate",
      "tags": ["retry", "backoff", "error"]
    }
  ],
  "traceId": "trace-123"
}
```

#### Get Pattern by ID

```http
GET /api/patterns/{patternId}
```

Retrieve a specific pattern by ID.

**Response:**
```json
{
  "id": "retry-with-backoff",
  "title": "Retry with Backoff",
  "description": "Exponential backoff retry pattern",
  "code": "export const retryWithBackoff = ...",
  "imports": ["import { Effect } from 'effect'"],
  "traceId": "trace-123"
}
```

#### Generate Code from Pattern

```http
POST /api/generate
Content-Type: application/json

{
  "patternId": "retry-with-backoff",
  "name": "myRetry",
  "moduleType": "esm"
}
```

Generate customized code from a pattern template.

**Parameters:**
- `patternId` (string): Pattern identifier
- `name` (string, optional): Custom function name
- `moduleType` (string): "esm" | "cjs"

**Response:**
```json
{
  "patternId": "retry-with-backoff",
  "name": "myRetry",
  "imports": ["import { Effect } from 'effect'"],
  "code": "export const myRetry = ...",
  "traceId": "trace-123"
}
```

#### Analyze Code

```http
POST /api/analyze-code
Content-Type: application/json

{
  "source": "const x = 1;",
  "filename": "example.ts",
  "analysisType": "all"
}
```

Analyze TypeScript code for Effect-TS best practices.

**Parameters:**
- `source` (string): Source code to analyze
- `filename` (string, optional): File name for context
- `analysisType` (string): "validation" | "patterns" | "errors" | "all"

**Response:**
```json
{
  "suggestions": [
    {
      "id": "any-type",
      "title": "Avoid any",
      "message": "Replace `any` with specific types",
      "severity": "high"
    }
  ],
  "traceId": "trace-123",
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

#### Analyze Consistency

```http
POST /api/analyze-consistency
Content-Type: application/json

{
  "files": [
    {
      "filename": "a.ts",
      "source": "import { readFile } from 'node:fs/promises';"
    },
    {
      "filename": "b.ts", 
      "source": "import { FileSystem } from '@effect/platform';"
    }
  ]
}
```

Detect code inconsistencies across multiple files.

**Response:**
```json
{
  "issues": [
    {
      "type": "import-inconsistency",
      "description": "Mixed fs import patterns",
      "files": ["a.ts", "b.ts"],
      "suggestion": "Use @effect/platform consistently"
    }
  ],
  "traceId": "trace-123",
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

#### Apply Refactoring

```http
POST /api/apply-refactoring
Content-Type: application/json

{
  "refactoringId": "replace-node-fs",
  "files": [
    {
      "filename": "a.ts",
      "source": "import { readFile } from 'node:fs/promises';"
    }
  ],
  "preview": true
}
```

Apply automated refactoring patterns.

**Parameters:**
- `refactoringId` (string): Refactoring identifier
- `files` (array): Files to refactor
- `preview` (boolean): Preview changes without applying

**Response:**
```json
{
  "applied": false,
  "changes": [
    {
      "filename": "a.ts",
      "before": "import { readFile } from 'node:fs/promises';",
      "after": "import { FileSystem } from '@effect/platform';"
    }
  ],
  "traceId": "trace-123",
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

#### Trace Wiring Examples

```http
GET /api/trace-wiring
```

Get tracing setup examples for different languages/frameworks.

**Response:**
```json
{
  "effectNodeSdk": "import { NodeSdk } from '@effect/opentelemetry'...",
  "effectWithSpan": "Effect.fn('operation-name')(function* () {...})",
  "langgraphPython": "from langchain_community.callbacks import ...",
  "notes": "Configure OTLP endpoint for proper tracing",
  "traceId": "trace-123"
}
```

## Development

### Running Tests

```bash
# Unit tests
bun run test

# Integration tests (requires running server)
bun run test:integration

# Smoke tests against live server
bun run smoke-test https://localhost:3000 your-api-key

# Test coverage
bun run test:coverage
```

### Database Operations

```bash
# Check database connectivity
curl -H "x-api-key: your-key" http://localhost:3000/api/db-check

# Run migrations
curl -X POST -H "x-api-key: your-key" http://localhost:3000/api/migrate

# Check environment configuration
curl -H "x-api-key: your-key" http://localhost:3000/api/env-check
```

### Monitoring

#### Metrics

Access Prometheus metrics:
```bash
curl http://localhost:3000/api/metrics
```

#### Tracing

View traces in your OpenTelemetry-compatible backend (Jaeger, Tempo, etc.).

#### Health Monitoring

The health endpoint provides basic service status:
```bash
curl http://localhost:3000/api/health
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker

```bash
# Build image
docker build -t effect-patterns-mcp-server .

# Run with environment variables
docker run -p 3000:3000 \
  -e PATTERN_API_KEY=your-key \
  -e DATABASE_URL=your-db-url \
  effect-patterns-mcp-server
```

### Environment-Specific Configuration

**Development:**
- `NODE_ENV=development`
- Logging set to `debug` level
- Database connections use local credentials

**Production:**
- `NODE_ENV=production`
- API key required
- All security features enabled
- Metrics and tracing enabled

## Architecture

### Service Layer

The server uses Effect-TS services for dependency injection:

- **ConfigService**: Environment configuration
- **PatternsService**: Database-backed pattern access
- **TracingService**: OpenTelemetry integration
- **CodeAnalyzerService**: Static code analysis
- **PatternGeneratorService**: Template-based code generation
- **ConsistencyAnalyzerService**: Multi-file analysis
- **RefactoringEngineService**: Automated refactoring

### Error Handling

All errors use tagged error types for type-safe handling:
- `AuthenticationError`: API key issues
- `ValidationError`: Invalid request data
- `RateLimitError`: Rate limit exceeded
- `PatternNotFoundError`: Pattern not found
- `ConfigurationError`: Server misconfiguration

### Performance Features

- **Caching**: TTL-based with LRU eviction
- **Rate Limiting**: Sliding window algorithm
- **Metrics**: Prometheus-compatible export
- **Tracing**: OpenTelemetry integration
- **Connection Pooling**: Database connection management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Create issues in the GitHub repository
- Check the smoke test output for connectivity issues
- Review logs for detailed error information
