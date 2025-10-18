# Effect Patterns MCP Server

> Type-safe REST API for the Effect Patterns Hub, built with Effect-TS and Next.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Effect](https://img.shields.io/badge/Effect-3.18+-purple.svg)](https://effect.website/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3-black.svg)](https://nextjs.org/)

A production-ready MCP (Model Context Protocol) server providing REST API access to 150+ curated Effect-TS patterns. Features authentication, OpenTelemetry tracing, and Effect-native architecture.

## Features

- 🔍 **Pattern Search API** - Search 150+ patterns with filters
- 🔐 **API Key Authentication** - Secure access with API keys
- 📊 **OpenTelemetry Integration** - Full distributed tracing
- ⚡ **Serverless-Ready** - Deployed on Vercel Edge Functions
- 🎯 **Effect-Native** - Built entirely with Effect primitives
- 🚀 **Production-Ready** - Includes health checks, monitoring, smoke tests

## Live Deployment

- **Production**: `https://effect-patterns.vercel.app`
- **Staging**: `https://effect-patterns-staging.vercel.app`

## Quick Start

### Installation

```bash
# Navigate to MCP server directory
cd services/mcp-server

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
bun run dev
```

The server will be available at `http://localhost:3000`.

### Environment Variables

```bash
# Required
PATTERN_API_KEY=your-secret-api-key-here

# Optional (for tracing)
OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
OTLP_HEADERS={"x-honeycomb-team":"your-api-key"}
SERVICE_NAME=effect-patterns-mcp-server

# Optional
PATTERNS_PATH=./data/patterns.json
NODE_ENV=development
```

## API Endpoints

### Health Check

Check server status (no authentication required).

```bash
GET /api/health

curl http://localhost:3000/api/health
```

**Response**:
```json
{
  "ok": true,
  "service": "effect-patterns-mcp-server",
  "version": "0.1.0",
  "timestamp": "2025-10-15T10:30:00.000Z",
  "traceId": "abc123..."
}
```

### Search Patterns

Search and filter patterns.

```bash
GET /api/patterns?q={query}&skillLevel={level}&useCase={category}

# Examples:
curl -H "x-api-key: YOUR_API_KEY" \
  "http://localhost:3000/api/patterns?q=retry"

curl -H "x-api-key: YOUR_API_KEY" \
  "http://localhost:3000/api/patterns?skillLevel=intermediate&useCase=Error%20Management"
```

**Query Parameters**:
- `q` - Text search across title, summary, content
- `skillLevel` - Filter by `beginner`, `intermediate`, or `advanced`
- `useCase` - Filter by use case category (e.g., "Error Management")
- `tags` - Filter by tags (comma-separated)
- `limit` - Maximum number of results (default: 50)

**Response**:
```json
{
  "patterns": [
    {
      "id": "retry-with-backoff",
      "title": "Retry Operations with Exponential Backoff",
      "summary": "Automatically retry failed operations with increasing delays",
      "skillLevel": "intermediate",
      "useCase": ["Error Management"],
      "tags": ["retry", "schedule", "error-handling"]
    }
  ],
  "total": 1,
  "traceId": "abc123..."
}
```

### Get Pattern by ID

Get full pattern details including code examples.

```bash
GET /api/patterns/{patternId}

curl -H "x-api-key: YOUR_API_KEY" \
  http://localhost:3000/api/patterns/retry-with-backoff
```

**Response**:
```json
{
  "id": "retry-with-backoff",
  "title": "Retry Operations with Exponential Backoff",
  "summary": "...",
  "content": "## Use Case\n...",
  "code": "import { Effect, Schedule } from 'effect'...",
  "skillLevel": "intermediate",
  "useCase": ["Error Management"],
  "tags": ["retry", "schedule"],
  "related": ["handle-flaky-operations"],
  "traceId": "abc123..."
}
```

### Explain Pattern

Get a contextual explanation of a pattern.

```bash
POST /api/patterns/explain
Content-Type: application/json

{
  "patternId": "retry-with-backoff",
  "context": "I'm building an HTTP API that needs to retry failed requests"
}
```

**Response**:
```json
{
  "explanation": "For your HTTP API, you can use Effect.retry with Schedule.exponential...",
  "traceId": "abc123..."
}
```

### Generate Code Snippet

Generate a customized code snippet from a pattern.

```bash
POST /api/generate
Content-Type: application/json

{
  "patternId": "retry-with-backoff",
  "customName": "retryHttpRequest",
  "customInput": "fetch('/api/data')",
  "moduleType": "esm"
}
```

**Response**:
```json
{
  "code": "import { Effect, Schedule } from 'effect'\n\nconst retryHttpRequest = ...",
  "patternId": "retry-with-backoff",
  "traceId": "abc123..."
}
```

### Trace Wiring Examples

Get OpenTelemetry trace wiring examples.

```bash
GET /api/trace-wiring

curl -H "x-api-key: YOUR_API_KEY" \
  http://localhost:3000/api/trace-wiring
```

**Response**:
```json
{
  "examples": [
    {
      "language": "typescript",
      "framework": "effect",
      "code": "import { NodeSdk } from '@opentelemetry/sdk-node'..."
    }
  ]
}
```

## Authentication

All endpoints except `/api/health` require API key authentication.

### Header Authentication (Recommended)

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  http://localhost:3000/api/patterns
```

### Query Parameter Authentication

```bash
curl "http://localhost:3000/api/patterns?key=YOUR_API_KEY"
```

### Error Responses

**401 Unauthorized** - Missing or invalid API key:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key",
  "traceId": "abc123..."
}
```

**404 Not Found** - Pattern not found:
```json
{
  "error": "Not Found",
  "message": "Pattern not found: nonexistent-pattern",
  "traceId": "abc123..."
}
```

**500 Internal Server Error** - Server error:
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "traceId": "abc123..."
}
```

## Architecture

### Effect Layer Composition

The server uses Effect's Layer system for dependency injection:

```
ConfigLayer
    ↓
TracingLayer (OpenTelemetry)
    ↓
PatternsLayer (In-memory cache)
    ↓
AppLayer (Composed runtime)
```

### Services

- **ConfigService** - Environment configuration
- **PatternsService** - In-memory pattern cache with Effect.Ref
- **TracingLayer** - OpenTelemetry SDK integration

### Request Flow

```
1. HTTP Request (Next.js API Route)
   ↓
2. Authentication Middleware
   ↓
3. Effect Program (runWithRuntime)
   ↓
4. Service Layer (PatternsService)
   ↓
5. Response with Trace ID
```

## Development

### Scripts

```bash
# Development
bun run dev                 # Start dev server with hot reload
bun run build               # Build for production
bun run start               # Start production server

# Testing
bun test                    # Run unit tests
bun run test:integration    # Run integration tests (requires server)
bun run smoke-test          # Run smoke tests against deployment

# Quality
bun run typecheck           # TypeScript type checking
bun run lint                # Lint with ESLint
```

### Project Structure

```
services/mcp-server/
├── app/
│   ├── api/
│   │   ├── health/route.ts      # Health check endpoint
│   │   ├── patterns/
│   │   │   ├── route.ts         # Search patterns
│   │   │   └── [id]/route.ts    # Get pattern by ID
│   │   ├── generate/route.ts    # Generate code
│   │   └── trace-wiring/route.ts # Trace examples
│   └── layout.tsx               # Root layout
├── src/
│   ├── auth/
│   │   └── apiKey.ts            # API key validation
│   ├── server/
│   │   └── init.ts              # Layer composition & runtime
│   └── tracing/
│       └── otlpLayer.ts         # OpenTelemetry setup
├── tests/
│   ├── integration/
│   │   └── api.test.ts          # API integration tests
│   └── mock-otlp-server.ts      # Mock OTLP collector
├── data/
│   └── patterns.json            # Pattern data (generated)
├── .env.example                 # Environment template
├── next.config.js               # Next.js configuration
├── vercel.json                  # Vercel deployment config
└── package.json
```

## Testing

### Unit Tests

```bash
bun test
```

Runs fast unit tests without external dependencies.

### Integration Tests

```bash
# Start server in one terminal
bun run dev

# Run integration tests in another terminal
bun run test:integration
```

Tests real API endpoints with authentication and tracing.

### Smoke Tests

Test a deployed environment:

```bash
bun run smoke-test https://your-deployment.vercel.app YOUR_API_KEY
```

Comprehensive smoke tests cover:
- Health check
- Pattern search (with/without filters)
- Pattern retrieval
- Code generation
- Authentication
- Trace ID propagation

## Deployment

### Vercel (Recommended)

See [VERCEL_SETUP.md](./VERCEL_SETUP.md) for detailed instructions.

**Quick Deploy**:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to staging
vercel

# Deploy to production
vercel --prod
```

### Docker

```bash
# Build image
docker build -t effect-patterns-mcp-server .

# Run container
docker run -p 3000:3000 \
  -e PATTERN_API_KEY=your-key \
  effect-patterns-mcp-server
```

### Environment-Specific Configuration

**Staging**:
- URL: `https://effect-patterns-staging.vercel.app`
- Service Name: `effect-patterns-mcp-server-staging`
- Separate API key for testing

**Production**:
- URL: `https://effect-patterns.vercel.app`
- Service Name: `effect-patterns-mcp-server-production`
- Separate API key for production use

## Monitoring

### OpenTelemetry Tracing

The server exports traces to any OTLP-compatible collector (Honeycomb, Jaeger, etc.).

**Setup with Honeycomb**:

```bash
# Set environment variables
OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
OTLP_HEADERS={"x-honeycomb-team":"YOUR_API_KEY"}
SERVICE_NAME=effect-patterns-mcp-server
```

**Trace Data**:
- Service name and version
- Request spans with timing
- Error spans with details
- Trace IDs in all responses

### Logs

```bash
# Vercel logs (production)
vercel logs --follow

# Docker logs
docker logs -f container-name

# Local development
# Logs printed to console
```

### Metrics

Available in Vercel Dashboard:
- Request count
- Response times
- Error rates
- Bandwidth usage

## Security

### Best Practices

1. **API Key Rotation** - See [API_KEY_ROTATION.md](./API_KEY_ROTATION.md)
2. **HTTPS Only** - Enforced by Vercel
3. **Input Sanitization** - All inputs sanitized via toolkit
4. **No Code Execution** - Templates only, no eval()
5. **Rate Limiting** - Vercel provides DDoS protection

### Security Audit

Current status: ✅ **GOOD**
- 0 critical/high vulnerabilities
- API key authentication
- Input sanitization
- OpenTelemetry integration
- No hardcoded secrets

See [../../SECURITY.md](../../SECURITY.md) for vulnerability reporting.

## Performance

### Optimization Strategies

1. **In-Memory Cache** - Patterns loaded once at cold start
2. **Effect.Ref** - Shared state without blocking
3. **Serverless Edge** - Global CDN distribution
4. **JSON Streaming** - Large responses streamed
5. **Trace Sampling** - Configurable trace sampling rate

### Benchmarks

- Health check: < 50ms
- Pattern search: < 100ms (150+ patterns)
- Pattern retrieval: < 50ms
- Code generation: < 100ms
- Cold start: < 2s (first request after deploy)

## Troubleshooting

### Common Issues

**Server won't start**:
```bash
# Check Node version
node --version  # Should be 18+

# Reinstall dependencies
rm -rf node_modules
bun install

# Check environment variables
cat .env
```

**Authentication fails**:
```bash
# Verify API key is set
echo $PATTERN_API_KEY

# Check request header
curl -v -H "x-api-key: YOUR_KEY" http://localhost:3000/api/patterns
```

**Traces not appearing**:
```bash
# Verify OTLP endpoint is reachable
curl -X POST $OTLP_ENDPOINT \
  -H "Content-Type: application/json" \
  -H "$(echo $OTLP_HEADERS | jq -r 'to_entries[] | "-H \"\(.key): \(.value)\""')"

# Check service name
echo $SERVICE_NAME
```

## Contributing

See [../../docs/guides/CONTRIBUTING.md](../../docs/guides/CONTRIBUTING.md) for guidelines.

When contributing to the MCP server:

1. All API routes should use Effect for business logic
2. Add tests for new endpoints
3. Update OpenAPI documentation
4. Run smoke tests before deploying
5. Follow Effect best practices

## Roadmap

- [ ] OpenAPI/Swagger documentation endpoint
- [ ] GraphQL API
- [ ] WebSocket support for real-time updates
- [ ] Pattern usage analytics
- [ ] Rate limiting per API key
- [ ] Caching layer (Redis)
- [ ] Pattern versioning

## Resources

- [Effect Documentation](https://effect.website/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [OpenTelemetry JS](https://opentelemetry.io/docs/instrumentation/js/)
- [Vercel Deployment](https://vercel.com/docs)
- [Main Project](../../README.md)

## License

MIT © Paul Philp

---

**Part of the [Effect Patterns Hub](https://github.com/PaulJPhilp/Effect-Patterns)**

Questions? [Open an issue](https://github.com/PaulJPhilp/Effect-Patterns/issues/new)
