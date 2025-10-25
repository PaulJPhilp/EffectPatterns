# Code Assistant Setup Guide

This is the Vercel coding-agent-template integrated into the Effect Patterns Hub project.

## Phase 1: Basic Setup (Current)

Goal: Get the chat interface running for testing Supermemory integration.

### Quick Start

1. **Install dependencies**:
   ```bash
   cd app/code-assistant
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your values
   ```

3. **Required Environment Variables**:

   **Database** (use local PostgreSQL or Neon):
   ```bash
   POSTGRES_URL=postgresql://user:password@localhost:5432/code_assistant
   ```

   **Vercel Sandbox** (get from https://vercel.com/account/tokens):
   ```bash
   SANDBOX_VERCEL_TEAM_ID=your_team_id
   SANDBOX_VERCEL_PROJECT_ID=your_project_id
   SANDBOX_VERCEL_TOKEN=your_token
   ```

   **Security** (generate with `openssl rand -base64 32`):
   ```bash
   JWE_SECRET=<generated_secret>
   ENCRYPTION_KEY=<generated_secret>
   ```

   **Authentication** (GitHub OAuth):
   ```bash
   NEXT_PUBLIC_AUTH_PROVIDERS=github
   NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

   **AI Provider**:
   ```bash
   ANTHROPIC_API_KEY=your_anthropic_key  # For Claude Code agent
   ```

   **Supermemory** (for testing):
   ```bash
   SUPERMEMORY_API_KEY=your_supermemory_key
   ```

4. **Set up database**:
   ```bash
   pnpm db:push
   ```

5. **Run development server**:
   ```bash
   pnpm dev
   ```

6. **Access the app**:
   - Open http://localhost:3000
   - Sign in with GitHub
   - Create a task to test

### GitHub OAuth Setup

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Effect Patterns Code Assistant
   - **Homepage URL**: http://localhost:3000
   - **Authorization callback URL**: http://localhost:3000/api/auth/github/callback
4. Copy Client ID and Client Secret to `.env.local`

### Database Setup Options

**Option 1: Local PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb code_assistant

# Use in .env.local
POSTGRES_URL=postgresql://localhost:5432/code_assistant
```

**Option 2: Neon (Serverless)**
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string to `.env.local`

**Option 3: Use Vercel's Neon integration**
- Deploy to Vercel and it auto-provisions Neon DB

## Testing Supermemory (Drop 2 Goal)

Once the basic setup works, test Supermemory integration:

1. Add `SUPERMEMORY_API_KEY` to `.env.local`
2. The chat interface should be able to use memory tools
3. Test with commands like "Remember that I prefer Effect.gen" and "What do you know about my preferences?"

## Next Steps (After Phase 1)

- [ ] Integrate Effect Patterns toolkit
- [ ] Add custom Effect-specific tools
- [ ] Configure chat-only mode (disable auto-commits)
- [ ] Add pattern search functionality
- [ ] Test code review workflows

## Troubleshooting

**Database connection issues**:
- Check that PostgreSQL is running: `brew services list`
- Test connection: `psql $POSTGRES_URL`

**OAuth errors**:
- Verify callback URL matches exactly in GitHub settings
- Check that CLIENT_ID and CLIENT_SECRET are correct

**Sandbox errors**:
- Verify Vercel token has correct permissions
- Check team ID and project ID are accurate

**Build errors**:
- Try `rm -rf .next && pnpm install`
- Check Node version: requires Node 18+

## Resources

- Original template: https://github.com/vercel-labs/coding-agent-template
- Vercel Sandbox docs: https://vercel.com/docs/vercel-sandbox
- AI SDK docs: https://ai-sdk.dev
