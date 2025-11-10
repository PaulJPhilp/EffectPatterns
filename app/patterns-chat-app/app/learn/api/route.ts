import { auth } from "@/app/(auth)/auth";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import {
  getPatternByIdTool,
  listPatternCategoriesTool,
  searchPatternsTool,
} from "@/lib/ai/tools/search-patterns";
import { visualizePatternTool } from "@/lib/ai/tools/visualize-pattern";
import { convertToModelMessages, smoothStream, streamText } from "ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const json = await request.json();
    const { messages } = json;

    const stream = streamText({
      model: myProvider.languageModel("chat-model"),
      system: systemPrompt({
        selectedChatModel: "chat-model",
        requestHints: {
          latitude: undefined,
          longitude: undefined,
          city: undefined,
          country: undefined,
        },
        customInstructions:
          "You are an expert Effect-TS tutor. When users ask about patterns, use the visualizePattern tool to create interactive learning experiences. Always explain concepts clearly and provide runnable code examples.",
      }),
      messages: convertToModelMessages(messages),
      experimental_transform: smoothStream({ chunking: "word" }),
      tools: {
        searchPatterns: searchPatternsTool,
        getPatternById: getPatternByIdTool,
        listPatternCategories: listPatternCategoriesTool,
        visualizePattern: visualizePatternTool,
      },
    });

    return stream.toTextStreamResponse();
  } catch (error) {
    console.error("[Learn API] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
