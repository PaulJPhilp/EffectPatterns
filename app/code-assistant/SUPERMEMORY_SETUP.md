# Supermemory Integration - Setup Guide

## Implementation Complete ✅

The hybrid Supermemory integration is now ready for testing. Here's what was added:

### Files Created

1. **`app/api/chat/route.ts`** - Standalone chat API with Supermemory
2. **`app/chat/page.tsx`** - Chat interface UI
3. **`SUPERMEMORY_INTEGRATION.md`** - Architecture documentation

### Dependencies Added

- `@ai-sdk/anthropic` - Anthropic provider for AI SDK
- `react-markdown` - Markdown rendering for chat

### How It Works

**Dual-Mode Architecture**:

```
User
├─ Task Mode (/tasks) - Full coding agent with sandbox
│  └─ Uses Claude Code CLI (external tool)
│  └─ TODO: Add MCP server for memory in Phase 2
│
└─ Chat Mode (/chat) - Quick questions and preferences
   └─ Uses AI SDK + Supermemory directly
   └─ Ready for Drop 2 testing NOW
```

## Testing Supermemory (Drop 2)

### Step 1: Add Environment Variable

```bash
cd app/code-assistant

# Add to .env.local
echo "SUPERMEMORY_API_KEY=your_supermemory_key" >> .env.local
```

Get your API key from: https://console.supermemory.ai

### Step 2: Install Dependencies

```bash
# From project root
cd ../..
pnpm install
```

### Step 3: Run the App

```bash
# From code-assistant directory
cd app/code-assistant
pnpm dev
```

### Step 4: Access Chat Mode

1. Open http://localhost:3000/chat
2. Sign in with GitHub (if prompted)
3. Start chatting!

### Step 5: Test Memory

**Test Sequence**:

```
You: "Remember that I prefer Effect.gen over .pipe chains"
AI: [Uses addMemory tool] "I'll remember that..."

You: "Remember my coding style: functional, immutable, Effect-first"
AI: [Uses addMemory tool] "Got it..."

You: "What do you know about my preferences?"
AI: [Uses searchMemories tool] "You prefer Effect.gen over .pipe chains..."
```

**Success Criteria**:
- ✅ AI can save memories with `addMemory`
- ✅ AI can recall memories with `searchMemories`
- ✅ Memories persist across chat sessions
- ✅ Memories are tagged appropriately

### Step 6: Verify in Supermemory Console

1. Go to https://console.supermemory.ai
2. Check your saved memories
3. Should see entries with tags: `user_preferences`, `coding_context`, etc.

## Features Available in Chat Mode

### Current (Phase 1)

- ✅ **Supermemory Integration**
  - Add memories
  - Search memories
  - Tagged by context type
- ✅ **Effect-TS Expertise**
  - Pattern explanations
  - Code examples
  - Best practices
- ✅ **Conversational AI**
  - Streaming responses
  - Markdown formatting
  - Context-aware answers

### Coming Soon (Phase 2)

- ⏸️ **Effect Pattern Search**
  - Uncomment `searchPatterns` tool in `app/api/chat/route.ts`
  - Integrate with `@effect-patterns/toolkit`
- ⏸️ **Code Review Tools**
  - Paste code for review
  - Get pattern-based suggestions
- ⏸️ **MCP Server**
  - Memory in Task mode too
  - Unified experience

## Navigation

To make chat mode easier to access, you can add a link in the sidebar:

**Edit `components/task-sidebar.tsx`** (or wherever navigation is):

```tsx
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

// Add to navigation items
<Link href="/chat">
  <Button variant="ghost" className="w-full justify-start">
    <MessageSquare className="mr-2 h-4 w-4" />
    Chat
  </Button>
</Link>
```

## Troubleshooting

### Chat page shows 401 Unauthorized

**Solution**: Sign in at http://localhost:3000 first, then navigate to /chat

### Supermemory tools not showing

**Check**:
1. `SUPERMEMORY_API_KEY` is set in `.env.local`
2. API key is valid (test at console.supermemory.ai)
3. Check browser console for errors

### AI doesn't use memory tools

**Common reasons**:
- Ask explicitly: "Remember this..." or "What do you know about..."
- Memory tools are automatic but work best with explicit requests
- Check network tab to see tool calls

### React markdown not rendering

**Solution**:
```bash
pnpm install react-markdown
```

## Architecture Notes

### Why Two Modes?

The coding-agent-template uses **CLI-based agents** (Claude Code CLI, Cursor CLI, etc.) that run as external processes in sandboxes. We cannot inject AI SDK tools into these external CLI tools.

**Chat Mode** uses AI SDK directly, giving us full control to add:
- Supermemory tools
- Effect Pattern search
- Custom code review tools
- Any other AI SDK features

**Task Mode** uses the powerful CLI agents for actual coding work, with full sandbox, git integration, and file editing capabilities.

### Future: Unified Experience

In Phase 2, we'll add an MCP server that exposes Supermemory to Claude Code CLI, so memory works in both modes:

```
MCP Server (Supermemory)
├─ Exposed to Claude Code CLI in sandboxes
└─ Same memory accessible in Chat mode
```

## Next Steps

After validating Drop 2 (Supermemory works):

1. **Add Effect Pattern Search**
   - Uncomment tool in `app/api/chat/route.ts`
   - Integrate with `@effect-patterns/toolkit`

2. **Add Navigation**
   - Link to `/chat` in sidebar
   - Make it easy to switch modes

3. **MCP Server (Phase 2)**
   - Create Supermemory MCP server
   - Configure in Connectors tab
   - Memory works in Task mode too

4. **Code Review Tools**
   - AST-based pattern detection
   - Migration analysis
   - Automated refactoring suggestions

## Questions?

See:
- `SUPERMEMORY_INTEGRATION.md` - Architecture details
- `CODE_ASSISTANT_PHASE1.md` - General setup
- Original chat-assistant: `app/chat-assistant/app/api/chat/route.ts`
