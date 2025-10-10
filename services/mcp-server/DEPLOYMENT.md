# Deployment Guide - MCP Server

This guide covers deploying the Effect Patterns MCP Server to Vercel staging and production environments.

## Environment Variables

The following environment variables must be configured in Vercel:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PATTERN_API_KEY` | API key for authenticating requests | `staging-key-abc123` |
| `OTLP_ENDPOINT` | OpenTelemetry collector HTTP endpoint | `https://api.honeycomb.io/v1/traces` |
| `OTLP_HEADERS` | Headers for OTLP exporter (JSON string) | `{"x-honeycomb-team":"your-key"}` |
| `SERVICE_NAME` | Service name for traces | `effect-patterns-mcp-server-staging` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

## Vercel Setup

### 1. Install Vercel CLI

```bash
npm install -g vercel
# or
bun add -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Link Project (first time only)

```bash
cd services/mcp-server
vercel link
```

Follow the prompts to:
- Select your Vercel team
- Link to existing project or create new one
- Set the project name: `effect-patterns-mcp-server`

### 4. Configure Environment Variables

#### Option A: Via Vercel CLI

```bash
# Staging environment
vercel env add PATTERN_API_KEY staging
# Enter: your-staging-api-key

vercel env add OTLP_ENDPOINT staging
# Enter: https://api.honeycomb.io/v1/traces

vercel env add OTLP_HEADERS staging
# Enter: {"x-honeycomb-team":"your-honeycomb-api-key"}

vercel env add SERVICE_NAME staging
# Enter: effect-patterns-mcp-server-staging

# Production environment
vercel env add PATTERN_API_KEY production
# Enter: your-production-api-key

vercel env add OTLP_ENDPOINT production
# Enter: https://api.honeycomb.io/v1/traces

vercel env add OTLP_HEADERS production
# Enter: {"x-honeycomb-team":"your-honeycomb-api-key"}

vercel env add SERVICE_NAME production
# Enter: effect-patterns-mcp-server-production
```

#### Option B: Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with the appropriate environment (staging/production)

#### Option C: Via `.env` files (local only)

Create `.env.staging` and `.env.production` files (DO NOT commit these):

```bash
# .env.staging
PATTERN_API_KEY=staging-key-abc123
OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
OTLP_HEADERS={"x-honeycomb-team":"your-staging-key"}
SERVICE_NAME=effect-patterns-mcp-server-staging
```

Then pull to Vercel:
```bash
vercel env pull .env.staging
```

## Deployment

### Deploy to Staging

```bash
cd services/mcp-server

# Preview deployment (staging)
vercel

# Or with environment
vercel --env staging
```

This creates a preview deployment at: `https://effect-patterns-mcp-server-xxx.vercel.app`

### Deploy to Production

```bash
# Production deployment
vercel --prod
```

This deploys to: `https://effect-patterns-mcp-server.vercel.app`

## Post-Deployment Verification

After deployment, run the smoke tests:

```bash
# From services/mcp-server
bun run smoke-test https://your-deployment-url.vercel.app your-api-key
```

Or manually test:

```bash
# Health check (no auth required)
curl https://your-deployment-url.vercel.app/api/health

# Authenticated endpoint
curl -H "x-api-key: your-api-key" \
  https://your-deployment-url.vercel.app/api/patterns
```

## Monitoring

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Logs for specific deployment
vercel logs [deployment-url]
```

### View Traces

Traces are sent to your OTLP endpoint. View them in:
- Honeycomb: https://ui.honeycomb.io
- Jaeger: http://localhost:16686 (local)
- Your configured observability platform

### Metrics

Check Vercel dashboard for:
- Request count
- Error rate
- Response time
- Bandwidth usage

## CI/CD Integration

### GitHub Actions

The CI workflow can automatically deploy on successful builds:

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./services/mcp-server
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

Required secrets:
- `VERCEL_TOKEN`: Get from https://vercel.com/account/tokens
- `VERCEL_ORG_ID`: Found in project settings
- `VERCEL_PROJECT_ID`: Found in project settings

## Rollback

If a deployment has issues:

```bash
# List deployments
vercel ls

# Promote previous deployment to production
vercel promote [previous-deployment-url]

# Or re-deploy from a specific commit
git checkout [previous-commit]
vercel --prod
```

## Troubleshooting

### Build Failures

**Issue**: Build fails with "Cannot find module"
**Solution**: Ensure all dependencies are in `package.json`, not just dev dependencies

**Issue**: Build timeout
**Solution**: Increase build time in Vercel settings or optimize build process

### Runtime Errors

**Issue**: 500 errors on API routes
**Solution**:
1. Check Vercel logs: `vercel logs --follow`
2. Verify environment variables are set correctly
3. Check for missing dependencies

**Issue**: OTLP traces not appearing
**Solution**:
1. Verify `OTLP_ENDPOINT` is correct
2. Check `OTLP_HEADERS` JSON is valid
3. Ensure network allows outbound HTTPS to collector

### Performance Issues

**Issue**: Slow cold starts
**Solution**:
1. Increase function memory in `vercel.json`
2. Use Edge Functions for faster cold starts
3. Implement caching for pattern data

## Cost Optimization

- Use Vercel's free tier for staging
- Monitor bandwidth and function execution time
- Implement caching headers for static responses
- Use Edge Functions for frequently accessed endpoints

## Security Checklist

- ✅ All secrets stored in Vercel env vars, not in code
- ✅ API key authentication enabled on all protected routes
- ✅ CORS configured if serving browser clients
- ✅ Rate limiting enabled (if applicable)
- ✅ HTTPS enforced (automatic on Vercel)
- ✅ Dependencies regularly updated
- ✅ No sensitive data in logs or traces

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [OpenTelemetry on Vercel](https://opentelemetry.io/docs/instrumentation/js/getting-started/nodejs/)
