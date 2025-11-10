# Effect Patterns Hub v0.5.0 (Beta) Release Notes

**Release Date:** November 9, 2025  
**Type:** Beta Release  
**Breaking Changes:** None

## 🎉 What's New in v0.5.0

### ⚡ Instant API Access (No Installation Required!)

The MCP Server is now **production-ready** and accessible immediately:

```bash
# Just copy and use - no setup needed!
curl -H "x-api-key: demo-beta-2025" \
  "https://mcp-server-three-omega.vercel.app/api/patterns?q=retry"
```

**Key Changes:**
- ✅ **Shared Demo API Key** - `demo-beta-2025` for instant access
- ✅ **Production URL** - https://mcp-server-three-omega.vercel.app
- ✅ **Zero Installation** - No cloning, no dependencies, just use!
- ✅ **Complete Documentation** - Production-focused guides

### 🧪 Comprehensive Testing

All tests passing with proper separation:

```
✓ 33 Unit Tests (passing)
✓ 10 Optional Tests (skipped)
✓ 39 Integration Tests (available)
⚡ 600ms execution time
```

**Testing Improvements:**
- Fixed broken node_modules symlinks
- Separated unit and integration tests
- Optimized Vitest configuration
- Added comprehensive test documentation

### 📚 Revamped Documentation

**New Guides:**
- `MCP_SERVER_SETUP.md` - Production-focused complete guide
- `QUICK_START.md` - 2-minute quick start
- `TESTING.md` - Comprehensive testing guide
- `TEST_STATUS.md` - Current test results
- `FIXES_APPLIED.md` - Detailed fix history

**All examples now use production URLs** - no more localhost!

### 🔧 Technical Improvements

**Fixed:**
- Broken pnpm symlinks in mcp-server/node_modules
- Integration tests timing out without server
- Effect API deprecation (provideContext → provide)
- Version consistency across all files

**Changed:**
- Test runner: `bun test` → `bunx vitest`
- Focus: Local development → Production API
- Onboarding: Clone & install → Copy & use

## 📊 Release Metrics

| Metric | Value |
|--------|-------|
| **Version** | 0.5.0 (Beta) |
| **Unit Tests** | 33 passing |
| **Test Speed** | ~600ms |
| **API Endpoints** | 5 |
| **Patterns** | 150+ |
| **Rate Limit** | 10 req/min (demo key) |
| **Response Time** | <100ms (p95) |

## 🚀 Quick Start

### 1. Test the Server

```bash
curl https://mcp-server-three-omega.vercel.app/api/health
```

### 2. Use the Demo API Key

```bash
# Search patterns
curl -H "x-api-key: demo-beta-2025" \
  "https://mcp-server-three-omega.vercel.app/api/patterns?q=retry"

# Get pattern details
curl -H "x-api-key: demo-beta-2025" \
  https://mcp-server-three-omega.vercel.app/api/patterns/retry-with-backoff

# Generate code snippet
curl -X POST https://mcp-server-three-omega.vercel.app/api/generate \
  -H "x-api-key: demo-beta-2025" \
  -H "Content-Type: application/json" \
  -d '{"patternId":"retry-with-backoff","name":"retryRequest"}'
```

### 3. Integrate with Your Tools

Perfect for:
- Claude Code
- Cursor AI
- GitHub Copilot
- Custom IDE extensions
- CI/CD pipelines
- Pattern discovery tools

## 🗺️ Roadmap

### v0.5.0 (Current - Beta) ✅
- Core API endpoints
- Shared demo API key
- Production deployment
- Comprehensive testing
- Complete documentation

### v1.0 (Planned - Q1 2026) 🎯
- **Self-service API key generation** (web portal)
- **Personal rate limits** (100 req/min per key)
- **Usage analytics dashboard**
- **API key management** (rotation, revocation)
- GraphQL API
- Advanced search features

### v1.1 (Future) 🔮
- WebSocket support
- Pattern contributions via API
- Pattern voting/ratings
- Batch operations
- Multi-language support

## ⚠️ Known Limitations (Beta)

- **Demo Key Shared** - 10 req/min limit is shared across all users
- **No Personal Keys** - Coming in v1.0
- **Rate Limiting** - May experience slowdowns during peak usage
- **Not for Production** - Use for testing and evaluation only

## 🔄 Migration from v0.1.0

**For Existing Users:**

1. Replace your API key:
```bash
# Old (v0.1.0)
x-api-key: your-old-key

# New (v0.5.0)
x-api-key: demo-beta-2025
```

2. Update base URL (if different):
```bash
https://mcp-server-three-omega.vercel.app
```

3. No code changes required!

**For New Users:**
Just start using - no migration needed!

## 🛡️ Security

### Beta Security Model

**Current (v0.5.0):**
- Public shared demo key
- Rate-limited (10 req/min)
- HTTPS enforced
- Input sanitization
- Not for production use

**Coming (v1.0):**
- Personal API keys
- Higher rate limits (100 req/min per key)
- Key rotation and management
- Usage analytics
- Production-ready

### Best Practices

✅ **DO:**
- Use environment variables for keys
- Implement request throttling
- Handle rate limit errors (429)
- Test with demo key first

❌ **DON'T:**
- Use demo key in production
- Commit keys to version control
- Embed keys in client-side code
- Expect high availability during beta

## 📖 Documentation

**Main Guides:**
- [MCP Server Setup Guide](./MCP_SERVER_SETUP.md)
- [Quick Start (2 minutes)](./services/mcp-server/QUICK_START.md)
- [Testing Guide](./services/mcp-server/TESTING.md)
- [Test Status](./services/mcp-server/TEST_STATUS.md)

**Reference:**
- [Changelog](./services/mcp-server/CHANGELOG.md)
- [Roadmap](./ROADMAP.md)
- [Security Policy](./SECURITY.md)
- [Contributing Guide](./docs/CONTRIBUTING.md)

## 🙏 Acknowledgments

Thanks to:
- The Effect-TS team for the amazing framework
- Early beta testers for valuable feedback
- Contributors who helped shape this release

## 🐛 Bug Reports & Feature Requests

- **GitHub Issues:** https://github.com/PaulJPhilp/Effect-Patterns/issues
- **Discussions:** https://github.com/PaulJPhilp/Effect-Patterns/discussions

## 📊 Full Changelog

See [CHANGELOG.md](./services/mcp-server/CHANGELOG.md) for complete details.

## 🎯 Next Steps

1. **Try the API** - Start with the quick start guide
2. **Integrate** - Add to your favorite AI coding tool
3. **Provide Feedback** - Open an issue or discussion
4. **Stay Updated** - Watch the repository for v1.0 announcements

---

**Ready to get started?** Check out the [Quick Start Guide](./services/mcp-server/QUICK_START.md)!

**Questions?** Open a [GitHub Discussion](https://github.com/PaulJPhilp/Effect-Patterns/discussions)

**Found a bug?** [Report it here](https://github.com/PaulJPhilp/Effect-Patterns/issues)

---

**Effect Patterns Hub v0.5.0** - Production API · Zero Installation · Instant Access

Released with ❤️ by the Effect Patterns team

