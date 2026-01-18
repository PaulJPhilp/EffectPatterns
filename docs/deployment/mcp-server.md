# MCP Server Deployment Guide

This guide covers deployment of the Effect Patterns MCP (Model Context Protocol) servers that provide Effect-TS pattern search and generation capabilities to Claude Code IDE.

## Overview

The project includes an MCP server:

1. **mcp-server** - Next.js web API server (deployed to Vercel)

The server provides MCP tools and APIs for both remote and local usage.

## Prerequisites

- Node.js 18+ 
- Bun package manager
- Effect Patterns repository access
- API key for authentication

## Environment Variables

### Required for Both Servers

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@host:port/database"

# MCP Authentication
PATTERN_API_KEY_PRODUCTION="your_production_api_key"
PATTERN_API_KEY_STAGING="your_staging_api_key"

# Effect Services
EFFECT_OTEL_SERVICE_NAME="effect-patterns-mcp"
EFFECT_OTEL_SERVICE_VERSION="0.5.0"
```

### Additional for Production (mcp-server)

```bash
# OpenTelemetry (for observability)
OTEL_EXPORTER_OTLP_ENDPOINT="https://your-otlp-collector.com"
OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer your_token"

# Next.js
NEXT_PUBLIC_API_URL="https://effect-patterns-mcp.vercel.app"
```

## Local Development Setup

### 1. Install Dependencies

```bash
# Clone repository
git clone https://github.com/PaulJPhilp/EffectPatterns.git
cd Effect-Patterns

# Install dependencies
bun install

# Build workspace packages
bun run build
```

### 2. Environment Setup

Create `.env.local` file:

```bash
# Database
DATABASE_URL="postgresql://localhost:5432/effect_patterns"

# API Keys (get from maintainers)
PATTERN_API_KEY_PRODUCTION="your_api_key"

# Optional: Local OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"
```

### 3. Database Setup

```bash
# Run database migrations
bun run ep:admin migrate

# Load pattern data
bun run ep:admin ingest pipeline
```

### 4. Run Servers

#### Web API Server (Next.js)

```bash
cd packages/mcp-server
bun run dev
```

## Production Deployment

### Method 1: Vercel (Recommended for mcp-server)

#### 1. Install Vercel CLI

```bash
bun i -g vercel
```

#### 2. Configure Environment

```bash
cd packages/mcp-server
vercel env add DATABASE_URL production
vercel env add PATTERN_API_KEY_PRODUCTION production
vercel env add OTEL_EXPORTER_OTLP_ENDPOINT production
```

#### 3. Deploy

```bash
vercel --prod
```

#### 4. Verify Deployment

```bash
# Health check
curl https://effect-patterns-mcp.vercel.app/api/health

# Test MCP endpoint
curl -H "Authorization: Bearer your_api_key" \
     https://effect-patterns-mcp.vercel.app/api/patterns
```

### Method 2: Docker (for self-hosting)

#### 1. Build Docker Image

```dockerfile
# Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY . .
RUN bun run build

FROM base AS runner
COPY --from=builder /app/packages/mcp-server/dist ./dist
COPY --from=builder /app/packages/mcp-server/package.json ./
COPY --from=builder /app/packages/mcp-server/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "start"]
```

#### 2. Build and Run

```bash
# Build image
docker build -t effect-patterns-mcp .

# Run with environment
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e PATTERN_API_KEY_PRODUCTION="..." \
  effect-patterns-mcp
```

### Method 3: Cloud Run (Alternative to Vercel)

#### 1. Build Container

```bash
gcloud builds submit --tag gcr.io/project/effect-patterns-mcp .
```

#### 2. Deploy

```bash
gcloud run deploy effect-patterns-mcp \
  --image gcr.io/project/effect-patterns-mcp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=...,PATTERN_API_KEY_PRODUCTION=...
```

## Monitoring and Observability

### Health Checks

Both servers expose health endpoints:

```bash
# Web API
GET /api/health

# Response
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-12T03:00:00.000Z"
}
```

### OpenTelemetry Integration

The servers automatically emit metrics and traces:

- **Metrics**: Request counts, response times, error rates
- **Traces**: Database queries, MCP tool executions
- **Logs**: Structured logs with correlation IDs

Configure your OpenTelemetry collector:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4317

processors:
  batch:

exporters:
  otlp:
    endpoint: "your-otlp-service"
  
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

### Rate Limiting

Production servers include rate limiting:

- **Default**: 100 requests per 15 minutes per IP
- **API Key**: Higher limits for authenticated requests
- **Burst**: Allows short bursts above the limit

Configure custom limits:

```typescript
// packages/mcp-server/src/services/rate-limit.ts
export const RATE_LIMITS = {
  default: { requests: 100, window: 15 * 60 * 1000 },
  authenticated: { requests: 1000, window: 15 * 60 * 1000 }
}
```

## Security Considerations

### API Key Management

1. **Generate strong keys** using cryptographic randomness
2. **Rotate keys** regularly (every 90 days)
3. **Use different keys** for staging vs production
4. **Store securely** in environment variables, not code

### Database Security

1. **Use SSL** connections in production
2. **Limit database user** permissions (read-only for MCP)
3. **Connection pooling** to prevent exhaustion
4. **Regular backups** of pattern data

### Network Security

1. **HTTPS only** for production endpoints
2. **CORS configuration** for allowed origins
3. **Request validation** and sanitization
4. **DDS protection** via rate limiting

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check connection string format
echo $DATABASE_URL

# Test connectivity
psql $DATABASE_URL -c "SELECT 1"
```

#### 2. API Key Authentication Failed

```bash
# Verify key format
curl -H "Authorization: Bearer your_key" \
     https://your-server/api/health

# Check environment variable
echo $PATTERN_API_KEY_PRODUCTION
```

#### 3. Module Resolution Errors

```bash
# Rebuild workspace packages
bun run clean
bun run build

# Reinstall dependencies
rm -rf node_modules packages/*/node_modules
bun install
```

#### 4. Memory Issues

```bash
# Check Node.js memory usage
node --max-old-space-size=4096 packages/mcp-server/dist/index.js

# Monitor with tools
pm2 monit
```

### Debug Mode

Enable debug logging:

```bash
# Environment variables
DEBUG=effect-patterns:*
LOG_LEVEL=debug

# Run with debug
bun run dev
```

### Performance Monitoring

```bash
# Built-in metrics endpoint
curl https://your-server/api/metrics

# Response time monitoring
curl -w "@curl-format.txt" -o /dev/null -s \
     https://your-server/api/patterns
```

## Scaling Considerations

### Horizontal Scaling

- **Web API**: Use Vercel's automatic scaling or load balancer
- **Database**: Use connection pooling and read replicas
- **Caching**: Implement Redis for frequently accessed patterns

### Vertical Scaling

- **Memory**: Monitor and adjust Node.js heap size
- **CPU**: Profile and optimize MCP tool execution
- **I/O**: Use SSD storage for database

### Caching Strategy

```typescript
// In-memory cache for pattern metadata
const patternCache = new Map<string, Pattern>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Cache invalidation on pattern updates
function invalidateCache(patternId: string) {
  patternCache.delete(patternId);
}
```

## Rollback Strategy

### Quick Rollback (Vercel)

```bash
# List deployments
vercel list

# Rollback to previous version
vercel rollback [deployment-url]
```

### Database Rollback

```bash
# Create backup before changes
pg_dump $DATABASE_URL > backup.sql

# Restore if needed
psql $DATABASE_URL < backup.sql
```

### Configuration Rollback

```bash
# Use git to revert config changes
git checkout HEAD~1 -- packages/mcp-server/.env.production

# Redeploy with old config
vercel --prod
```

## Support and Maintenance

### Regular Tasks

1. **Weekly**: Monitor error rates and performance metrics
2. **Monthly**: Rotate API keys and update dependencies
3. **Quarterly**: Review and update security configurations
4. **Annually**: Audit access logs and user permissions

### Getting Help

- **Documentation**: Check this guide and API docs
- **Issues**: Report bugs on GitHub Issues
- **Security**: Report security issues privately
- **Community**: Join discussions in GitHub Discussions

### Contact Information

- **Maintainer**: Paul Philp
- **Repository**: https://github.com/PaulJPhilp/EffectPatterns
- **Documentation**: https://github.com/PaulJPhilp/EffectPatterns/blob/main/README.md
- **Support**: Create GitHub issue with detailed description

---

*Last updated: January 2026*
