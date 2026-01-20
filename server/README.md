# Effect Patterns Server

Production-ready HTTP API server for serving Effect-TS patterns and rules.

## Overview

This is a standalone Node.js HTTP server built with Effect-TS that provides the same API as the Vercel serverless function. It's designed for local development, testing, and self-hosted deployments.

## Features

- **Production-Ready**: Comprehensive error handling, proper HTTP status codes
- **Effect-Based**: Built with `@effect/platform` for type-safe HTTP handling
- **Security**: Rate limiting, CORS, security headers
- **Observability**: Structured logging, request tracing, metrics
- **Graceful Shutdown**: Proper signal handling and cleanup

## Quick Start

### Development

```bash
# Run server in development mode
bun run server:dev
```

### Production

```bash
# Build and run in production
NODE_ENV=production bun server/index.ts

# Or with custom port
PORT=8080 NODE_ENV=production bun server/index.ts
```

## Configuration

### Environment Variables

```bash
# Server configuration
PORT=3001                    # Server port (default: 3001)
HOST=localhost               # Server host (default: localhost)
NODE_ENV=development         # Environment: development|staging|production
LOG_LEVEL=info              # Logging: debug|info|warn|error

# Database
DATABASE_URL=postgresql://user:password@host:5432/effect_patterns
```

### Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP per window
- **Storage**: In-memory Map (use Redis in production)

## API Endpoints

### Health Check

```bash
GET /health
```

### List All Rules

```bash
GET /api/v1/rules
```

### Get Single Rule

```bash
GET /api/v1/rules/{id}
```

## Architecture

```text
HTTP Request
    ↓
Rate Limiter (per IP)
    ↓
Effect Router
    ↓
Effect Handler (with validation)
    ↓
Database Client
    ↓
Effect Pattern Repository
    ↓
PostgreSQL Database
    ↓
JSON Response
```

## Services

### RateLimiter

Tracks request counts per IP with sliding window expiration.

### MetricsService

Collects request metrics for monitoring and observability.

### Logger

Structured logging with request correlation IDs.

## Error Handling

- **429**: Rate limit exceeded
- **500**: Database connection or internal error
- **404**: Pattern/rule not found
- **400**: Invalid request parameters

## Testing

### Unit Tests

```bash
bun run test:server
```

### Integration Tests

```bash
# Start server in background
bun run server:dev &

# Run integration tests
bun run test:e2e
```

## Deployment Options

### Self-Hosted

```bash
# Using Docker
docker build -t effect-patterns-server .
docker run -p 3001:3001 effect-patterns-server

# Using PM2
pm2 start server/index.ts --name "effect-patterns-server"
```

### Cloud Platforms

Deploy to any Node.js hosting platform:

- AWS EC2/ECS
- Google Cloud Run
- Azure App Service
- DigitalOcean App Platform

## Monitoring

### Health Checks

- `/health` endpoint for load balancers
- Structured logs with correlation IDs
- Request metrics and rate limiting stats

### Metrics

The server exposes metrics for:

- Request count by endpoint
- Response times
- Error rates
- Rate limit violations

## Development Tools

### Hot Reload

```bash
bun --watch server/index.ts
```

### Debug Mode

```bash
LOG_LEVEL=debug bun run server:dev
```

## Security

- **Rate Limiting**: Prevents abuse (100 req/15min per IP)
- **CORS**: Configurable for web clients
- **Security Headers**: HSTS, CSP, etc.
- **Input Validation**: Effect Schema validation

## Performance

- **Concurrent**: Handles multiple requests simultaneously
- **Memory Efficient**: Effect's resource management
- **Fast**: Optimized database queries and response handling

## Comparison with Vercel API

| Feature | Server | Vercel API |
| --------- | -------- | ------------ |
| Deployment | Self-hosted | Serverless |
| Cold Start | None | Yes |
| Cost | Fixed | Per-request |
| Control | Full | Limited |
| Scaling | Manual | Automatic |

Choose the server for:

- Local development
- Self-hosting
- Full control over infrastructure
- Cost predictability

Choose Vercel API for:

- Serverless deployment
- Automatic scaling
- Managed infrastructure
- Pay-per-use pricing
