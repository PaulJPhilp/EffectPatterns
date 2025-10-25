import { streamText, convertToModelMessages } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { supermemoryTools } from '@supermemory/tools/ai-sdk'
import { z } from 'zod'
import { getServerSession } from '@/lib/session/get-server-session'
import { NextResponse } from 'next/server'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

/**
 * POST /api/chat
 *
 * Lightweight chat endpoint for quick questions and pattern queries.
 * This is separate from the task-based coding workflow.
 *
 * Features:
 * - Supermemory integration for user preferences
 * - Effect Pattern search (TODO: integrate @effect-patterns/toolkit)
 * - No sandbox execution - just conversational AI
 */
export async function POST(req: Request) {
  try {
    // Authentication is optional for chat
    const session = await getServerSession().catch(() => null)

    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const providerApiKey = process.env.ANTHROPIC_API_KEY
    if (!providerApiKey) {
      return NextResponse.json(
        { error: 'Server is not configured with ANTHROPIC_API_KEY' },
        { status: 500 },
      )
    }

    const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY
    const hasSupermemory = Boolean(supermemoryApiKey)
    if (hasSupermemory) {
      // console.log('Supermemory enabled')
    } else {
      // console.log('Supermemory disabled')
    }

    // Build system prompt
    const systemPrompt = `You are an expert Effect-TS code assistant with access to specialized tools.

Your role is to help developers learn and write better Effect-TS code by:
1. Answering questions about Effect patterns and best practices
2. Explaining Effect concepts clearly with examples
3. Reviewing code and suggesting improvements
4. Remembering user preferences and context (when memory tools are available)

Be concise, accurate, and prefer Effect.gen for multi-step workflows.
Always emit a short natural-language reply to the user summarizing actions
and results, even when you call tools.
${
  hasSupermemory
    ? `You have access to memory tools:
- Use addMemory when users share preferences, coding styles, or important context
- Use searchMemories when you need to recall previous conversations or preferences
- Tag memories appropriately (e.g., 'preference', 'coding_style', 'project_context')`
    : ''
}

When answering questions:
- Be concise but thorough
- Provide code examples when helpful
- Explain the "why" behind patterns, not just the "how"
- Reference official Effect documentation when relevant

For code review:
- Identify anti-patterns and suggest alternatives
- Explain the benefits of suggested refactorings
- Be constructive and educational`

    // Build tools object
    const tools: Record<string, any> = {}

    // Add Supermemory tools if API key is available
    if (hasSupermemory) {
      const smTools = supermemoryTools(supermemoryApiKey!, {
        containerTags: ['user_preferences', 'coding_context', 'effect_patterns'],
      })
      Object.assign(tools, smTools)
    }

    // TODO: Add Effect Pattern search tool
    // Uncomment when @effect-patterns/toolkit is integrated:
    /*
    tools.searchPatterns = {
      description: 'Search the Effect Patterns library for relevant patterns',
      parameters: z.object({
        query: z.string().describe('Search query for patterns'),
        skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
        useCase: z.string().optional(),
      }),
      execute: async ({ query, skillLevel, useCase }) => {
        const { searchPatterns } = await import('@effect-patterns/toolkit');
        const results = await searchPatterns({ query, skillLevel, useCase });
        return {
          patterns: results.map(p => ({
            id: p.id,
            title: p.title,
            summary: p.summary,
            skillLevel: p.skillLevel,
          })),
        };
      },
    };
    */

    // console.log('Chat request received')

    // Convert UI messages → Model messages for AI SDK server call
    const modelMessages = convertToModelMessages(messages)

    // Instantiate Anthropic provider explicitly to avoid default gateway
    const anthropic = createAnthropic({ apiKey: providerApiKey })

    // Select model (configurable via env)
    // Default to a valid Anthropic model id
    const modelName = process.env.CHAT_MODEL || 'claude-sonnet-4-20250514'

    // Stream response with tools enabled for data-stream protocol
    const result = streamText({
      model: anthropic(modelName),
      messages: modelMessages,
      toolChoice: 'auto',
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      system: systemPrompt,
    })

    // Data stream response for DefaultChatTransport
    return (result as any).toDataStreamResponse?.() ?? result.toTextStreamResponse()
  } catch (error) {
    console.error('Error in chat endpoint:', error)
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 })
  }
}
