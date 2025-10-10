# Vercel Setup Guide

Step-by-step guide to deploy the Effect Patterns MCP Server to Vercel staging environment.

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   # or
   bun add -g vercel
   ```
3. **OpenTelemetry Collector**: Set up Honeycomb, Jaeger, or other OTLP-compatible service

## Step 1: Install and Login

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

Follow the browser prompt to authenticate.

## Step 2: Link Project

```bash
# Navigate to MCP server directory
cd services/mcp-server

# Link to Vercel project
vercel link
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your personal account or team
- **Link to existing project?** → No (first time) or Yes (if project exists)
- **What's your project's name?** → `effect-patterns-mcp-server`
- **In which directory is your code located?** → `./` (current directory)

This creates `.vercel/` directory with project configuration.

## Step 3: Set Up Environment Variables

### Required Variables

You need to set these environment variables in Vercel:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `PATTERN_API_KEY` | API key for authenticating requests | Generate a secure random string |
| `OTLP_ENDPOINT` | OpenTelemetry collector endpoint | `https://api.honeycomb.io/v1/traces` |
| `OTLP_HEADERS` | Headers for OTLP exporter (JSON) | `{"x-honeycomb-team":"your-api-key"}` |
| `SERVICE_NAME` | Service name for traces | `effect-patterns-mcp-server-staging` |

### Option 1: Via Vercel CLI (Recommended)

```bash
# Add staging environment variables
vercel env add PATTERN_API_KEY staging
# When prompted, enter: your-staging-api-key-abc123

vercel env add OTLP_ENDPOINT staging
# When prompted, enter: https://api.honeycomb.io/v1/traces

vercel env add OTLP_HEADERS staging
# When prompted, enter: {"x-honeycomb-team":"your-honeycomb-api-key"}

vercel env add SERVICE_NAME staging
# When prompted, enter: effect-patterns-mcp-server-staging

# Repeat for production environment
vercel env add PATTERN_API_KEY production
vercel env add OTLP_ENDPOINT production
vercel env add OTLP_HEADERS production
vercel env add SERVICE_NAME production
```

### Option 2: Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project: `effect-patterns-mcp-server`
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Click "Add New"
   - Enter key and value
   - Select environment: `Preview` (staging) or `Production`
   - Click "Save"

### Generating Secure API Keys

```bash
# Generate a secure random API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using openssl
openssl rand -hex 32
```

## Step 4: Set Up OpenTelemetry (Optional but Recommended)

### Option A: Honeycomb (Recommended)

1. Sign up at https://ui.honeycomb.io
2. Create a new environment (e.g., "staging")
3. Get your API key from Settings → API Keys
4. Set environment variables:
   - `OTLP_ENDPOINT`: `https://api.honeycomb.io/v1/traces`
   - `OTLP_HEADERS`: `{"x-honeycomb-team":"YOUR_API_KEY"}`

### Option B: Local Jaeger (Development)

1. Run Jaeger locally:
   ```bash
   docker run -d --name jaeger \
     -e COLLECTOR_OTLP_ENABLED=true \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

2. Set environment variables:
   - `OTLP_ENDPOINT`: `http://localhost:4318/v1/traces`
   - `OTLP_HEADERS`: `{}`

### Option C: No Tracing

If you don't want tracing for now:
- `OTLP_ENDPOINT`: `http://localhost:4318/v1/traces` (will fail silently)
- `OTLP_HEADERS`: `{}`

## Step 5: Deploy to Staging

### Preview Deployment (Staging)

```bash
# Deploy to preview environment
vercel

# Or explicitly specify environment
vercel --env preview
```

This creates a preview deployment with URL like:
`https://effect-patterns-mcp-server-abc123.vercel.app`

The deployment will:
1. Install dependencies with Bun
2. Build toolkit package (required dependency)
3. Build Next.js MCP server
4. Deploy to Vercel edge network

### Check Deployment Status

```bash
# View deployment logs
vercel logs --follow

# List all deployments
vercel ls

# Inspect specific deployment
vercel inspect <deployment-url>
```

## Step 6: Verify Deployment

### Manual Verification

```bash
# Save deployment URL
STAGING_URL="https://effect-patterns-mcp-server-abc123.vercel.app"
STAGING_KEY="your-staging-api-key"

# Test health endpoint (no auth)
curl $STAGING_URL/api/health | jq

# Expected response:
# {
#   "ok": true,
#   "service": "effect-patterns-mcp-server",
#   "version": "0.1.0",
#   "timestamp": "2024-01-15T10:30:00.000Z",
#   "traceId": "abc123..."
# }

# Test authenticated endpoint
curl -H "x-api-key: $STAGING_KEY" \
  $STAGING_URL/api/patterns | jq

# Should return list of patterns
```

### Run Smoke Tests

```bash
# From services/mcp-server directory
bun run smoke-test $STAGING_URL $STAGING_KEY

# Should output:
# 🎉 All smoke tests passed!
```

## Step 7: Deploy to Production (When Ready)

### Production Deployment

```bash
# Deploy to production
vercel --prod
```

This deploys to your production URL:
`https://effect-patterns-mcp-server.vercel.app`

### Verify Production

```bash
PROD_URL="https://effect-patterns-mcp-server.vercel.app"
PROD_KEY="your-production-api-key"

bun run smoke-test $PROD_URL $PROD_KEY
```

## Step 8: Set Up Custom Domain (Optional)

### Add Custom Domain

```bash
# Add custom domain
vercel domains add api.effectpatterns.com

# Point domain to deployment
vercel alias <deployment-url> api.effectpatterns.com
```

Or via Vercel Dashboard:
1. Go to Project Settings → Domains
2. Click "Add"
3. Enter domain: `api.effectpatterns.com`
4. Follow DNS configuration instructions

## Step 9: Configure GitHub Integration

To enable automatic deployments from GitHub:

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Git**
4. Connect to GitHub repository
5. Configure:
   - **Production Branch**: `main`
   - **Preview Branches**: `feat/**`, `dev`
   - **Automatic Deployments**: Enabled

Now:
- Pushes to `main` → Production deployment
- Pushes to other branches → Preview deployment

## Vercel Secrets for GitHub Actions

To enable the `deploy-staging.yml` workflow:

1. **Get Vercel Token**:
   - Go to https://vercel.com/account/tokens
   - Click "Create"
   - Name: "GitHub Actions"
   - Scope: Full Account
   - Copy token

2. **Get Project IDs**:
   ```bash
   # In services/mcp-server directory
   cat .vercel/project.json
   ```
   This shows:
   - `orgId`: Your organization/team ID
   - `projectId`: Your project ID

3. **Add GitHub Secrets**:
   - Go to GitHub repository → Settings → Secrets and variables → Actions
   - Add secrets:
     - `VERCEL_TOKEN`: Your Vercel token
     - `VERCEL_ORG_ID`: Your org ID
     - `VERCEL_PROJECT_ID`: Your project ID
     - `STAGING_API_KEY`: Your staging API key
     - `STAGING_OTLP_ENDPOINT`: Your OTLP endpoint
     - `STAGING_OTLP_HEADERS`: Your OTLP headers JSON

## Monitoring and Debugging

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Logs for specific deployment
vercel logs <deployment-url>

# Function logs only
vercel logs --output=short
```

### View Metrics

Go to Vercel Dashboard:
- **Analytics**: Request counts, response times, error rates
- **Speed Insights**: Core Web Vitals, performance metrics
- **Logs**: Function invocation logs

### View Traces

In Honeycomb (or your OTLP collector):
- Go to https://ui.honeycomb.io
- Select environment: "staging"
- View traces by service name: `effect-patterns-mcp-server-staging`

## Troubleshooting

### Build Failures

**Error: "Cannot find module '@effect-patterns/toolkit'"**

**Solution**: Ensure the build command builds toolkit first:
```bash
# In vercel.json:
"buildCommand": "cd ../.. && bun install --frozen-lockfile && bun --filter @effect-patterns/mcp-server run build"
```

### Environment Variable Issues

**Error: "PATTERN_API_KEY is not set"**

**Solution**: Check environment variables are set:
```bash
vercel env ls

# If missing, add them:
vercel env add PATTERN_API_KEY staging
```

### Deployment Succeeds but Smoke Tests Fail

**Possible Causes**:
- Environment variables not applied to deployment
- Cold start taking too long
- Wrong API key used in tests

**Solution**:
```bash
# Check deployment environment
vercel env pull .env.staging

# Verify environment variables
cat .env.staging

# Redeploy
vercel --force
```

### OTLP Traces Not Appearing

**Possible Causes**:
- Invalid OTLP endpoint
- Invalid OTLP headers JSON
- Network blocked

**Solution**:
```bash
# Test OTLP endpoint manually
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-honeycomb-team: your-key" \
  -d '{"resourceSpans":[]}' \
  https://api.honeycomb.io/v1/traces

# Should return 200 OK
```

## Cost Optimization

Vercel pricing tiers:
- **Hobby (Free)**: 100GB bandwidth, 100 hours function execution
- **Pro ($20/mo)**: 1TB bandwidth, unlimited executions

Tips:
- Use caching headers to reduce function invocations
- Implement Edge Functions for frequently accessed endpoints
- Monitor bandwidth usage in dashboard
- Use preview deployments for testing, not production traffic

## Next Steps

1. ✅ Deploy to staging
2. ✅ Run smoke tests
3. ✅ Set up monitoring (Honeycomb/Jaeger)
4. ✅ Configure GitHub Actions
5. ⏭️ Deploy to production
6. ⏭️ Set up custom domain
7. ⏭️ Configure branch protection requiring staging tests

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [OpenTelemetry JS](https://opentelemetry.io/docs/instrumentation/js/)
- [Honeycomb Documentation](https://docs.honeycomb.io)
