# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Vulnerability Reporting

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.

## Security Best Practices

### For Users

If you're deploying the MCP Server:

1. **Use Strong API Keys**

   ```bash
   # Generate a cryptographically secure key
   openssl rand -hex 32
   ```

2. **Rotate Keys Regularly**
   - Recommended: Every 90 days
   - See [API_KEY_ROTATION.md](./services/mcp-server/API_KEY_ROTATION.md)

3. **Store Secrets Securely**
   - Use Vercel environment variables (encrypted at rest)
   - Use GitHub encrypted secrets for CI/CD
   - Never commit secrets to Git

4. **Keep Dependencies Updated**

   ```bash
   bun update
   npm audit
   ```

5. **Monitor Your Deployment**
   - Set up uptime monitoring
   - Review access logs regularly
   - Set up alerts for anomalies

### For Contributors

1. **Never Commit Secrets**

   ```bash
   # Check for secrets before committing
   git log -S "PATTERN_API_KEY"
   git log -S "api-key"
   ```

2. **Run Security Checks**

   ```bash
   # Before submitting a PR
   npm audit
   bun run typecheck
   bun run test
   ```

3. **Follow Secure Coding Guidelines**
   - Always sanitize user input
   - Use parameterized queries (no SQL injection)
   - Avoid eval(), Function(), etc.
   - Use Effect's type-safe error handling

4. **Review Dependencies**
   - Check new dependencies for known vulnerabilities
   - Prefer well-maintained, popular packages
   - Pin versions in package.json

## Known Security Considerations

### 1. API Key Authentication

**Current Implementation**: Simple bearer token in header or query parameter

**Security Level**: Medium

- ✅ HTTPS encryption in transit
- ✅ Keys not logged or exposed
- ⚠️ No rate limiting (Vercel provides basic DDoS protection)
- ⚠️ No key rotation enforcement

**Recommendations**:

- Implement rate limiting for production
- Rotate keys quarterly
- Consider OAuth 2.0 for future versions

### 2. OpenTelemetry Tracing

**Consideration**: Traces may contain request data

**Mitigation**:

- Traces sent to configured OTLP endpoint only
- Trace IDs are non-sensitive UUIDs
- No personal data in pattern information
- HTTPS encryption to collector

**Recommendations**:

- Use trusted OTLP collector (Honeycomb, Jaeger)
- Review trace data retention policies
- Implement span attribute filtering if needed

### 3. Input Sanitization

**Current Implementation**: Sanitization in template generation

**Security Level**: High

- ✅ Prevents XSS attacks
- ✅ Prevents template injection
- ✅ Length limits to prevent DoS
- ✅ No eval() or dynamic code execution

**Coverage**:

- ✅ Pattern search queries
- ✅ Custom names and inputs
- ✅ All user-provided strings

### 4. Dependency Management

**Process**:

- Weekly automated scans (GitHub Dependabot)
- Manual review before major version updates
- Frozen lockfile in production

**Current Status**:

- 0 critical vulnerabilities
- 0 high vulnerabilities
- 0 moderate vulnerabilities
- 1 low vulnerability (Vite - dev dependency only)

Last audit: 2025-01-10

### 5. Environment Variables

**Sensitive Variables**:

- `PATTERN_API_KEY`: API authentication key
- `OTLP_HEADERS`: May contain OTLP auth tokens

**Protection**:

- ✅ Stored encrypted in Vercel
- ✅ Never logged or exposed in responses
- ✅ Separate keys per environment
- ✅ Not accessible from client-side code

### 6. CORS Configuration

**Current**: Same-origin only (Vercel default)

**Rationale**: API is server-to-server, no browser clients

**Future**: If browser clients added, implement strict CORS:

```typescript
headers: {
  'Access-Control-Allow-Origin': 'https://effectpatterns.com',
  'Access-Control-Allow-Methods': 'GET, POST',
  'Access-Control-Allow-Headers': 'x-api-key, Content-Type',
  'Access-Control-Max-Age': '86400',
}
```

## Security Features

### ✅ Implemented

- **HTTPS Only**: Enforced by Vercel
- **API Key Authentication**: Required for all protected endpoints
- **Input Sanitization**: All user inputs sanitized
- **Effect Error Handling**: Type-safe, no unhandled exceptions
- **Dependency Scanning**: Automated via GitHub Dependabot
- **No Secrets in Code**: All secrets via environment variables
- **Audit Logging**: Via OpenTelemetry traces
- **Secure Defaults**: Fail-closed authentication

### 🚧 Planned

- **Rate Limiting**: Per API key limits
- **API Key Rotation**: Automated quarterly rotation
- **Request Monitoring**: Real-time anomaly detection
- **Intrusion Detection**: Automated threat detection
- **Security Headers**: Content-Security-Policy, etc.

## Compliance

### GDPR

**Status**: Compliant

- ✅ No personal data collected
- ✅ No user accounts or authentication
- ✅ No cookies or tracking
- ✅ Logs contain no PII
- ✅ Trace IDs are non-identifying

### OWASP Top 10

We follow OWASP API Security Top 10 best practices:

- ✅ Broken Object Level Authorization: N/A (no user objects)
- ✅ Broken Authentication: Mitigated (API key auth)
- ⚠️ Unrestricted Resource Consumption: Partial (Vercel limits)
- ✅ Security Misconfiguration: Secure defaults
- ✅ All other risks: N/A or mitigated

### CWE Top 25

Protection against common weaknesses:

- ✅ CWE-79 (XSS): Input sanitization
- ✅ CWE-89 (SQL Injection): No SQL database
- ✅ CWE-22 (Path Traversal): No file system access
- ✅ CWE-78 (OS Command Injection): No shell commands
- ✅ CWE-94 (Code Injection): No eval() or Function()
- ✅ CWE-798 (Hard-coded Credentials): Env vars only

## Security Updates

We publish security advisories for:

- Critical: Immediately
- High: Within 7 days
- Medium: Within 30 days
- Low: Next scheduled release

Subscribe to security updates:

- Watch this repository on GitHub
- Enable GitHub security alerts
- Follow [@EffectPatterns](https://twitter.com/effectpatterns) (if applicable)

## Security Contacts

- **Security Team**: [security@effectpatterns.com](mailto:security@effectpatterns.com)
- **Maintainers**: See [CODEOWNERS](.github/CODEOWNERS)
- **GitHub Security Advisories**: [Create Advisory](https://github.com/PaulJPhilp/Effect-Patterns/security/advisories/new)

## Attribution

We appreciate responsible disclosure. Security researchers who report valid vulnerabilities will be:

- Acknowledged in release notes (unless you prefer anonymity)
- Listed in our [Security Hall of Fame](./SECURITY_HALL_OF_FAME.md)
- Eligible for swag/recognition (if program established)

## Resources

- [API Key Rotation Guide](./services/mcp-server/API_KEY_ROTATION.md)
- [Security Audit Report](./SECURITY_AUDIT_REPORT.md)
- [Deployment Security](./services/mcp-server/DEPLOYMENT.md#security-checklist)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Effect Security](https://effect.website/docs/guides/security)

---

**Last Updated**: 2025-01-10
**Next Review**: 2025-04-10 (Quarterly)
