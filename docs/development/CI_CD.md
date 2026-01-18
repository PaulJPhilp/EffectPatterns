# CI/CD & Deployment

GitHub Actions workflows and Vercel deployment configuration.

---

## Overview

The project uses:

- **GitHub Actions** for continuous integration and testing
- **Vercel** for serverless deployment
- **Dependabot** for automated dependency updates

---

## GitHub Actions Workflows

### Main CI Pipeline

**File:** `.github/workflows/ci.yml`

**Trigger:** Push to any branch, Pull Requests

**Steps:**

1. Checkout code
2. Setup Node.js/Bun environment
3. Install dependencies
4. Run tests (all test suites)
5. Type checking (TypeScript compiler)
6. Linting (Biome)
7. Coverage reports (if applicable)
8. Upload coverage to external services

**Configuration:**

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test
      - run: bun run typecheck
      - run: bun run lint
```

**Status Badge:**
Add to README.md:

```markdown
[![CI](https://github.com/PaulJPhilp/Effect-Patterns/workflows/CI/badge.svg)](https://github.com/PaulJPhilp/Effect-Patterns/actions)
```

### Security Scanning

**File:** `.github/workflows/security-scan.yml`

**Trigger:** Scheduled weekly + on-demand

**Steps:**

1. Dependency audit (npm audit, Snyk, etc.)
2. SAST scanning (code quality and security)
3. License compliance check
4. Vulnerability alerts

**Output:**

- Security tab reports
- Detailed vulnerability information
- Remediation suggestions

### App-Specific CI

**File:** `.github/workflows/app-ci.yml`

**Trigger:** Changes in `app/` directory

**Steps:**

1. Test app code
2. Build app (Next.js)
3. Integration tests
4. Performance benchmarks (if configured)

---

## Vercel Deployment

### Configuration

**File:** `vercel.json`

```json
{
  "version": 2,
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "env": {
    "PATTERN_API_KEY": {
      "description": "API key for pattern access"
    },
    "OTLP_ENDPOINT": {
      "description": "OpenTelemetry OTLP endpoint"
    }
  }
}
```

### Environment Variables

**Required for Production:**

- `PATTERN_API_KEY` - API authentication key
- `OTLP_ENDPOINT` - OpenTelemetry telemetry endpoint
- `OTLP_HEADERS` - OTLP authentication headers

**Optional:**

- `DISCORD_BOT_TOKEN` - For Discord data export
- `ANTHROPIC_API_KEY` - For Claude AI features

**Setting Variables:**

1. Via Vercel Dashboard:
   - Project → Settings → Environment Variables
   - Add key-value pairs
   - Select environments (Production, Preview, Development)

2. Via Vercel CLI:

   ```bash
   vercel env add PATTERN_API_KEY
   ```

### Deployments

**Automatic Deployments:**

- **MCP Server:** Push to `main` branch
  - Deployed to: `https://effect-patterns-mcp.vercel.app`
  - Domain: Custom domain if configured
- **Preview:** Create Pull Request
  - Deployed to: `https://effect-patterns-mcp-{pr-number}.vercel.app`

**Note:** The main Effect Patterns website is currently under development. The MCP server provides the API endpoints for pattern access.

**Manual Deployments:**

```bash
# Deploy to staging (Preview)
vercel

# Deploy to production
vercel --prod

# Deploy specific project
vercel --project=effect-patterns
```

### Rollback

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel promote <deployment-url>
```

---

## Project Deployment Configuration

### Root Project (MCP Server & Content)

**What Deploys:**

- MCP server (`services/mcp-server/`)
- Pattern library (`content/published/`)
- Static assets

**Build Command:**

```bash
bun run build          # Type check, lint, test
bun run toolkit:build  # Build toolkit
bun run mcp:build      # Build MCP server
```

**Start Command:**

```bash
bun run mcp:dev        # Development
bun start              # Production (if configured)
```

### App Deployments

**Code Assistant** (`app/code-assistant/`)

- Separate Vercel project
- Environment: Neon PostgreSQL
- Build: `bun run build`
- Start: `bun run start`

**Chat Assistant** (`app/chat-assistant/`)

- Separate Vercel project
- Build: `bun run build`
- Start: `bun run start`

**Web App** (`app/web/`)

- Separate Vercel project
- Build: `bun run build`
- Start: `bun run start`

---

## Health Checks

### MCP Server Health

```bash
# Local
curl http://localhost:3000/api/health

# Production
curl https://effect-patterns-mcp.vercel.app/api/health

# With authentication
curl -H "x-api-key: YOUR_KEY" \
  https://effect-patterns-mcp.vercel.app/api/health
```

**Response:**

```json
{
  "status": "healthy",
  "version": "0.7.4",
  "timestamp": "2025-12-13T10:30:00Z"
}
```

### Monitoring

**Vercel:**

- Deployment status in Dashboard
- Performance metrics
- Error logs and alerts

**OpenTelemetry:**

- Structured logs and traces
- Configured OTLP endpoint for observability

---

## Testing Strategy

### Local Testing

```bash
# All tests
bun test

# Specific suite
bun run test:cli
bun run test:server
bun run test:integration

# With coverage
bun test --coverage
```

### CI Testing

Tests run on every push/PR:

1. Unit tests (Vitest)
2. Integration tests
3. Type checking (TypeScript)
4. Linting (Biome)

**Coverage Requirements:**

- Minimum coverage: 80% (if configured)
- Critical paths: 100% coverage
- Comments explain exceptions

### Test File Locations

- `packages/*/test/` - Package tests
- `packages/*/__tests__/` - Test files
- `scripts/**/*.test.ts` - Script tests
- `services/*/tests/` - Service tests

---

## Performance Monitoring

### Metrics Tracked

- **Build time** - How long deployments take
- **Bundle size** - JavaScript bundle size
- **Cold start** - Function startup time
- **API response time** - Endpoint latency
- **Error rate** - Failed requests percentage

### OpenTelemetry Integration

Automatic tracing includes:

- HTTP request/response
- File system operations
- Database queries (if configured)
- Custom application traces

**Configuration:**

```bash
# Environment variables
OTLP_ENDPOINT="https://your-otlp-endpoint"
OTLP_HEADERS="Authorization: Bearer TOKEN"
```

---

## Dependabot Automation

### Configuration

**File:** `.github/dependabot.yml`

**Features:**

- Automatic dependency updates
- Security vulnerability alerts
- Pull request creation with updates
- Automatic merge of safe updates (if configured)

**Scanning:**

- npm/Bun dependencies
- GitHub Actions workflows
- Docker images (if applicable)

### Updates

**Frequency:**

- Weekly security updates
- Monthly version updates
- As-needed for critical vulnerabilities

**Pull Requests:**

- Created with detailed changelog
- Linked to security advisories
- Auto-merge if tests pass (optional)

---

## Deployment Checklist

### Before Deploying

- [ ] All tests passing locally
- [ ] No TypeScript errors
- [ ] No linting issues
- [ ] Code review approved
- [ ] Environment variables set in Vercel
- [ ] No breaking changes to API

### Deployment Steps

1. Push to branch
2. GitHub Actions runs automatically
3. Wait for CI to pass (5-10 minutes)
4. Create Pull Request (optional)
5. Merge to `main` for production
6. Vercel automatically deploys

### After Deploying

- [ ] Verify deployment succeeded in Vercel
- [ ] Test API endpoints
- [ ] Check logs for errors
- [ ] Monitor metrics

---

## Troubleshooting

### Build Failures

**Check logs:**

```bash
# View build logs in Vercel Dashboard
# Or run locally:
bun run build
```

**Common issues:**

- Missing environment variables
- TypeScript errors
- Import resolution issues
- Missing dependencies

### Deployment Failures

**Common causes:**

- Insufficient disk space
- Memory limits exceeded
- Database connection issues
- API rate limiting

**Resolution:**

- Check Vercel logs
- Verify environment variables
- Test locally first
- Contact Vercel support if needed

### Performance Issues

**If deployment is slow:**

1. Check Bun cache: `bun cache rm`
2. Clear node_modules: `rm -rf node_modules && bun install`
3. Check for large dependencies
4. Profile with `--verbose` flag

---

## Useful Commands

```bash
# Local build & test
bun run build
bun test
bun run lint
bun run typecheck

# Deployment (CLI)
vercel          # Deploy to Preview
vercel --prod   # Deploy to Production

# Vercel management
vercel ls       # List deployments
vercel logs     # View logs
vercel env ls   # List environment variables

# GitHub Actions
gh run list                    # List recent runs
gh run view RUN_ID             # View specific run
gh workflow list               # List workflows
gh workflow run WORKFLOW_NAME   # Trigger workflow manually
```

---

## See Also

- [Dependencies](./DEPENDENCIES.md)
- [Architecture & Monorepo Structure](./ARCHITECTURE.md)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
