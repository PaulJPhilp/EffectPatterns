# Vercel + Neon Setup Guide

**Perfect!** Since you're using Vercel, the database setup is much easier.

## Option 1: Deploy to Vercel (Automatic Database)

The easiest way - Vercel will auto-provision Neon database:

### Step 1: Push to GitHub

```bash
# From project root
cd /Users/paul/Projects/In-Progress/Effect-Patterns
git add app/code-assistant
git commit -m "Add code-assistant with Supermemory integration"
git push
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel will detect it's a monorepo
5. **Root Directory**: Set to `app/code-assistant`
6. **Framework Preset**: Next.js (should auto-detect)

### Step 3: Add Postgres Storage

During deployment or after:

1. In your Vercel project dashboard
2. Go to "Storage" tab
3. Click "Create Database"
4. Select "Postgres" (powered by Neon)
5. Click "Continue"
6. Database is created and **POSTGRES_URL is automatically added**

### Step 4: Add Environment Variables

In Vercel project settings → "Environment Variables", add:

**Required:**
```
ANTHROPIC_API_KEY=your-anthropic-api-key
SUPERMEMORY_API_KEY=your-supermemory-api-key
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_AUTH_PROVIDERS=github
```

**Security Keys** (generate with `openssl rand -base64 32`):
```
JWE_SECRET=wElMVWmbg+lZHxZcGQ2qZMLDIxI4sKwo49JAvptenpA=
ENCRYPTION_KEY=mO5P/FDZ6mO6JB9L4Ya+Dqk2uOQnT6cAikc4H//cS2U=
```

**GitHub OAuth** (create production app):
```
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_secret
```

### Step 5: Create Production GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: `Code Assistant`
   - **Homepage URL**: `https://your-app.vercel.app`
   - **Callback URL**: `https://your-app.vercel.app/api/auth/github/callback`
4. Copy Client ID and Secret to Vercel env vars

### Step 6: Redeploy

After adding env vars, trigger a redeploy in Vercel.

---

## Option 2: Use Existing Vercel Database for Local Dev

If you already have a Neon database through Vercel, you can use it locally:

### Get Connection String from Vercel

1. Go to your Vercel project
2. Click "Storage" tab
3. Select your Postgres database
4. Click ".env.local" tab
5. Copy the `POSTGRES_URL` value

### Add to Local .env.local

```bash
# In app/code-assistant/.env.local
POSTGRES_URL=postgresql://neondb_owner:xxx@ep-xxx.aws.neon.tech/neondb?sslmode=require
```

Then continue with local setup:

```bash
# Install dependencies
cd /Users/paul/Projects/In-Progress/Effect-Patterns
pnpm install

# Push database schema
cd app/code-assistant
pnpm db:push

# Run locally
pnpm dev
```

---

## Option 3: Local Dev with Separate Neon Database

If you want to keep production and development databases separate:

1. Go to https://neon.tech directly
2. Create a new project: `code-assistant-dev`
3. Copy connection string
4. Add to local `.env.local`

This way:
- **Production** (Vercel): Uses Vercel-provisioned Neon DB
- **Development** (Local): Uses separate Neon DB

---

## Recommended Approach

**For you**, I recommend:

### For Local Development:
Use **Option 2** - Reuse your Vercel Neon database

**Why:**
- ✅ No need to create another database
- ✅ Test with same data as production
- ✅ Simple - just copy connection string

### For Production:
Use **Option 1** - Deploy to Vercel with auto-provisioned DB

**Why:**
- ✅ Automatic database setup
- ✅ Automatic environment variable injection
- ✅ Serverless, scales automatically
- ✅ No manual configuration needed

---

## Which GitHub OAuth Callback URL?

### For Local Development:
```
http://localhost:3000/api/auth/github/callback
```

### For Production (Vercel):
```
https://your-app.vercel.app/api/auth/github/callback
```

### Both:
You can create **2 separate OAuth apps** (recommended):
- One for local dev
- One for production

Or use **1 OAuth app** with multiple callback URLs:
1. Edit your OAuth app
2. Add both callback URLs (comma-separated won't work, but GitHub allows adding multiple)

Actually, GitHub only allows **one callback URL per OAuth app**, so create 2 apps:

**Local Dev OAuth App:**
- Name: `Code Assistant (Local)`
- Homepage: `http://localhost:3000`
- Callback: `http://localhost:3000/api/auth/github/callback`
- Use in local `.env.local`

**Production OAuth App:**
- Name: `Code Assistant`
- Homepage: `https://your-app.vercel.app`
- Callback: `https://your-app.vercel.app/api/auth/github/callback`
- Use in Vercel environment variables

---

## Summary: Vercel-Optimized Setup

### For Local Development (Fastest):

1. ✅ API keys already in `.env.local`
2. Get Neon connection string from Vercel → add to local `.env.local`
3. Create local GitHub OAuth app → add to `.env.local`
4. Run: `pnpm install && pnpm db:push && pnpm dev`
5. Test at `http://localhost:3000/chat`

**Time: ~5 minutes**

### For Production (When Ready):

1. Push code to GitHub
2. Deploy to Vercel
3. Add Postgres storage (auto-creates Neon DB)
4. Add environment variables
5. Create production GitHub OAuth app
6. Redeploy
7. Test at `https://your-app.vercel.app/chat`

**Time: ~10 minutes**

---

## Next Step

**What's easiest for you right now:**

Do you want to:

**A) Test locally first** → Get Neon connection string from existing Vercel project
**B) Deploy to Vercel** → Let Vercel auto-setup everything
**C) Create separate dev database** → Fresh Neon project for development

Let me know and I can guide you through whichever path you choose!

For **Drop 2 testing** (Supermemory), **Option A** is fastest - you're literally 5 minutes away from testing.
