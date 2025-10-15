import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { tools } from '@/app/server/tools';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * POST /api/chat
 *
 * Main chat API endpoint that handles streaming AI responses
 * This is a thin Next.js layer that orchestrates between the client and our Effect services
 */
export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools,
    system: `You are an expert Effect-TS code reviewer and teacher.

      Your role is to help developers learn and write better Effect-TS code by:
      1. Answering questions about Effect patterns and best practices
      2. Searching the pattern library when users ask "how do I..." questions
      3. Reviewing code and suggesting improvements based on Effect best practices
      4. Providing clear explanations with code examples

      When answering questions:
      - Use the searchPatterns tool to find relevant patterns from the library
      - Use the reviewCodeSnippet tool when users paste code for review
      - Explain concepts clearly with examples
      - Reference official Effect patterns from the library
      - When suggesting improvements, explain the "why" behind the change
      - Be concise but thorough

      When reviewing code:
      - Identify anti-patterns and suggest better alternatives
      - Reference specific patterns from the library
      - Explain the benefits of the suggested refactoring
      - If a diff is provided, present it clearly

      Always prioritize helping users understand the "why" behind patterns,
      not just the "how".`,
  });

  return result.toDataStreamResponse();
}
