# Supermemory Integration Strategy

## Architecture Understanding

The coding-agent-template uses **CLI-based agents** that run in sandboxes, not direct AI SDK integrations:

- **Claude Code CLI** (`@anthropic-ai/claude-code`) - installed in sandbox
- **Cursor CLI** - external tool
- **OpenAI Codex CLI** - external tool
- **Gemini CLI** - external tool
- etc.

These agents execute as **subprocess commands** in isolated Vercel sandboxes. We cannot inject AI SDK tools into these external CLI processes.

## Integration Options

### Option 1: MCP Server Integration (RECOMMENDED)

Use the **Model Context Protocol (MCP)** which Claude Code CLI already supports.

**How it works**:
1. Create an MCP server that exposes Supermemory functionality
2. Configure it in the user's "Connectors" tab
3. Claude Code CLI will automatically connect to it
4. Memory tools become available to Claude during task execution

**Implementation**:
```typescript
// Create: app/code-assistant/lib/mcp-servers/supermemory-mcp.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';

const server = new Server(
  {
    name: 'supermemory-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register Supermemory tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'add_memory',
        description: 'Add information to long-term memory',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['content'],
        },
      },
      {
        name: 'search_memories',
        description: 'Search long-term memory',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: ['query'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  // Call Supermemory API based on request.params.name
  // Return results
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

**User Setup**:
1. User adds MCP server in Connectors tab
2. Server URL: `http://localhost:3001/mcp/supermemory` (or similar)
3. Environment vars: `SUPERMEMORY_API_KEY`

**Pros**:
- ✅ Works with Claude Code CLI (official MCP support)
- ✅ No modifications to coding-agent-template needed
- ✅ Reusable for other applications
- ✅ Standard MCP protocol

**Cons**:
- ⚠️ Requires MCP server implementation
- ⚠️ Only works with Claude agent (other agents don't support MCP)
- ⚠️ Needs infrastructure to run MCP server

### Option 2: Wrapper Agent with AI SDK

Create a **custom agent** that uses AI SDK directly instead of CLI tools.

**Implementation**:
```typescript
// Create: app/code-assistant/lib/sandbox/agents/supermemory-claude.ts

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';

export async function executeSupermemoryClaudeInSandbox(
  sandbox: Sandbox,
  instruction: string,
  logger: TaskLogger,
  selectedModel?: string,
) {
  const apiKey = process.env.SUPERMEMORY_API_KEY;

  // Get conversation history from database
  const messages = await getTaskMessages(taskId);

  // Use AI SDK with Supermemory tools
  const result = await streamText({
    model: anthropic(selectedModel || 'claude-3-5-sonnet-20241022'),
    messages: [
      { role: 'system', content: 'You are a coding assistant with memory.' },
      ...messages,
      { role: 'user', content: instruction },
    ],
    tools: apiKey ? {
      ...supermemoryTools(apiKey, {
        containerTags: ['user_preferences', 'coding_context'],
      }),
      // Could add Effect Pattern tools here
    } : {},
  });

  // Execute code changes in sandbox
  // ...
}
```

**Pros**:
- ✅ Direct Supermemory integration with AI SDK
- ✅ Can add custom Effect Pattern tools
- ✅ Full control over conversation flow
- ✅ No external MCP server needed

**Cons**:
- ❌ Requires building custom agent implementation
- ❌ Doesn't use Claude Code CLI (loses its capabilities)
- ❌ Need to implement file editing, git operations, etc.
- ❌ More complex to maintain

### Option 3: Hybrid - MCP + Custom Tools

Best of both worlds: Use Claude Code CLI + add a secondary chat endpoint for pattern queries.

**Architecture**:
```
User Message → Task API
├─ Coding Task → Claude Code CLI in Sandbox (with MCP for memory)
└─ Pattern Question → Direct AI SDK + Supermemory + Effect Tools
```

**Implementation**:
```typescript
// Create: app/code-assistant/app/api/chat/route.ts

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';
import { searchPatterns } from '@effect-patterns/toolkit';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    tools: {
      ...supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
        containerTags: ['user_preferences'],
      }),
      searchPatterns: {
        description: 'Search Effect Patterns library',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          return await searchPatterns({ query });
        },
      },
    },
    system: `You are an Effect-TS expert with access to:
    - Memory tools (addMemory, searchMemories)
    - Pattern library (searchPatterns)

    Help users learn Effect patterns and remember their preferences.`,
  });

  return result.toTextStreamResponse();
}
```

**Usage**:
- **Task Mode**: Full coding with Claude Code CLI (+ MCP for memory)
- **Chat Mode**: Quick questions with Supermemory + Effect Patterns

**Pros**:
- ✅ Supermemory works in chat mode (easy to test Drop 2)
- ✅ Can add Effect Pattern tools
- ✅ Claude Code CLI for actual coding tasks
- ✅ Best user experience

**Cons**:
- ⚠️ Two separate modes/interfaces
- ⚠️ More code to maintain

## Recommendation for Phase 1 (Drop 2)

**Use Option 3 (Hybrid)**

**Why**:
1. You can test Supermemory in simple chat mode immediately
2. No need to build MCP server yet
3. Can add Effect Pattern tools alongside Supermemory
4. Keeps all benefits of coding-agent-template
5. Clear path to Phase 2 (add MCP server for task mode)

**Steps**:
1. Create `/api/chat/route.ts` with AI SDK + Supermemory (like old chat-assistant)
2. Add a "Chat" tab or mode to the UI
3. Test Supermemory there → Drop 2 validated
4. Later: Add MCP server for Claude Code CLI integration

## Implementation Guide

See `SUPERMEMORY_HYBRID_SETUP.md` for detailed implementation steps.

## Testing Drop 2

**Goal**: Verify Supermemory works

**Test in Chat Mode**:
1. Start chat: "Remember that I prefer Effect.gen over .pipe"
2. New session: "What do you know about my coding preferences?"
3. If it remembers → ✅ Drop 2 complete

**Later (Phase 2)**: Add MCP server so memory works in Task mode too.
