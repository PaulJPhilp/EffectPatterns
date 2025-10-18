# Deploy to Staging - Quick Start Guide

## 🎯 Your Staging API Key

**Save this key securely - you'll need it for testing:**

```
1b872a5724ce32e3992b5c8a240fff9e18d967b43da45e25c2799d9e0a7d2c95
```

## 📋 Deployment Steps

### Step 1: Link Project to Vercel

Run this command and follow the prompts:

```bash
vercel link
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No (first time)
- **Project name?** → `effect-patterns-mcp-server`
- **Directory?** → `./` (press Enter)

### Step 2: Set Environment Variables

Run these commands one by one:

```bash
# API Key for authentication
vercel env add PATTERN_API_KEY preview
# When prompted, paste: 1b872a5724ce32e3992b5c8a240fff9e18d967b43da45e25c2799d9e0a7d2c95

# Service name for tracing
vercel env add SERVICE_NAME preview
# When prompted, enter: effect-patterns-mcp-server-staging

# OTLP endpoint (optional - use dummy for now)
vercel env add OTLP_ENDPOINT preview
# When prompted, enter: http://localhost:4318/v1/traces

# OTLP headers (optional - empty for now)
vercel env add OTLP_HEADERS preview
# When prompted, enter: {}
```

### Step 3: Deploy to Staging

```bash
vercel
```

This will:
1. Build the toolkit package
2. Build the Next.js server
3. Deploy to Vercel
4. Give you a preview URL like: `https://effect-patterns-mcp-server-xyz.vercel.app`

### Step 4: Test the Deployment

Once deployed, save the URL and test:

```bash
# Save your deployment URL (replace with actual URL from step 3)
export STAGING_URL="https://effect-patterns-mcp-server-xyz.vercel.app"
export STAGING_KEY="1b872a5724ce32e3992b5c8a240fff9e18d967b43da45e25c2799d9e0a7d2c95"

# Test health endpoint
curl $STAGING_URL/api/health | jq

# Test authenticated endpoint
curl -H "x-api-key: $STAGING_KEY" $STAGING_URL/api/patterns | jq

# Run full smoke tests
bun run smoke-test $STAGING_URL $STAGING_KEY
```

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ Health endpoint returns `{"ok": true}`
- ✅ Patterns endpoint returns pattern list
- ✅ Smoke tests show 16+ passing tests
- ✅ No 500 errors in responses

## 🔧 If Something Goes Wrong

### Build Fails

Check the build logs:
```bash
vercel logs --follow
```

Common issues:
- **Toolkit not found**: The build command should handle this automatically
- **TypeScript errors**: Run `bun run typecheck` locally first

### Environment Variables Not Working

List current variables:
```bash
vercel env ls
```

Pull them locally to verify:
```bash
vercel env pull .env.vercel
cat .env.vercel
```

### Deployment URL Not Working

Wait 30 seconds for cold start, then try again. Serverless functions can be slow on first request.

## 📊 Monitoring

After deployment:

1. **View Logs**:
   ```bash
   vercel logs --follow
   ```

2. **Check Vercel Dashboard**:
   - Go to https://vercel.com/dashboard
   - Select your project
   - View Analytics, Logs, and Deployments

3. **Monitor Performance**:
   - Response times should be < 1s after warm-up
   - Error rate should be 0%

## 🚀 Next Steps After Staging

Once staging is verified:

1. **Set up production environment variables**:
   ```bash
   vercel env add PATTERN_API_KEY production
   # Use a different, more secure key for production
   ```

2. **Deploy to production**:
   ```bash
   vercel --prod
   ```

3. **Set up custom domain** (optional):
   ```bash
   vercel domains add api.effectpatterns.com
   ```

## 📝 Notes

- **API Key Security**: The staging key above is for testing only. Generate a new one for production.
- **Tracing**: We're using dummy OTLP settings for now. Set up Honeycomb later for real tracing.
- **Costs**: Vercel Hobby plan (free) should be sufficient for staging.

## 🆘 Need Help?

- Check `VERCEL_SETUP.md` for detailed documentation
- Check `RELEASE_CHECKLIST.md` for known issues
- View Vercel logs: `vercel logs --follow`
- Check deployment status: `vercel ls`

---

**Ready to deploy?** Start with Step 1 above! 🚀
