# MCP Server - Quick Start Guide

**No Installation Required!**

The MCP Server is already deployed and ready to use.

## Production URL

```
https://mcp-server-three-omega.vercel.app
```

## Get Started in 2 Minutes

### 1. Get Your API Key

**Beta Access:** During the beta period, we're providing a shared demo key for testing:

```bash
DEMO_KEY="demo-beta-2025"
```

**Rate Limits:** The demo key has reduced limits (10 requests/minute). For production use or higher limits, contact maintainers.

**Coming Soon:** Self-service API key generation will be available in v1.0.

### 2. Test the Server

```bash
# Health check (no auth required)
curl https://mcp-server-three-omega.vercel.app/api/health

# Should return:
# { "ok": true, "version": "0.5.0", ... }
```

### 3. Use the API

```bash
# Search patterns
curl -H "x-api-key: demo-beta-2025" \
  "https://mcp-server-three-omega.vercel.app/api/patterns?q=retry"

# Get specific pattern
curl -H "x-api-key: demo-beta-2025" \
  https://mcp-server-three-omega.vercel.app/api/patterns/retry-with-backoff

# Generate code snippet
curl -X POST https://mcp-server-three-omega.vercel.app/api/generate \
  -H "x-api-key: demo-beta-2025" \
  -H "Content-Type: application/json" \
  -d '{"patternId":"retry-with-backoff","name":"retryRequest"}'

# Get tracing examples
curl -H "x-api-key: demo-beta-2025" \
  https://mcp-server-three-omega.vercel.app/api/trace-wiring
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Server status |
| `/api/patterns` | GET | Yes | Search patterns |
| `/api/patterns/:id` | GET | Yes | Get pattern details |
| `/api/generate` | POST | Yes | Generate code snippet |
| `/api/trace-wiring` | GET | Yes | Tracing examples |

## Query Parameters

**Search Patterns:**
```bash
# By query
?q=retry

# By skill level
?skillLevel=intermediate

# By use case
?useCase=error-handling

# Multiple filters
?q=retry&skillLevel=intermediate&useCase=error-handling

# Limit results
?limit=10
```

## Authentication

Two methods supported:

**1. Header (Recommended):**
```bash
curl -H "x-api-key: YOUR_KEY" https://mcp-server-three-omega.vercel.app/api/patterns
```

**2. Query Parameter:**
```bash
curl "https://mcp-server-three-omega.vercel.app/api/patterns?key=YOUR_KEY"
```

## Rate Limits (Beta)

**Demo Key:**
- **Limit:** 10 requests per minute
- **Shared:** All beta users share this limit

**Production (Coming Soon):**
- **Limit:** 100 requests per minute per API key
- **Self-service:** Generate your own keys
- **Response:** `429 Too Many Requests` when exceeded
- **Headers:** Check `X-RateLimit-*` headers for limits

## Common Issues

**401 Unauthorized:**
- Check your API key is correct
- Verify header format: `x-api-key: YOUR_KEY`

**404 Not Found:**
- Pattern ID doesn't exist
- Use search endpoint to find valid IDs

**429 Too Many Requests:**
- You've exceeded the rate limit
- Wait 60 seconds or implement request throttling

## Documentation

- **Full Setup:** [/MCP_SERVER_SETUP.md](../../MCP_SERVER_SETUP.md)
- **Testing:** [TESTING.md](./TESTING.md)
- **Status:** [TEST_STATUS.md](./TEST_STATUS.md)

---

**Questions?** Open an issue on GitHub

