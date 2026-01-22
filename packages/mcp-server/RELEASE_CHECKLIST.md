# Release Checklist

Quick checklist before deploying the MCP server to production.

## Pre-Deployment

- [ ] Run preflight checks: `bun run preflight`
  - Builds stdio server
  - Checks for narration leakage (stdout pollution)
  - Tests MCP protocol locally
- [ ] Verify test coverage ≥ 80%: `bun run test:coverage`
- [ ] Check CI passes (optional but recommended - catches env drift)
- [ ] Verify API key is configured in production environment
- [ ] Test MCP connection locally: `bun run test:mcp:local`

## Deployment

- [ ] Deploy to staging first (if available)
- [ ] Verify staging health endpoint responds
- [ ] Test staging MCP connection
- [ ] Deploy to production
- [ ] Verify production health endpoint: `curl https://effect-patterns-mcp.vercel.app/api/health`
- [ ] Monitor logs for first few minutes

## Post-Deployment

- [ ] Verify MCP tools are discoverable
- [ ] Test pattern search functionality
- [ ] Check error rates in monitoring
- [ ] Verify API key authentication works

---

**Quick Command:**
```bash
bun run preflight && echo "✅ Ready to deploy"
```

**Note:** CI is optional but recommended - it acts as your "second machine" that catches environment drift and integration issues.
