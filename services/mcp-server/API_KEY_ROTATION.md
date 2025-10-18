# API Key Rotation Guide

Secure API key generation, rotation, and management procedures for the Effect Patterns MCP Server.

## Overview

This guide covers:
- Generating secure API keys
- Rotating keys without downtime
- Automated rotation workflows
- Emergency key revocation
- Audit logging

## Key Generation Standards

### Generate Secure Keys

**Recommended Method** (Cryptographically secure):
```bash
# Generate 256-bit (32 byte) key
openssl rand -hex 32

# Example output:
# a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Key Format**:
- Length: 64 characters (256 bits)
- Character set: Hexadecimal (0-9, a-f)
- Entropy: 256 bits minimum
- NO special characters (to avoid shell escaping issues)

### Key Naming Convention

Use descriptive prefixes to identify key purpose:

```
staging-{environment}-{timestamp}
prod-{environment}-{timestamp}

Examples:
staging-vercel-20250110
prod-vercel-20250110
staging-local-dev-20250110
```

## Current API Keys

### Staging Environment

**Current Key** (as of 2025-01-10):
```
Environment: Vercel Preview/Staging
Key Name: PATTERN_API_KEY
Rotation Schedule: Every 90 days
Next Rotation: 2025-04-10
```

**Generate New Staging Key**:
```bash
# Generate new key
NEW_KEY=$(openssl rand -hex 32)
echo "New Staging Key: $NEW_KEY"

# Save to secure location (1Password, AWS Secrets Manager, etc.)
echo "$NEW_KEY" | pbcopy  # macOS - copies to clipboard
```

### Production Environment

**Current Key** (not yet deployed):
```
Environment: Vercel Production
Key Name: PATTERN_API_KEY
Rotation Schedule: Every 90 days
Next Rotation: TBD (upon first deployment)
```

## Rotation Procedures

### Zero-Downtime Rotation Strategy

The MCP server supports **dual API key mode** for zero-downtime rotation:

1. **Generate new key**
2. **Add new key** to environment (old key still works)
3. **Update clients** to use new key
4. **Remove old key** after migration complete

### Step-by-Step Rotation

#### Phase 1: Generate and Add New Key

```bash
# 1. Generate new key
NEW_KEY=$(openssl rand -hex 32)
TIMESTAMP=$(date +%Y%m%d)

# 2. Add new key to Vercel (keep old key)
vercel env add PATTERN_API_KEY_NEW staging
# Enter: $NEW_KEY

# 3. Update application to accept both keys (see code changes below)

# 4. Deploy with both keys active
vercel --env staging
```

#### Phase 2: Update Clients

Update all clients to use new key:

```bash
# Update GitHub Actions secrets
gh secret set STAGING_API_KEY --body "$NEW_KEY"

# Update local .env files
echo "PATTERN_API_KEY=$NEW_KEY" > .env.staging

# Update CI/CD pipelines
# Update documentation
# Notify team members
```

#### Phase 3: Remove Old Key

After verification period (recommended: 7 days):

```bash
# Remove old key from Vercel
vercel env rm PATTERN_API_KEY staging

# Rename new key to primary
vercel env rm PATTERN_API_KEY_NEW staging
vercel env add PATTERN_API_KEY staging
# Enter: $NEW_KEY

# Deploy with only new key
vercel --env staging
```

## Code Changes for Dual-Key Support

### Authentication Middleware Enhancement

Update `services/mcp-server/src/auth/apiKey.ts`:

```typescript
import { Effect } from "effect";
import { NextRequest } from "next/server";

// Get both keys from environment
const PRIMARY_KEY = process.env.PATTERN_API_KEY;
const SECONDARY_KEY = process.env.PATTERN_API_KEY_NEW; // Optional during rotation

const VALID_KEYS = [PRIMARY_KEY, SECONDARY_KEY].filter(Boolean);

export function validateApiKey(request: NextRequest): Effect.Effect<void, Error> {
  return Effect.gen(function* () {
    // Try header first
    const headerKey = request.headers.get("x-api-key");
    if (headerKey && VALID_KEYS.includes(headerKey)) {
      return;
    }

    // Try query parameter
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("key");
    if (queryKey && VALID_KEYS.includes(queryKey)) {
      return;
    }

    // Log attempted key (first 8 chars only) for audit
    const attemptedKey = headerKey || queryKey;
    if (attemptedKey) {
      console.warn(`Invalid API key attempt: ${attemptedKey.substring(0, 8)}...`);
    }

    yield* Effect.fail(new Error("Unauthorized: Invalid or missing API key"));
  });
}
```

### Environment Variable Validation

Update `services/mcp-server/src/server/init.ts`:

```typescript
// Validate API keys on startup
const validateApiKeys = Effect.sync(() => {
  const primaryKey = process.env.PATTERN_API_KEY;
  const secondaryKey = process.env.PATTERN_API_KEY_NEW;

  if (!primaryKey) {
    throw new Error("PATTERN_API_KEY environment variable is required");
  }

  // Validate key format (64 hex characters)
  const keyRegex = /^[0-9a-f]{64}$/;
  if (!keyRegex.test(primaryKey)) {
    throw new Error("PATTERN_API_KEY must be 64 hexadecimal characters");
  }

  if (secondaryKey && !keyRegex.test(secondaryKey)) {
    throw new Error("PATTERN_API_KEY_NEW must be 64 hexadecimal characters");
  }

  console.log(`API Keys loaded: Primary (${primaryKey.substring(0, 8)}...)${secondaryKey ? `, Secondary (${secondaryKey.substring(0, 8)}...)` : ""}`);
});
```

## Automated Rotation Workflow

### GitHub Actions Workflow

Create `.github/workflows/rotate-api-keys.yml`:

```yaml
name: Rotate API Keys

on:
  schedule:
    # Run quarterly (every 90 days) - Jan 1, Apr 1, Jul 1, Oct 1
    - cron: '0 0 1 1,4,7,10 *'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rotate keys for'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  rotate-keys:
    name: Rotate API Keys
    runs-on: ubuntu-latest

    steps:
      - name: Generate new API key
        id: generate
        run: |
          NEW_KEY=$(openssl rand -hex 32)
          echo "::add-mask::$NEW_KEY"
          echo "new_key=$NEW_KEY" >> $GITHUB_OUTPUT
          echo "Generated new API key"

      - name: Add new key to Vercel
        run: |
          # This would require Vercel API integration
          # For now, this is a manual step
          echo "⚠️  Manual step required:"
          echo "1. Add new key to Vercel environment variables"
          echo "2. Key name: PATTERN_API_KEY_NEW"
          echo "3. Environment: ${{ github.event.inputs.environment || 'staging' }}"

      - name: Create rotation issue
        uses: actions/github-script@v7
        with:
          script: |
            const environment = '${{ github.event.inputs.environment || "staging" }}';
            const timestamp = new Date().toISOString().split('T')[0];

            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🔐 API Key Rotation Required - ${environment}`,
              body: `## API Key Rotation - ${environment}

              **Generated**: ${timestamp}
              **Environment**: ${environment}

              ### Steps to Complete Rotation:

              #### Phase 1: Add New Key (Do Now)
              - [ ] New key generated (see workflow logs)
              - [ ] Add new key to Vercel as \`PATTERN_API_KEY_NEW\`
              - [ ] Deploy application with dual-key support
              - [ ] Verify both keys work

              #### Phase 2: Update Clients (Next 7 days)
              - [ ] Update GitHub Actions secrets
              - [ ] Update local development .env files
              - [ ] Update documentation
              - [ ] Notify team members

              #### Phase 3: Remove Old Key (After 7 days)
              - [ ] Verify all clients using new key
              - [ ] Remove \`PATTERN_API_KEY_NEW\` from Vercel
              - [ ] Rename new key to \`PATTERN_API_KEY\`
              - [ ] Deploy with single key
              - [ ] Close this issue

              ### Security Notes
              - Old key will remain valid during migration period
              - Monitor logs for usage of old key
              - Revoke old key immediately if compromise suspected

              ### References
              - [API Key Rotation Guide](./services/mcp-server/API_KEY_ROTATION.md)
              - [Security Policy](./SECURITY.md)
              `,
              labels: ['security', 'api-keys', 'rotation', environment]
            });

      - name: Notify team
        run: |
          echo "📧 Rotation issue created"
          echo "Team members should be notified via GitHub notifications"
```

## Emergency Key Revocation

If a key is compromised:

### Immediate Actions

```bash
# 1. Generate new key immediately
EMERGENCY_KEY=$(openssl rand -hex 32)

# 2. Replace key in Vercel (causes brief downtime)
vercel env rm PATTERN_API_KEY production
vercel env add PATTERN_API_KEY production
# Enter: $EMERGENCY_KEY

# 3. Force new deployment
vercel --prod --force

# 4. Update all clients immediately
gh secret set PRODUCTION_API_KEY --body "$EMERGENCY_KEY"

# 5. Notify team
echo "🚨 EMERGENCY: API key revoked and rotated"
```

### Post-Incident

1. **Investigate** how key was compromised
2. **Review** access logs for unauthorized usage
3. **Update** security procedures
4. **Document** incident in security log
5. **Rotate** all other credentials as precaution

## Key Storage Best Practices

### DO:
- ✅ Store keys in Vercel environment variables
- ✅ Use GitHub encrypted secrets for CI/CD
- ✅ Use password managers (1Password, LastPass) for team access
- ✅ Use cloud secret managers (AWS Secrets Manager, HashiCorp Vault) for production
- ✅ Encrypt keys at rest
- ✅ Use separate keys per environment
- ✅ Log key usage (without logging key value)
- ✅ Rotate keys regularly (90 days)

### DON'T:
- ❌ Commit keys to Git (check with `git log -S "PATTERN_API_KEY"`)
- ❌ Share keys via email or Slack
- ❌ Use same key across environments
- ❌ Store keys in plaintext files
- ❌ Log full key values
- ❌ Hardcode keys in application code
- ❌ Share keys in screenshots or documentation

## Audit Trail

### Key Rotation Log

Maintain a log of all key rotations:

```markdown
# API Key Rotation History

## Staging Environment

| Date       | Action  | Key ID (first 8 chars) | Rotated By | Reason       |
|------------|---------|------------------------|------------|--------------|
| 2025-01-10 | Created | a1b2c3d4               | Claude     | Initial      |
| 2025-04-10 | Rotated | e5f6g7h8               | Auto       | Scheduled    |
| 2025-07-10 | Rotated | i9j0k1l2               | Auto       | Scheduled    |

## Production Environment

| Date       | Action  | Key ID (first 8 chars) | Rotated By | Reason       |
|------------|---------|------------------------|------------|--------------|
| 2025-01-15 | Created | m3n4o5p6               | Admin      | Launch       |
```

### Access Monitoring

Monitor API key usage:

```typescript
// Add to authentication middleware
const logApiKeyUsage = (keyPrefix: string, request: NextRequest) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'api_key_used',
    key_prefix: keyPrefix.substring(0, 8), // First 8 chars only
    endpoint: request.url,
    ip: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
  }));
};
```

## Compliance

### SOC 2 Requirements
- ✅ Keys rotated every 90 days
- ✅ Access logged and monitored
- ✅ Keys encrypted in transit and at rest
- ✅ Separation of duties (different keys per environment)

### PCI DSS Requirements
- ✅ Strong cryptography (256-bit keys)
- ✅ Regular rotation schedule
- ✅ No shared accounts (individual API keys for services)

### GDPR Requirements
- ✅ Data access controlled via API keys
- ✅ Access audit trail maintained
- ✅ Keys can be revoked on demand

## Checklist: Quarterly Rotation

Use this checklist every 90 days:

### Pre-Rotation
- [ ] Review access logs for anomalies
- [ ] Verify all current clients and services
- [ ] Schedule maintenance window (if needed)
- [ ] Notify team of upcoming rotation

### Rotation
- [ ] Generate new key using `openssl rand -hex 32`
- [ ] Add new key as `PATTERN_API_KEY_NEW` to Vercel
- [ ] Deploy application with dual-key support
- [ ] Test both keys work correctly
- [ ] Update smoke tests with new key
- [ ] Verify smoke tests pass

### Post-Rotation (7-day migration period)
- [ ] Update GitHub Actions secrets
- [ ] Update team member .env files
- [ ] Update documentation
- [ ] Monitor logs for old key usage
- [ ] After 7 days: remove old key
- [ ] Rename new key to primary
- [ ] Deploy with single key
- [ ] Update rotation log
- [ ] Close rotation issue

## Tools and Scripts

### Rotation Helper Script

Create `scripts/rotate-api-key.sh`:

```bash
#!/bin/bash
# API Key Rotation Helper Script

set -euo pipefail

ENVIRONMENT="${1:-staging}"
TIMESTAMP=$(date +%Y%m%d)

echo "🔐 API Key Rotation - $ENVIRONMENT"
echo "=================================="

# Generate new key
echo "Generating new key..."
NEW_KEY=$(openssl rand -hex 32)
KEY_PREFIX=${NEW_KEY:0:8}

echo "✅ New key generated: ${KEY_PREFIX}..."

# Save to temporary file (will be deleted)
TEMP_FILE=$(mktemp)
echo "$NEW_KEY" > "$TEMP_FILE"

echo ""
echo "📋 Next Steps:"
echo "1. Add new key to Vercel:"
echo "   vercel env add PATTERN_API_KEY_NEW $ENVIRONMENT"
echo "   Value: $(cat $TEMP_FILE)"
echo ""
echo "2. Deploy application"
echo "3. Update GitHub secrets:"
echo "   gh secret set ${ENVIRONMENT^^}_API_KEY < $TEMP_FILE"
echo ""
echo "4. After 7 days, complete rotation:"
echo "   vercel env rm PATTERN_API_KEY $ENVIRONMENT"
echo "   vercel env rm PATTERN_API_KEY_NEW $ENVIRONMENT"
echo "   vercel env add PATTERN_API_KEY $ENVIRONMENT"
echo ""

# Copy to clipboard if available
if command -v pbcopy &> /dev/null; then
    cat "$TEMP_FILE" | pbcopy
    echo "✅ New key copied to clipboard"
fi

echo ""
echo "⚠️  Key saved temporarily at: $TEMP_FILE"
echo "   Delete after adding to Vercel: rm $TEMP_FILE"
```

## References

- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
