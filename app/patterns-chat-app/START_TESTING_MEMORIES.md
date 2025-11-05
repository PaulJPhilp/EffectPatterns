# How to Start Testing Memories - Quick Start

## TL;DR - Fastest Way to Test

```bash
# 1. Navigate to code-assistant
cd /Users/paul/Projects/Published/Effect-Patterns/app/code-assistant

# 2. Install and start
pnpm install
pnpm dev

# 3. Open browser
# http://localhost:3002 (or available port)

# 4. Create test conversations in /chat
# Have at least 3 conversations with different topics

# 5. Test memories
# Go to /memories → Click "🔍 Browse" tab

# 6. Search and filter
# Try: "error handling", "async", "performance"
```

## Step-by-Step Setup

### Step 1: Install Dependencies

```bash
cd /Users/paul/Projects/Published/Effect-Patterns/app/code-assistant

# Clear old node_modules if needed
rm -rf node_modules pnpm-lock.yaml

# Install fresh
pnpm install

# Verify build
pnpm build
```

**Expected Output:**
```
✓ Compiled successfully
✓ TypeScript (no errors)
✓ Generating static pages (18/18)
```

### Step 2: Configure Environment

The app needs environment variables. Create or update `.env.local`:

```bash
# Copy template if exists
cp .env.local.example .env.local

# Or create manually with:
cat > .env.local << 'EOF'
# Database (Required)
POSTGRES_URL="postgresql://..."

# Authentication (Required for OAuth)
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# API Keys (Optional)
ANTHROPIC_API_KEY="your_anthropic_key"
SUPERMEMORY_API_KEY="your_supermemory_key"

# Security (Generate with: openssl rand -hex 32)
JWE_SECRET="your_jwe_secret"
ENCRYPTION_KEY="your_encryption_key"

# Optional: Sandbox for code execution
SANDBOX_VERCEL_TEAM_ID="optional"
SANDBOX_VERCEL_PROJECT_ID="optional"
SANDBOX_VERCEL_TOKEN="optional"

# Optional: Other AI providers
OPENAI_API_KEY="optional"
GEMINI_API_KEY="optional"
EOF
```

### Step 3: Initialize Database

```bash
# Push migrations
pnpm db:push

# Or generate and migrate if needed
pnpm db:generate
pnpm db:migrate
```

**Expected Output:**
```
✅ Migrations completed in XXms
```

### Step 4: Start Development Server

```bash
pnpm dev
```

**Expected Output:**
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3002
  - Environment: .env.local

Ready in 2.3s
```

Open browser to the URL shown (usually `http://localhost:3002`)

### Step 5: Create Test Conversations

Navigate to the chat interface and create at least 3 conversations:

**Conversation 1: Error Handling**
```
You: "How do I handle errors in Effect-TS?"
AI: [Response about error handling with examples]
You: "Thanks, this really helps!"
AI: [Closing message]
```

**Conversation 2: Async Patterns**
```
You: "What are best practices for async operations?"
AI: [Response about async patterns]
You: "Perfect, I understand now"
```

**Conversation 3: Performance**
```
You: "How can I optimize performance?"
AI: [Response about optimization]
```

**Important:** Have actual back-and-forth conversations so the system can:
- Extract meaningful topics
- Assign tags
- Calculate satisfaction
- Detect if conversation was solved

### Step 6: Navigate to Memories

```
URL: http://localhost:3002/memories
```

**What you should see:**
- Header: "💾 Memories"
- Two tabs: "📚 Guide" | "🔍 Browse"
- Guide tab active by default with educational content

### Step 7: Test Browse Tab

Click "🔍 Browse" tab

**You should see:**
- Search input with placeholder: "Search memories..."
- Outcome dropdown (All Outcomes)
- Tag filter pills (effect-ts, error-handling, async, etc.)
- Active filters summary (if any filters applied)
- Tips section with search advice

## Testing Scenarios

### Scenario 1: Basic Search

```
1. Click Browse tab
2. Type: "error"
3. Click Search
4. Should see MemoryCard(s) about error handling
```

**Verify:**
- ✅ Results display
- ✅ Card shows title, timestamp, outcome, tags
- ✅ Count shows: "Showing X of Y memories"

### Scenario 2: Tag Filtering

```
1. Type search: "handling"
2. Click tag: "error-handling"
3. Results should narrow
```

**Verify:**
- ✅ Tag badge changes style (darker)
- ✅ Results update
- ✅ Active filters banner shows the tag

### Scenario 3: Outcome Filtering

```
1. Type search: "async"
2. Click outcome dropdown
3. Select "Solved"
4. Results show only solved conversations
```

**Verify:**
- ✅ Dropdown opens
- ✅ Selection works
- ✅ Results filter correctly

### Scenario 4: Infinite Scroll

```
1. Search for common term (should have 20+ results)
2. Scroll to bottom of visible results
3. Should see "Loading more..." indicator
4. More results appear automatically
```

**Verify:**
- ✅ Loading indicator appears
- ✅ Spinner animates
- ✅ New results append (not replace)
- ✅ Count updates: "Showing 40 of Y"

### Scenario 5: Mobile Testing

```
1. Open DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Select "iPhone 12"
4. Refresh page
```

**Verify:**
- ✅ Layout stacks vertically
- ✅ Search input is full-width
- ✅ Tags wrap appropriately
- ✅ Cards are readable
- ✅ Infinite scroll works on mobile

## Troubleshooting

### Problem: "Port already in use"

```bash
# Find process using port 3002
lsof -i :3002

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3003 pnpm dev
```

### Problem: Database errors

```bash
# Check database connection
echo $POSTGRES_URL

# Reset database (careful!)
pnpm db:push --force

# Or check migrations
pnpm db:generate
```

### Problem: No search results

**Possible causes:**
1. No conversations created yet → Create test conversations
2. Conversations too recent → Give system time to process
3. Search terms don't match → Try broader searches
4. Database issue → Check `pnpm db:push`

**Solution:**
```bash
# Verify database has data
# Check in DB admin console or run:
# SELECT COUNT(*) FROM conversations;
```

### Problem: Build errors

```bash
# Clear build cache
rm -rf .next node_modules pnpm-lock.yaml

# Reinstall and rebuild
pnpm install
pnpm build
```

### Problem: TypeScript errors

```bash
# Check types
pnpm typecheck

# If errors, verify components import correctly
# Look for missing files or type mismatches
```

## Key Files to Know

### Components
```
components/
├── memories-browser.tsx    ← Main browsing component
├── memory-card.tsx         ← Individual memory display
├── memory-search.tsx       ← Search & filters
└── ui/
    └── alert.tsx           ← Alert for errors
```

### Pages
```
app/(chat)/
├── memories/
│   └── page.tsx            ← /memories route
└── api/
    └── search/
        └── route.ts        ← /api/search endpoint
```

### Backend
```
lib/semantic-search/
└── search.ts               ← Search logic & pagination
```

## API Endpoints

### Search Memories

**GET** `/api/search?q=query&limit=20&offset=0`

**Parameters:**
- `q` - Search query (required)
- `limit` - Results per page (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)
- `tag` - Filter by tag (optional)
- `outcome` - Filter by outcome (optional)

**Response:**
```json
{
  "query": "error",
  "offset": 0,
  "limit": 20,
  "total": 47,
  "hasMore": true,
  "nextOffset": 20,
  "count": 20,
  "results": [...]
}
```

**Examples:**
```bash
# Basic search
curl "http://localhost:3002/api/search?q=error"

# With pagination
curl "http://localhost:3002/api/search?q=error&offset=20"

# With filters
curl "http://localhost:3002/api/search?q=error&tag=error-handling&outcome=solved"
```

## Performance Baseline

These are expected metrics for good performance:

| Operation | Target | Status |
|-----------|--------|--------|
| Page load | <2s | ✅ |
| First search | <500ms | ✅ |
| Pagination | <300ms | ✅ |
| Tab switch | <50ms | ✅ |
| Infinite scroll | Smooth 60fps | ✅ |

**Check in DevTools:**
1. Open Network tab
2. Perform search
3. Check request duration
4. Check response size

## Browser Console Tips

**Check if component mounted:**
```javascript
// In DevTools console
console.log("Checking React DevTools...")
// Should show React component tree
```

**Verify API responses:**
```javascript
// In DevTools Network tab
// Click on /api/search request
// Check Response tab for JSON data
// Verify structure matches expected format
```

**Check localStorage (if used):**
```javascript
// In DevTools console
localStorage.getItem('memories-state')
```

## Debugging Checklist

- [ ] Dev server running (`pnpm dev`)
- [ ] Browser at correct URL (`http://localhost:3002/memories`)
- [ ] Database connected (check `.env.local`)
- [ ] Test conversations created in `/chat`
- [ ] DevTools open (F12) to check errors
- [ ] No JavaScript errors in console
- [ ] Network tab shows API calls working
- [ ] Search results display when expected
- [ ] Mobile view responsive
- [ ] No TypeScript errors (`pnpm typecheck`)

## What Success Looks Like

✅ **You'll know it's working when:**

1. **Navigation works**
   - Click tabs → they switch
   - Click back/forward → works

2. **Search works**
   - Enter query → Results display
   - Results show memory cards
   - Count updates correctly

3. **Filtering works**
   - Click tag → Results filter
   - Click outcome → Results filter
   - Multiple filters AND together

4. **Infinite scroll works**
   - Scroll down → Loading indicator
   - More results load automatically
   - "Loading more..." appears then disappears

5. **UI is responsive**
   - Desktop: Optimal layout
   - Mobile: Stacked layout
   - No broken elements

6. **No errors**
   - Console is clean
   - No red alerts
   - Network tab shows 200 status codes

## Next Steps After Testing

### If Everything Works ✅
1. Create PR with changes
2. Deploy to staging
3. Full QA testing
4. Deploy to production

### If Issues Found 🔧
1. Check error messages
2. Verify database data
3. Check component props
4. Review console errors
5. Debug in DevTools

## Additional Resources

**Documentation:**
- `MEMORIES_BROWSER_COMPONENT.md` - Component API
- `MEMORY_CARD_COMPONENT.md` - Card details
- `MEMORY_SEARCH_COMPONENT.md` - Search details
- `TESTING_MEMORIES_GUIDE.md` - Comprehensive testing

**Related:**
- `/memories` page route
- `/api/search` endpoint
- Supermemory integration
- Auto-tagging system

## Getting Help

If you encounter issues:

1. **Check the docs** - See files listed above
2. **Check console errors** - DevTools → Console
3. **Check network** - DevTools → Network
4. **Check database** - Verify migrations ran
5. **Restart dev server** - Sometimes fixes issues

---

## Quick Command Reference

```bash
# Start fresh
cd app/code-assistant
rm -rf node_modules .next pnpm-lock.yaml
pnpm install
pnpm db:push
pnpm dev

# Type checking
pnpm typecheck

# Build for production
pnpm build

# Run tests
pnpm test

# Database
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio

# Format code
pnpm lint
```

---

**Last Updated:** 2025-11-01

**Status:** ✅ Ready for Testing

Start with the TL;DR section above, then follow the step-by-step setup for detailed configuration.
