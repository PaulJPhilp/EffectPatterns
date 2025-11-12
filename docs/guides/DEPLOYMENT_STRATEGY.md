# Deployment Strategy - Effect Patterns Hub

## Overview

The Effect Patterns Hub is a monorepo containing multiple services and applications that require coordinated deployment. This document outlines the deployment strategy for production and staging environments.

## Architecture Overview

### Services & Applications

1. **Pattern Server** (`server/`) - HTTP API server serving pattern data
2. **MCP Server** (`services/mcp-server/`) - Model Context Protocol server for AI tool integration
3. **Code Assistant** (`app/code-assistant/`) - AI-powered coding platform
4. **Web Application** (`app/web/`) - Pattern browsing and documentation site
5. **Toolkit** (`packages/toolkit/`) - Shared Effect-TS utilities

### Current Deployment Status

- **Pattern Server**: Vercel serverless functions (legacy)
- **MCP Server**: Vercel serverless functions (production-ready)
- **Code Assistant**: Next.js app with Vercel deployment
- **Web Application**: Next.js app (needs deployment setup)
- **Toolkit**: NPM package (needs publishing setup)

## Deployment Environments

### Staging Environment
- **URL**: `https://effect-patterns-staging.vercel.app`
- **Purpose**: Pre-production testing and validation
- **Services**: All services deployed to staging first

### Production Environment
- **URL**: `https://effect-patterns.vercel.app`
- **Purpose**: Live production environment
- **Services**: All services deployed after staging validation

## Service-Specific Deployment Strategies

### 1. Pattern Server (`server/`)

**Current Status**: Legacy Vercel deployment
**Recommended Action**: Migrate to MCP Server architecture

**Deployment Strategy**:
- **Platform**: Vercel Serverless Functions
- **Build**: TypeScript compilation with Bun
- **Routes**: REST API endpoints (`/health`, `/api/patterns/*`)
- **Environment Variables**: None required (static data)

**Migration Plan**:
1. Deprecate legacy pattern server
2. Migrate all functionality to MCP Server
3. Update client applications to use MCP Server endpoints
4. Remove legacy server after migration complete

### 2. MCP Server (`services/mcp-server/`)

**Current Status**: Production-ready with comprehensive testing
**Deployment Strategy**:
- **Platform**: Vercel Serverless Functions
- **Build**: TypeScript with Effect-TS
- **Routes**: REST API endpoints + MCP protocol support
- **Environment Variables**:
  - `PATTERN_API_KEY`: Authentication key
  - `OTLP_ENDPOINT`: OpenTelemetry collector
  - `OTLP_HEADERS`: OTLP authentication
  - `SERVICE_NAME`: Service identification

**CI/CD Pipeline**:
```yaml
# .github/workflows/deploy-mcp-server.yml
name: Deploy MCP Server
on:
  push:
    branches: [main, feat/foundation-cleanup]
    paths: ['services/mcp-server/**']
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run typecheck
      - run: bun test
  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/feat/foundation-cleanup'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_MCP_SERVER_PROJECT_ID }}
          working-directory: services/mcp-server
          vercel-args: '--prod'
  deploy-production:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_MCP_SERVER_PROJECT_ID }}
          working-directory: services/mcp-server
          vercel-args: '--prod'
```

### 3. Code Assistant (`app/code-assistant/`)

**Current Status**: Next.js application with AI SDK integration
**Deployment Strategy**:
- **Platform**: Vercel (recommended) or Railway
- **Build**: Next.js with AI SDK
- **Features**: Dual-mode architecture (Chat + Task modes)
- **Environment Variables**:
  - `OPENAI_API_KEY`: OpenAI API access
  - `ANTHROPIC_API_KEY`: Claude API access
  - `SUPERMEMORY_API_KEY`: Memory integration
  - `GITHUB_CLIENT_ID/SECRET`: OAuth authentication
  - `POSTGRES_URL`: Database connection
  - `SANDBOX_VERCEL_*`: Sandbox execution

**Deployment Configuration**:
```json
// vercel.json
{
  "buildCommand": "cd app/code-assistant && pnpm build",
  "outputDirectory": "app/code-assistant/.next",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### 4. Web Application (`app/web/`)

**Current Status**: Next.js application (needs setup)
**Deployment Strategy**:
- **Platform**: Vercel
- **Build**: Next.js static generation
- **Purpose**: Pattern documentation and browsing
- **Environment Variables**: None required (static content)

### 5. Toolkit Package (`packages/toolkit/`)

**Current Status**: NPM package (needs publishing)
**Deployment Strategy**:
- **Platform**: NPM Registry
- **Build**: TypeScript compilation
- **Publishing**: Automated via GitHub Actions

**Publishing Workflow**:
```yaml
# .github/workflows/publish-toolkit.yml
name: Publish Toolkit
on:
  release:
    types: [published]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: npm publish
        working-directory: packages/toolkit
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Infrastructure & Orchestration

### Container Strategy

For services requiring more complex deployment:

```dockerfile
# services/mcp-server/Dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3001
CMD ["bun", "run", "start"]
```

### Kubernetes Manifests (Future)

For production scaling:

```yaml
# k8s/mcp-server-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: effect-patterns/mcp-server:latest
        ports:
        - containerPort: 3001
        env:
        - name: PATTERN_API_KEY
          valueFrom:
            secretKeyRef:
              name: mcp-server-secrets
              key: pattern-api-key
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Environment Management

### Secret Management

**Vercel Secrets** (Current):
- Environment variables stored in Vercel dashboard
- Separate secrets for staging/production
- Automatic injection during build

**Future: External Secret Management**:
- AWS Secrets Manager or HashiCorp Vault
- Kubernetes secrets
- Environment-specific secret rotation

### Configuration Strategy

```typescript
// config/environments.ts
export const environments = {
  staging: {
    mcpServer: {
      url: 'https://effect-patterns-mcp-staging.vercel.app',
      apiKey: process.env.PATTERN_API_KEY_STAGING,
    },
    codeAssistant: {
      url: 'https://effect-patterns-code-assistant-staging.vercel.app',
    },
  },
  production: {
    mcpServer: {
      url: 'https://effect-patterns-mcp.vercel.app',
      apiKey: process.env.PATTERN_API_KEY_PRODUCTION,
    },
    codeAssistant: {
      url: 'https://effect-patterns-code-assistant.vercel.app',
    },
  },
} as const;
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run typecheck
      - run: bun run test:all
      - run: bun run lint:all

  deploy-mcp-server:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_MCP_SERVER_PROJECT_ID }}
          working-directory: services/mcp-server
          vercel-args: '--prod'

  deploy-patterns-chat-app:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PATTERNS_CHAT_APP_PROJECT_ID }}
          working-directory: app/patterns-chat-app
          vercel-args: '--prod'

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_WEB_PROJECT_ID }}
          working-directory: app/web
          vercel-args: '--prod'

  health-check:
    needs: [deploy-mcp-server, deploy-patterns-chat-app, deploy-web]
    runs-on: ubuntu-latest
    steps:
      - run: |
          # Health check all services
          curl -f https://effect-patterns-mcp.vercel.app/health
          curl -f https://effect-patterns-patterns-chat-app.vercel.app/api/health
          curl -f https://effect-patterns-web.vercel.app/

  notify:
    needs: health-check
    runs-on: ubuntu-latest
    if: always()
    steps:
      - uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Monitoring & Observability

### Application Monitoring

**OpenTelemetry Integration** (MCP Server):
- Traces: Request/response tracing
- Metrics: Performance and error metrics
- Logs: Structured logging with correlation IDs

**Vercel Analytics**:
- Request metrics and performance
- Error tracking
- Real user monitoring

### Health Checks

**Service Health Endpoints**:
- `/health`: Basic health check
- `/health/detailed`: Comprehensive health check
- `/metrics`: Prometheus metrics (future)

**Automated Health Monitoring**:
```bash
# Health check script
#!/bin/bash
services=(
  "https://effect-patterns-mcp.vercel.app/health"
  "https://effect-patterns-code-assistant.vercel.app/api/health"
  "https://effect-patterns-web.vercel.app/api/health"
)

for service in "${services[@]}"; do
  if ! curl -f -s "$service" > /dev/null; then
    echo "❌ $service is unhealthy"
    exit 1
  fi
done

echo "✅ All services are healthy"
```

## Rollback Strategy

### Automated Rollback

**Vercel Rollback**:
1. Failed deployment automatically rolls back
2. Manual rollback via Vercel dashboard
3. Git-based rollback to previous commit

**Database Rollback**:
- Schema migrations with rollback scripts
- Data backup before deployments
- Point-in-time recovery

### Manual Rollback Procedures

1. **Immediate Rollback**:
   ```bash
   # Rollback to previous deployment
   vercel rollback
   ```

2. **Git-based Rollback**:
   ```bash
   # Revert to previous commit
   git revert HEAD
   git push origin main
   ```

3. **Environment-specific Rollback**:
   ```bash
   # Rollback specific service
   vercel rollback --project mcp-server
   ```

## Scaling Strategy

### Current Scaling (Vercel)

- **Serverless**: Automatic scaling based on request volume
- **Global CDN**: Edge network for low latency
- **Pay-per-request**: Cost scales with usage

### Future Scaling Considerations

**Service-specific Scaling**:
- **MCP Server**: High-throughput API, consider Railway or AWS Lambda
- **Code Assistant**: AI-intensive, may need GPU instances
- **Web App**: Static content, CDN optimization

**Database Scaling**:
- Connection pooling
- Read replicas
- Caching layers (Redis/Memcached)

## Security Considerations

### API Security

- **Authentication**: API keys for service-to-service communication
- **Authorization**: Role-based access control
- **Rate Limiting**: Request throttling per client
- **CORS**: Configured for allowed origins

### Infrastructure Security

- **Secrets Management**: Environment variables, never in code
- **Network Security**: VPC isolation (future)
- **SSL/TLS**: Automatic HTTPS via Vercel
- **Dependency Scanning**: Automated vulnerability checks

## Cost Optimization

### Vercel Pricing

- **Hobby Plan**: Free tier for development
- **Pro Plan**: $20/month for production
- **Enterprise**: Custom pricing for high usage

### Cost Monitoring

- **Usage Alerts**: Set up billing alerts
- **Resource Optimization**: Monitor function execution times
- **Caching Strategy**: Implement appropriate caching layers

## Migration Plan

### Phase 1: Infrastructure Setup (Week 1-2)
- [ ] Set up Vercel projects for all services
- [ ] Configure environment variables
- [ ] Set up CI/CD pipelines
- [ ] Implement health checks

### Phase 2: Service Migration (Week 3-4)
- [ ] Deploy MCP Server to staging
- [ ] Deploy Code Assistant to staging
- [ ] Deploy Web App to staging
- [ ] Test integration between services

### Phase 3: Production Deployment (Week 5-6)
- [ ] Deploy all services to production
- [ ] Set up monitoring and alerting
- [ ] Implement rollback procedures
- [ ] Performance optimization

### Phase 4: Legacy Cleanup (Week 7-8)
- [ ] Migrate clients from legacy Pattern Server
- [ ] Deprecate and remove legacy server
- [ ] Update documentation
- [ ] Final security audit

## Success Metrics

### Deployment Success Criteria
- [ ] All services deploy successfully without errors
- [ ] Health checks pass for all services
- [ ] AI SDK E2E tests pass in staging/production
- [ ] Response times < 500ms for API endpoints
- [ ] 99.9% uptime for critical services

### Performance Benchmarks
- **MCP Server**: < 200ms average response time
- **Code Assistant**: < 2s for AI responses
- **Web App**: < 100ms for static pages

### Monitoring KPIs
- Error rate < 0.1%
- 95th percentile latency < 1000ms
- Successful deployment rate > 95%

This deployment strategy provides a comprehensive plan for deploying the Effect Patterns Hub to production while maintaining high availability, security, and performance standards.