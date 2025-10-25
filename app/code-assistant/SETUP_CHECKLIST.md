# Code Assistant Setup Checklist

**Status**: `.env.local` created with encryption keys ✅
**Next**: Fill in the required values below

---

## ✅ Step 1: Encryption Keys (DONE)

- ✅ `JWE_SECRET` - Generated and set
- ✅ `ENCRYPTION_KEY` - Generated and set

---

## 🔲 Step 2: Database Setup

**Choose ONE option:**

### Option A: Neon (Recommended - Easiest)

1. Go to https://neon.tech
2. Sign up / Sign in
3. Click "Create Project"
4. Name: `code-assistant`
5. Region: Choose closest to you
6. Click "Create Project"
7. **Copy the connection string** shown
8. Paste into `.env.local`:
   ```bash
   POSTGRES_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

**Pros**: Free tier, no local install, serverless, fast setup

### Option B: Local PostgreSQL

1. Install PostgreSQL:
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```

2. Create database:
   ```bash
   createdb code_assistant
   ```

3. Add to `.env.local`:
   ```bash
   POSTGRES_URL=postgresql://localhost:5432/code_assistant
   ```

**Pros**: Free, local control, no external dependencies

### ✅ Verify Database

Once set, you'll run:
```bash
cd app/code-assistant
pnpm db:push
```
(We'll do this in Step 6)

---

## 🔲 Step 3: Vercel Sandbox Credentials

**Required for Task Mode** (coding agent with sandbox execution)

1. Go to https://vercel.com/account/tokens
2. Sign in with GitHub
3. Click "Create Token"
   - Name: `code-assistant-sandbox`
   - Scope: Full Account
   - Expiration: No expiration (or custom)
4. Click "Create"
5. **Copy the token** (save it - you won't see it again!)

6. Get Team ID and Project ID:
   - Go to https://vercel.com/dashboard
   - Select or create a project (any project works)
   - Click on the project
   - URL will be: `https://vercel.com/YOUR_TEAM/YOUR_PROJECT`
   - **Team ID**: The part after `/` (usually your username or team slug)
   - **Project ID**: The project name in the URL

7. Add to `.env.local`:
   ```bash
   SANDBOX_VERCEL_TEAM_ID=your_team_id_or_username
   SANDBOX_VERCEL_PROJECT_ID=your_project_name
   SANDBOX_VERCEL_TOKEN=your_token_here
   ```

**Note**: If you only want to test Chat Mode (Drop 2), you can skip this for now.

---

## 🔲 Step 4: GitHub OAuth Setup

**Required for Authentication**

### 4a. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in:
   - **Application name**: `Code Assistant Local Dev`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
4. Click "Register application"
5. You'll see your **Client ID** - copy it
6. Click "Generate a new client secret"
7. Copy the **Client Secret** (save it - you won't see it again!)

### 4b. Add to .env.local

```bash
NEXT_PUBLIC_GITHUB_CLIENT_ID=Ov23li... (your client ID)
GITHUB_CLIENT_SECRET=ghp_... (your client secret)
```

### ✅ Verify

Auth provider is already set:
```bash
NEXT_PUBLIC_AUTH_PROVIDERS=github
```

---

## 🔲 Step 5: AI Provider Keys

### 5a. Anthropic (Required for Chat Mode)

1. Go to https://console.anthropic.com
2. Sign in / Sign up
3. Go to "API Keys"
4. Click "Create Key"
5. Name: `code-assistant`
6. Copy the key (starts with `sk-ant-...`)

7. Add to `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

### 5b. Supermemory (Required for Drop 2)

1. Go to https://console.supermemory.ai
2. Sign in / Sign up
3. Go to "API Keys"
4. Create or copy your API key
5. Add to `.env.local`:
   ```bash
   SUPERMEMORY_API_KEY=sm_...
   ```

### 5c. Other Providers (Optional)

Only needed if you want to use other agents (Cursor, Gemini, OpenAI):

- **AI Gateway**: https://vercel.com/docs/ai-gateway
- **Cursor**: https://cursor.sh (API key in settings)
- **Gemini**: https://ai.google.dev
- **OpenAI**: https://platform.openai.com/api-keys

---

## 🔲 Step 6: Install Dependencies & Setup Database

### 6a. Install Dependencies

```bash
# From project root
cd /Users/paul/Projects/In-Progress/Effect-Patterns
pnpm install
```

### 6b. Setup Database Schema

```bash
# From code-assistant directory
cd app/code-assistant
pnpm db:push
```

**Expected output**:
```
✓ Pushing schema to database...
✓ Database schema updated successfully
```

If you see errors, check your `POSTGRES_URL` is correct.

---

## 🔲 Step 7: Start the App

```bash
# Make sure you're in code-assistant directory
cd app/code-assistant

# Start development server
pnpm dev
```

**Expected output**:
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.3s
```

---

## 🔲 Step 8: Test Basic Access

### 8a. Open the App

Open http://localhost:3000

### 8b. Sign In

1. Click "Sign in with GitHub"
2. Authorize the OAuth app
3. You should be redirected back to the app
4. You should see your name/avatar in the header

### 8c. Verify Authentication

If sign-in works → ✅ Authentication is configured correctly!

---

## 🔲 Step 9: Test Chat Mode (Drop 2)

### 9a. Access Chat

Navigate to: http://localhost:3000/chat

### 9b. Test Supermemory

**Test sequence**:

1. **Add a memory**:
   ```
   Remember that I prefer Effect.gen over .pipe chains
   ```

   Expected: AI should use `addMemory` tool (you'll see it in the response)

2. **Add another memory**:
   ```
   Remember my coding style: functional, immutable, Effect-first
   ```

3. **Recall memories**:
   ```
   What do you know about my coding preferences?
   ```

   Expected: AI should use `searchMemories` tool and recall both preferences

4. **Verify persistence**:
   - Refresh the page (new session)
   - Ask again: "What do you remember about me?"
   - Should still recall the memories

### 9c. Verify in Supermemory Console

1. Go to https://console.supermemory.ai
2. Navigate to your memories
3. You should see the saved memories with tags like:
   - `user_preferences`
   - `coding_context`
   - `effect_patterns`

### ✅ Success Criteria

- ✅ Chat interface loads
- ✅ AI responds to messages
- ✅ AI uses `addMemory` when you say "remember"
- ✅ AI uses `searchMemories` when asked about preferences
- ✅ Memories persist across sessions
- ✅ Memories visible in Supermemory console

**If all work → Drop 2 validated!** 🎉

---

## 🔲 Step 10: Test Task Mode (Optional)

**Note**: Requires Vercel Sandbox credentials from Step 3

### 10a. Create a Task

1. From home page, click "New Task"
2. Enter a repo URL (e.g., a test repo you own)
3. Enter a simple task: "Add a console.log statement"
4. Select agent: "Claude Code"
5. Click "Create Task"

### 10b. Monitor Execution

- Watch the logs as the sandbox spins up
- See the agent execute
- Check the file changes
- Verify the commit and branch

If this works → ✅ Full platform is working!

---

## Troubleshooting

### Database Connection Failed

**Error**: `Error: connect ECONNREFUSED`

**Solution**:
- Check PostgreSQL is running: `brew services list`
- Verify connection string format
- Try Neon instead (no local install needed)

### GitHub OAuth Fails

**Error**: `redirect_uri_mismatch`

**Solution**:
- Check callback URL in GitHub settings matches exactly:
  `http://localhost:3000/api/auth/github/callback`
- No trailing slash
- Use http (not https) for localhost

### Supermemory Not Working

**Symptoms**: AI doesn't use memory tools

**Check**:
1. `SUPERMEMORY_API_KEY` is set in `.env.local`
2. API key is valid (test in console)
3. Restart dev server after adding key
4. Check browser network tab for tool calls

### Chat Page 401 Error

**Solution**: Sign in at http://localhost:3000 first, then navigate to /chat

### Build Errors

**Solution**:
```bash
rm -rf .next node_modules
pnpm install
pnpm dev
```

---

## Quick Reference

### Minimum Required for Chat Mode (Drop 2)

```bash
# .env.local minimum config
POSTGRES_URL=postgresql://...
NEXT_PUBLIC_AUTH_PROVIDERS=github
NEXT_PUBLIC_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...
SUPERMEMORY_API_KEY=sm_...
JWE_SECRET=... (already set)
ENCRYPTION_KEY=... (already set)
```

### Commands Reference

```bash
# Install
pnpm install

# Database setup
cd app/code-assistant
pnpm db:push

# Development
pnpm dev

# Database management
pnpm db:studio  # Open Drizzle Studio GUI
```

### URLs

- **App**: http://localhost:3000
- **Chat Mode**: http://localhost:3000/chat
- **GitHub OAuth**: https://github.com/settings/developers
- **Neon DB**: https://neon.tech
- **Anthropic**: https://console.anthropic.com
- **Supermemory**: https://console.supermemory.ai
- **Vercel**: https://vercel.com/dashboard

---

## Completion Checklist

- [ ] Database configured (Neon or local PostgreSQL)
- [ ] GitHub OAuth app created and configured
- [ ] Anthropic API key added
- [ ] Supermemory API key added
- [ ] Dependencies installed (`pnpm install`)
- [ ] Database schema pushed (`pnpm db:push`)
- [ ] App runs (`pnpm dev`)
- [ ] Can sign in with GitHub
- [ ] Chat mode accessible at `/chat`
- [ ] Supermemory saves memories
- [ ] Supermemory recalls memories
- [ ] Memories persist across sessions

**When all checked → Environment setup complete!** ✅

---

**Next**: See `SUPERMEMORY_SETUP.md` for detailed testing guide
