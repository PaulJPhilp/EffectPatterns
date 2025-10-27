# Deployment Checklist - Effect Patterns Hub

## Pre-Deployment Setup

### Vercel Projects Configuration
- [ ] Create Vercel account and organization
- [ ] Create separate projects for each service:
  - [ ] `effect-patterns-mcp` (MCP Server)
  - [ ] `effect-patterns-code-assistant` (Code Assistant)
  - [ ] `effect-patterns-web` (Web Application)
- [ ] Configure custom domains (optional):
  - [ ] `mcp.effect-patterns.dev`
  - [ ] `code.effect-patterns.dev`
  - [ ] `app.effect-patterns.dev`

### Environment Variables Setup

#### MCP Server Environment Variables
```bash
# Required for all environments
PATTERN_API_KEY=your-secret-api-key-here
OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTLP_HEADERS=
SERVICE_NAME=effect-patterns-mcp-server
NODE_ENV=production
```

#### Code Assistant Environment Variables
```bash
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Authentication
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Database
POSTGRES_URL=postgresql://...

# Security
JWE_SECRET=...
ENCRYPTION_KEY=...

# Sandbox (Optional)
SANDBOX_VERCEL_TEAM_ID=...
SANDBOX_VERCEL_PROJECT_ID=...
SANDBOX_VERCEL_TOKEN=...
```

### GitHub Secrets Configuration
- [ ] `VERCEL_TOKEN`: Vercel API token
- [ ] `VERCEL_ORG_ID`: Vercel organization ID
- [ ] `VERCEL_MCP_SERVER_PROJECT_ID`: MCP Server project ID
- [ ] `VERCEL_CODE_ASSISTANT_PROJECT_ID`: Code Assistant project ID
- [ ] `VERCEL_WEB_PROJECT_ID`: Web App project ID
- [ ] `SLACK_WEBHOOK`: Slack notification webhook (optional)

## Service-Specific Deployment Preparation

### MCP Server (`services/mcp-server/`)
- [ ] Verify OpenTelemetry configuration
- [ ] Test health endpoint locally: `curl http://localhost:3001/health`
- [ ] Ensure all dependencies are production-ready
- [ ] Validate Effect-TS patterns and error handling

### Code Assistant (`app/code-assistant/`)
- [ ] Set up database (Neon PostgreSQL recommended)
- [ ] Configure AI provider API keys
- [ ] Test authentication flow (GitHub OAuth)
- [ ] Verify Supermemory integration
- [ ] Test both Chat and Task modes

### Web Application (`app/web/`)
- [ ] Build static site generation
- [ ] Configure content sources
- [ ] Test pattern browsing functionality
- [ ] Verify responsive design

## CI/CD Pipeline Setup

### GitHub Actions Workflows
- [ ] Create `.github/workflows/` directory
- [ ] Set up `deploy-mcp-server.yml` for MCP Server
- [ ] Set up `deploy.yml` for full production deployment
- [ ] Configure branch protection rules:
  - [ ] Require status checks to pass
  - [ ] Require up-to-date branches
  - [ ] Include administrators in restrictions

### Testing Pipeline
- [ ] Ensure all tests pass locally:
  - [ ] `bun run test:all`
  - [ ] `bun run lint:all`
  - [ ] `bun run typecheck`
- [ ] Set up test coverage reporting
- [ ] Configure test result notifications

## Staging Environment Deployment

### Phase 1: Individual Service Deployment
- [ ] Deploy MCP Server to staging
  - [ ] Run: `bun run deploy:mcp-server`
  - [ ] Verify health check: `curl https://effect-patterns-mcp-staging.vercel.app/health`
- [ ] Deploy Code Assistant to staging
  - [ ] Run: `bun run deploy:code-assistant`
  - [ ] Test authentication and basic functionality
- [ ] Deploy Web App to staging
  - [ ] Run: `bun run deploy:web`
  - [ ] Verify content loading and navigation

### Phase 2: Integration Testing
- [ ] Test service-to-service communication
- [ ] Verify API endpoints work correctly
- [ ] Test end-to-end user flows
- [ ] Run AI SDK E2E tests against staging
- [ ] Execute health check script: `bun run health-check`

## Production Environment Deployment

### Pre-Production Checklist
- [ ] All staging tests pass
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Backup of production data (if applicable)
- [ ] Rollback plan documented and tested

### Production Deployment
- [ ] Merge to `main` branch (triggers automatic deployment)
- [ ] Monitor deployment progress in GitHub Actions
- [ ] Verify all services are healthy
- [ ] Test critical user flows
- [ ] Monitor error rates and performance

### Post-Deployment Validation
- [ ] Run comprehensive health checks
- [ ] Monitor application logs for errors
- [ ] Verify analytics and monitoring are working
- [ ] Test user-facing functionality
- [ ] Update documentation with new URLs

## Monitoring & Observability Setup

### Application Monitoring
- [ ] Set up OpenTelemetry for MCP Server
- [ ] Configure Vercel Analytics for all services
- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure performance monitoring

### Infrastructure Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure alerting for:
  - [ ] Service downtime
  - [ ] High error rates
  - [ ] Performance degradation
- [ ] Set up log aggregation and analysis

### Business Monitoring
- [ ] Set up user analytics (Vercel Analytics, Google Analytics)
- [ ] Configure conversion tracking
- [ ] Set up custom dashboards for KPIs

## Rollback Procedures

### Automated Rollback
- [ ] Test rollback functionality in staging
- [ ] Document rollback commands for each service
- [ ] Set up automated rollback on deployment failure

### Manual Rollback Steps
1. **Immediate Rollback**:
   ```bash
   # Rollback all services
   bun run rollback

   # Or rollback individual services
   bun run rollback:mcp-server
   bun run rollback:code-assistant
   bun run rollback:web
   ```

2. **Git-based Rollback**:
   ```bash
   # Create revert commit
   git revert HEAD
   git push origin main
   ```

3. **Environment-specific Rollback**:
   - Use Vercel dashboard for point-in-time rollback
   - Restore from backup if database changes are involved

## Security Hardening

### API Security
- [ ] Implement rate limiting
- [ ] Set up API key rotation
- [ ] Configure CORS policies
- [ ] Enable request logging and monitoring

### Infrastructure Security
- [ ] Review and update dependencies
- [ ] Enable security headers
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules

### Access Control
- [ ] Set up team access controls in Vercel
- [ ] Configure GitHub repository permissions
- [ ] Enable branch protection rules
- [ ] Set up audit logging

## Performance Optimization

### Frontend Optimization
- [ ] Enable Vercel Edge Functions where appropriate
- [ ] Implement caching strategies
- [ ] Optimize bundle sizes
- [ ] Set up CDN configuration

### Backend Optimization
- [ ] Implement connection pooling
- [ ] Set up database query optimization
- [ ] Configure appropriate timeouts
- [ ] Implement request queuing for high load

### Database Optimization
- [ ] Set up database indexes
- [ ] Configure connection limits
- [ ] Implement query result caching
- [ ] Set up read replicas if needed

## Documentation Updates

### Internal Documentation
- [ ] Update deployment runbooks
- [ ] Document troubleshooting procedures
- [ ] Create incident response playbook
- [ ] Update team onboarding materials

### External Documentation
- [ ] Update README with deployment information
- [ ] Create user-facing status page
- [ ] Update API documentation
- [ ] Publish release notes

## Success Metrics Validation

### Technical Metrics
- [ ] Response times < 500ms for API endpoints
- [ ] Error rate < 0.1%
- [ ] 99.9% uptime achieved
- [ ] All health checks passing

### Business Metrics
- [ ] User adoption targets met
- [ ] Performance benchmarks achieved
- [ ] Cost optimization goals met
- [ ] Stakeholder satisfaction confirmed

## Post-Deployment Activities

### Week 1 Monitoring
- [ ] 24/7 monitoring for first week
- [ ] Daily health check reviews
- [ ] Performance trend analysis
- [ ] User feedback collection

### Month 1 Review
- [ ] Comprehensive performance review
- [ ] Cost analysis and optimization
- [ ] User experience assessment
- [ ] Feature usage analytics

### Continuous Improvement
- [ ] Set up regular deployment cadence
- [ ] Implement automated testing improvements
- [ ] Plan for scaling and feature additions
- [ ] Establish feedback loops for improvements

---

## Emergency Contacts

**Technical Lead**: [Name] - [Contact]
**DevOps/SRE**: [Name] - [Contact]
**Product Owner**: [Name] - [Contact]
**Vercel Support**: https://vercel.com/support
**GitHub Support**: https://github.com/support

## Useful Commands

```bash
# Health checks
bun run health-check

# Individual deployments
bun run deploy:mcp-server
bun run deploy:code-assistant
bun run deploy:web

# Rollbacks
bun run rollback:mcp-server
bun run rollback:code-assistant
bun run rollback:web

# Monitoring
vercel logs --follow
vercel analytics
```

This checklist ensures a systematic and safe deployment of the Effect Patterns Hub to production.