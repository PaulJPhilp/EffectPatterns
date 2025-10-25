# API Keys Copied from chat-assistant

**Date**: 2025-10-23

## ✅ Keys Copied

The following API keys were copied from `app/chat-assistant/.env.local`:

### 1. OpenAI API Key
```bash
OPENAI_API_KEY=your-openai-api-key
```
**Used for**: OpenAI Codex agent, OpenCode agent

### 2. Google Gemini API Key
```bash
GEMINI_API_KEY=your-gemini-api-key
```
**Used for**: Gemini agent

### 3. Supermemory API Key (Commented Out)
```bash
# SUPERMEMORY_API_KEY=your-supermemory-api-key
```
**Used for**: Memory features in Chat mode
**Status**: Currently commented out - uncomment to enable

## 🔲 Still Need to Configure

These keys are NOT in chat-assistant and need to be obtained separately:

### Required for Basic Functionality

1. **Database URL** (POSTGRES_URL)
   - Get from: https://neon.tech (recommended)
   - Or use local: `postgresql://localhost:5432/code_assistant`

2. **GitHub OAuth** (NEXT_PUBLIC_GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
   - Create at: https://github.com/settings/developers
   - Callback: `http://localhost:3000/api/auth/github/callback`

3. **Anthropic API Key** (ANTHROPIC_API_KEY)
   - Get from: https://console.anthropic.com
   - **Required for Chat mode** with Claude

### Required for Task Mode (Sandbox Execution)

4. **Vercel Sandbox Credentials**
   - SANDBOX_VERCEL_TEAM_ID
   - SANDBOX_VERCEL_PROJECT_ID
   - SANDBOX_VERCEL_TOKEN
   - Get from: https://vercel.com/dashboard

## Summary of Current .env.local Status

| Variable | Status | Source |
|----------|--------|--------|
| JWE_SECRET | ✅ Set | Generated |
| ENCRYPTION_KEY | ✅ Set | Generated |
| POSTGRES_URL | ❌ Need to configure | You must add |
| SANDBOX_VERCEL_TEAM_ID | ❌ Need to configure | You must add |
| SANDBOX_VERCEL_PROJECT_ID | ❌ Need to configure | You must add |
| SANDBOX_VERCEL_TOKEN | ❌ Need to configure | You must add |
| NEXT_PUBLIC_GITHUB_CLIENT_ID | ❌ Need to configure | You must add |
| GITHUB_CLIENT_SECRET | ❌ Need to configure | You must add |
| ANTHROPIC_API_KEY | ❌ Need to configure | You must add |
| SUPERMEMORY_API_KEY | ⚠️ Available (commented) | Copied from chat-assistant |
| GEMINI_API_KEY | ✅ Set | Copied from chat-assistant |
| OPENAI_API_KEY | ✅ Set | Copied from chat-assistant |

## Next Steps

### Minimum for Chat Mode Testing

To test Chat mode with Supermemory (Drop 2), you need:

1. ✅ ~~OpenAI key~~ (done)
2. ✅ ~~Gemini key~~ (done)
3. ⚠️ Uncomment Supermemory key
4. ❌ Get Anthropic API key
5. ❌ Get Database URL (Neon recommended)
6. ❌ Create GitHub OAuth app

### Commands to Run After Configuration

```bash
# 1. Uncomment Supermemory key in .env.local
# Edit line 52: Remove the leading #

# 2. Install dependencies (from project root)
cd ../..
pnpm install

# 3. Setup database (from code-assistant)
cd app/code-assistant
pnpm db:push

# 4. Start app
pnpm dev

# 5. Test at http://localhost:3000/chat
```

## How to Uncomment Supermemory Key

Edit `app/code-assistant/.env.local` line 52:

**Before**:
```bash
# SUPERMEMORY_API_KEY=sm_yPeb4zHQZn9RrvJS1RFCK8_BraHxTFFxNELkZHslVJeYNCiWWBkIKCQZEzggonFykeUVEaDGFEyZYTmtrsFJXKm
```

**After**:
```bash
SUPERMEMORY_API_KEY=sm_yPeb4zHQZn9RrvJS1RFCK8_BraHxTFFxNELkZHslVJeYNCiWWBkIKCQZEzggonFykeUVEaDGFEyZYTmtrsFJXKm
```

## Documentation

Follow these guides in order:

1. **SETUP_CHECKLIST.md** - Complete step-by-step setup
2. **SUPERMEMORY_SETUP.md** - Testing Supermemory (Drop 2)
3. This file - Reference for copied keys

---

**Status**: Partial setup complete. Need to add: Database, GitHub OAuth, and Anthropic API key.
