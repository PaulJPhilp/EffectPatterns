# Using the MCP Server (Beta)

**Version:** 0.5.0 (Beta)  
**Status:** Production-Ready  
**Production URL:** https://mcp-server-three-omega.vercel.app  
**Last Updated:** 2025-11-09

The MCP (Model Context Protocol) Server provides a REST API for programmatic access to Effect Patterns, enabling AI tools like Claude Code to discover and apply Effect-TS patterns.

## Quick Start

**No installation required!** The MCP server is already deployed and ready to use.

### Prerequisites

- A tool that can make HTTP requests (curl, Postman, or any HTTP client)
- The demo API key (provided below for beta testing)

### Beta API Key

During the beta period, use this shared demo key:

```bash
x-api-key: demo-beta-2025
```

**Rate Limits:** The demo key is rate-limited to 10 requests/minute (shared across all users).

**Coming in v1.0:** Self-service API key generation with higher rate limits (100 req/min per key).

### Your First Request

```bash
# Test the server (no auth required)
curl https://mcp-server-three-omega.vercel.app/api/health

# Search patterns (with demo key)
curl -H "x-api-key: demo-beta-2025" \
  "https://mcp-server-three-omega.vercel.app/api/patterns?q=retry"
```

That's it! The server is fully operational and ready to use.

## API Endpoints

### Health Check (Public)

No authentication required.

```bash
# Production URL
curl https://mcp-server-three-omega.vercel.app/api/health

# Response
{
  "ok": true,
  "version": "0.5.0",
  "service": "effect-patterns-mcp-server",
  "timestamp": "2025-11-09T22:00:00.000Z",
  "traceId": "abc123..."
}
```

### Search Patterns (Authenticated)

Search for patterns by query, category, or difficulty.

```bash
# Using curl
curl -H "x-api-key: YOUR_API_KEY" \
  "https://mcp-server-three-omega.vercel.app/api/patterns?q=retry&skillLevel=intermediate"

# Response
{
  "count": 5,
  "patterns": [
    {
      "id": "retry-with-backoff",
      "title": "Retry with Exponential Backoff",
      "description": "Implement retry logic with exponential backoff",
      "category": "error-handling",
      "difficulty": "intermediate",
      "tags": ["retry", "error-handling", "resilience"]
    },
    ...
  ],
  "traceId": "abc123..."
}
```

### Get Pattern by ID (Authenticated)

Retrieve full pattern details including code examples.

```bash
# Using curl
curl -H "x-api-key: YOUR_API_KEY" \
  https://mcp-server-three-omega.vercel.app/api/patterns/retry-with-backoff

# Response
{
  "pattern": {
    "id": "retry-with-backoff",
    "title": "Retry with Exponential Backoff",
    "description": "...",
    "examples": [
      {
        "code": "...",
        "language": "typescript"
      }
    ],
    "useCases": [...],
    "relatedPatterns": [...]
  },
  "traceId": "abc123..."
}
```

### Generate Code Snippet (Authenticated)

Generate a customized code snippet from a pattern.

```bash
# Using curl
curl -X POST https://mcp-server-three-omega.vercel.app/api/generate \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "patternId": "retry-with-backoff",
    "name": "retryHttpRequest",
    "moduleType": "esm"
  }'

# Response
{
  "patternId": "retry-with-backoff",
  "title": "Retry with Exponential Backoff",
  "snippet": "import { Effect, Schedule } from 'effect'\n\nexport const retryHttpRequest = ...",
  "timestamp": "2025-11-09T22:00:00.000Z",
  "traceId": "abc123..."
}
```

### Trace Wiring Examples (Authenticated)

Get OpenTelemetry integration examples for Effect and LangGraph.

```bash
# Using curl
curl -H "x-api-key: YOUR_API_KEY" \
  https://mcp-server-three-omega.vercel.app/api/trace-wiring

# Response
{
  "effectNodeSdk": "// Effect-TS with OpenTelemetry Node SDK\n...",
  "effectWithSpan": "// Effect-TS with custom span creation\n...",
  "langgraphPython": "# LangGraph with OpenTelemetry Python\n...",
  "notes": "...",
  "traceId": "abc123..."
}
```

## Authentication

All endpoints except `/api/health` require API key authentication.

### Methods

**Option 1: Header (Recommended)**
```bash
x-api-key: your-api-key
```

**Option 2: Query Parameter**
```bash
?key=your-api-key
```

### Beta API Key

**Current (Beta):**
```bash
x-api-key: demo-beta-2025
```

- **Rate Limit:** 10 requests/minute (shared)
- **Access:** Public beta testing
- **Valid:** Until v1.0 release

**Coming in v1.0:**
- Self-service API key generation
- Personal rate limits (100 req/min per key)
- Usage analytics dashboard
- Key rotation and management

## Using the API

The production server is fully operational and handles all requests. All examples below use the production URL.

## Architecture

### Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Runtime:** Bun 1.2.23+ or Node.js 18+
- **Effect:** 3.18+ (functional error handling)
- **OpenTelemetry:** Distributed tracing
- **TypeScript:** 5.8+ (strict mode)

### Project Structure

```
services/mcp-server/
├── app/                    # Next.js App Router
│   └── api/               # API endpoints
│       ├── health/        # Health check
│       ├── patterns/      # Pattern search and retrieval
│       ├── generate/      # Code generation
│       └── trace-wiring/  # Tracing examples
├── src/
│   ├── auth/              # API key authentication
│   ├── server/            # Server initialization
│   ├── services/          # Effect services
│   │   ├── cache.ts       # Caching service
│   │   ├── config.ts      # Configuration service
│   │   ├── logger.ts      # Logging service
│   │   ├── metrics.ts     # Metrics service
│   │   ├── rate-limit.ts  # Rate limiting service
│   │   └── validation.ts  # Validation service
│   ├── tracing/           # OpenTelemetry setup
│   └── errors.ts          # Tagged error types
├── tests/
│   └── integration/       # API integration tests
├── package.json
├── tsconfig.json
├── vercel.json
└── TESTING.md
```

### Effect Services

The server uses Effect-TS services for all core functionality:

```typescript
import { Effect } from 'effect'
import { ConfigService } from './server/init'

// All operations return Effect
const program = Effect.gen(function* () {
  const config = yield* ConfigService
  const apiKey = yield* config.getApiKey()
  // Type-safe, composable, testable
})
```

**Services:**
- **ConfigService** - Environment configuration
- **LoggerService** - Structured logging
- **CacheService** - In-memory caching with TTL
- **ValidationService** - Request validation
- **RateLimitService** - Rate limiting (sliding window)
- **MetricsService** - Prometheus-style metrics

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PATTERN_API_KEY` | Yes | - | API authentication key |
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `PATTERNS_PATH` | No | `../../data/patterns-index.json` | Pattern data file |
| `PATTERNS_CACHE_TTL_MS` | No | `300000` | Pattern cache TTL (5 min) |
| `RATE_LIMIT_ENABLED` | No | `true` | Enable rate limiting |
| `RATE_LIMIT_REQUESTS` | No | `100` | Requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window (1 min) |
| `CACHE_ENABLED` | No | `true` | Enable caching |
| `LOGGING_ENABLED` | No | `true` | Enable logging |
| `METRICS_ENABLED` | No | `true` | Enable metrics |
| `TRACING_ENABLED` | No | `false` | Enable OpenTelemetry |
| `OTLP_ENDPOINT` | No | - | OpenTelemetry endpoint |
| `OTLP_HEADERS` | No | - | OpenTelemetry headers |
| `SERVICE_NAME` | No | `effect-patterns-mcp-server` | Service name for tracing |
| `SERVICE_VERSION` | No | `0.1.0` | Service version |

### Development Configuration

```bash
# services/mcp-server/.env.local
PATTERN_API_KEY=dev-key-123
NODE_ENV=development
PORT=3000
LOGGING_ENABLED=true
METRICS_ENABLED=true
TRACING_ENABLED=false
```

### Production Configuration

```bash
# Vercel environment variables
PATTERN_API_KEY=<secure-production-key>
NODE_ENV=production
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
CACHE_ENABLED=true
TRACING_ENABLED=true
OTLP_ENDPOINT=https://your-otlp-collector.com/v1/traces
OTLP_HEADERS={"x-api-key":"your-collector-key"}
```

## Server Status

### Health Check

Check if the server is operational:

```bash
# Production health check
curl https://mcp-server-three-omega.vercel.app/api/health

# Check trace ID in headers
curl -i https://mcp-server-three-omega.vercel.app/api/health | grep x-trace-id
```

### Logs

The server uses structured JSON logging:

```json
{
  "timestamp": "2025-11-09T22:00:00.000Z",
  "level": "info",
  "message": "Pattern search successful",
  "operation": "patterns.search",
  "data": {
    "query": "retry",
    "count": 5,
    "duration": 23
  }
}
```

### Metrics

Prometheus-style metrics are available:

```bash
# Counter: HTTP requests
http_requests_total{method="GET",path="/api/patterns",status="200"} 42

# Histogram: Request duration
http_request_duration_seconds{method="GET",path="/api/patterns"} 0.023

# Gauge: Active requests
http_active_requests{method="GET",path="/api/patterns"} 3
```

### OpenTelemetry Tracing

When enabled, all requests generate traces:

```typescript
// Automatic span creation
GET /api/patterns
  ├─ patterns.search (23ms)
  │  ├─ cache.get (2ms)
  │  ├─ validation.request (1ms)
  │  └─ patterns.filter (20ms)
  └─ response.send (1ms)
```

## Troubleshooting

### Common Issues

#### "401 Unauthorized"

**Problem:** API key is missing or incorrect.

**Solution:**
- Verify your API key is correct
- Ensure you're using the correct header: `x-api-key: YOUR_KEY`
- Or use query parameter: `?key=YOUR_KEY`
- If key is expired, request a new one via GitHub issues

Example:
```bash
# Correct usage
curl -H "x-api-key: YOUR_KEY" \
  https://mcp-server-three-omega.vercel.app/api/patterns
```

#### "404 Not Found"

**Problem:** Pattern ID doesn't exist.

**Solution:**
- Search for patterns first to find valid IDs
- Pattern IDs are kebab-case (e.g., `retry-with-backoff`)
- Use the search endpoint to discover available patterns

#### "429 Too Many Requests"

**Problem:** Rate limit exceeded (100 requests per minute).

**Solution:**
- Wait for the rate limit window to reset
- Implement request throttling in your client
- Contact maintainers if you need higher limits

#### Server Not Responding

**Problem:** Production server appears down.

**Solution:**
1. Check server status: `curl https://mcp-server-three-omega.vercel.app/api/health`
2. If down, open a GitHub issue immediately
3. Check Vercel status page: https://www.vercel-status.com/

#### Invalid Response Format

**Problem:** Response doesn't match documentation.

**Solution:**
- Verify you're using the correct endpoint
- Check API version (currently v0.5.0)
- Report discrepancies via GitHub issues

## Security & Best Practices

### API Key Security

**DO:**
- ✅ Store API keys in environment variables
- ✅ Use secrets managers (e.g., GitHub Secrets, Vercel Env Vars)
- ✅ Rotate keys if compromised
- ✅ Use HTTPS only (enforced in production)

**DON'T:**
- ❌ Commit API keys to version control
- ❌ Share keys publicly
- ❌ Embed keys in client-side code
- ❌ Use the same key across multiple projects

### Rate Limits

**Beta (Current):**
- **Demo Key:** 10 requests per minute (shared across all users)
- **Enforcement:** Automatic via sliding window
- **Response:** `429 Too Many Requests` when exceeded

**v1.0 (Coming Soon):**
- **Personal Keys:** 100 requests per minute per key
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Upgrades:** Higher limits available on request

### Request Limits

- **Body Size:** 1MB maximum
- **Query Length:** 1000 characters
- **Timeout:** 30 seconds

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email the maintainers directly (add email)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

Maintainers will respond within 48 hours.

## Performance

### Caching Strategy

- **Pattern Data:** Cached for 5 minutes
- **Search Results:** Not cached (dynamic)
- **Generated Snippets:** Not cached (customized)

### Rate Limiting

- **Algorithm:** Sliding window
- **Default:** 100 requests per minute per IP
- **Configurable:** Via environment variables

### Response Times

| Endpoint | Average | P95 | P99 |
|----------|---------|-----|-----|
| `/api/health` | 5ms | 10ms | 15ms |
| `/api/patterns` (search) | 25ms | 50ms | 75ms |
| `/api/patterns/:id` | 20ms | 40ms | 60ms |
| `/api/generate` | 30ms | 60ms | 90ms |

## Roadmap

### Beta (Current - v0.5.0)

- ✅ Core API endpoints
- ✅ Shared demo API key
- ✅ Pattern search and retrieval
- ✅ Code generation
- ✅ OpenTelemetry tracing
- ✅ Comprehensive tests
- ✅ Production deployment

### v1.0 (Planned - Q1 2026)

- [ ] **Self-service API key generation** (web portal)
- [ ] **Personal rate limits** (100 req/min per key)
- [ ] **Usage analytics dashboard**
- [ ] **API key management** (rotation, revocation)
- [ ] GraphQL API
- [ ] Advanced search (fuzzy matching, semantic search)
- [ ] Pattern recommendations
- [ ] API versioning

### v1.1 (Future)

- [ ] WebSocket support for real-time updates
- [ ] Pattern contributions via API
- [ ] Pattern voting/ratings
- [ ] Batch operations
- [ ] Pattern templates
- [ ] Multi-language support

## Support

### Resources

- **Documentation:** [/services/mcp-server/TESTING.md](./services/mcp-server/TESTING.md)
- **Test Status:** [/services/mcp-server/TEST_STATUS.md](./services/mcp-server/TEST_STATUS.md)
- **Fixes Applied:** [/services/mcp-server/FIXES_APPLIED.md](./services/mcp-server/FIXES_APPLIED.md)
- **Effect-TS Docs:** https://effect.website/
- **Next.js Docs:** https://nextjs.org/docs

### Getting Help

1. **GitHub Issues:** https://github.com/PaulJPhilp/Effect-Patterns/issues
2. **Discord:** Effect-TS Discord server
3. **Email:** (Add your contact email)

### Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Production URL:** https://mcp-server-three-omega.vercel.app  
**Status:** ✅ Operational  
**Last Updated:** 2025-11-09

