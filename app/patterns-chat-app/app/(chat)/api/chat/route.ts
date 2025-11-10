import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModelId } from "@/lib/ai/models";
import { systemPrompt, type RequestHints } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import {
  getPatternByIdTool,
  listPatternCategoriesTool,
  searchPatternsTool,
} from "@/lib/ai/tools/search-patterns";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { visualizePatternTool } from "@/lib/ai/tools/visualize-pattern";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import {
  autoTagConversation,
  detectConversationOutcome,
  getConversationContext,
  getUserPreferences,
  rememberModelChoice,
  updateConversationContext,
} from "@/lib/memory";
import { generateEmbedding } from "@/lib/semantic-search";
import { getSupermemoryStore } from "@/lib/semantic-search/supermemory-store";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { generateTitleFromUserMessage } from "../../actions";
import { postRequestBodySchema, type PostRequestBody } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;
  let selectedChatModel: ChatModelId = "chat-model" as const; // Default value

  try {
    const json = await request.json();

    // Check if this is a standard AI SDK request (from assistant-ui)
    if ("messages" in json && !("message" in json)) {
      // Convert AI SDK format to our format
      const lastMessage = json.messages[json.messages.length - 1];
      requestBody = {
        id: json.id || generateUUID(),
        message: lastMessage,
        selectedChatModel: "chat-model",
        selectedVisibilityType: "private",
      };
    } else {
      // Use existing format
      requestBody = postRequestBodySchema.parse(json);
    }
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModelId;
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    if (!selectedChatModel) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    // Remember user's model choice for future sessions
    await rememberModelChoice(session.user.id, selectedChatModel);

    let chat;
    try {
      chat = await getChatById({ id });
    } catch {
      // If database error, treat as non-existent chat and create it
      chat = null;
    }

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
      try {
        const title = await generateTitleFromUserMessage({
          message,
        });

        await saveChat({
          id,
          userId: session.user.id,
          title,
          visibility: selectedVisibilityType,
        });
      } catch (error) {
        // Log error but continue - allow conversation even if chat metadata fails to save
        console.error("[Chat API] Failed to save chat metadata:", error);
        // Don't return error - let the conversation continue
      }
    }

    let messagesFromDb: DBMessage[];
    try {
      messagesFromDb = await getMessagesByChatId({ id });
    } catch {
      // If database error, treat as new chat with no messages
      messagesFromDb = [];
    }
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    // Fetch user's custom instructions from preferences
    const userPreferences = await getUserPreferences(session.user.id);
    const customInstructions = userPreferences.customInstructions;

    // Fetch conversation context for better AI responses
    const conversationContext = await getConversationContext(
      session.user.id,
      id
    );

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            customInstructions,
            conversationContext: conversationContext || undefined,
          }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                  "searchPatterns",
                  "getPatternById",
                  "listPatternCategories",
                  "visualizePattern",
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            searchPatterns: searchPatternsTool,
            getPatternById: getPatternByIdTool,
            listPatternCategories: listPatternCategoriesTool,
            visualizePattern: visualizePatternTool,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        // Update conversation context for next interaction
        try {
          const allMessages = [...uiMessages, ...messages];
          await updateConversationContext(session.user.id, id, allMessages);
        } catch (err) {
          console.warn("Failed to update conversation context", err);
        }

        // Store embeddings for semantic search in Supermemory
        try {
          const supermemoryStore = getSupermemoryStore();
          const allMessages = [...uiMessages, ...messages];

          // Combine all conversation text
          const conversationText = allMessages
            .map((m: any) => {
              if (typeof m.parts === "string") return m.parts;
              return m.parts?.[0]?.text || "";
            })
            .join(" ");

          if (conversationText.trim()) {
            // Generate embedding for full conversation
            const embedding = await generateEmbedding(conversationText);

            // Generate tags and detect outcome
            const tags = autoTagConversation(allMessages);
            const outcome = detectConversationOutcome(allMessages);

            // Store in Supermemory (unified backend for all memories)
            await supermemoryStore.add(
              id,
              session.user.id,
              embedding.vector,
              {
                content: conversationText,
                timestamp: new Date().toISOString(),
                outcome,
                type: "conversation",
              },
              tags
            );

            console.log(
              `[Supermemory] Stored conversation embedding (${tags.length} tags, ${outcome} outcome)`
            );
          }
        } catch (err: any) {
          // Don't fail the chat if embedding fails
          if (err?.code === "RATE_LIMIT") {
            console.warn(
              "[Supermemory] Rate limited, skipping embedding storage"
            );
          } else if (err?.code === "AUTH_ERROR") {
            console.warn(
              "[Supermemory] Missing API key, skipping embedding storage"
            );
          } else {
            console.warn(
              "[Supermemory] Failed to store embedding:",
              err?.message || err
            );
          }
        }

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: (error) => {
        // Categorize and log errors cleanly
        if (error instanceof Error) {
          const message = error.message;

          // Known/expected API errors - log concisely with console.warn
          if (
            message?.includes("doesn't have any credits") ||
            message?.includes("credit balance is too low") ||
            message?.includes("Forbidden") ||
            message?.includes("403")
          ) {
            console.warn(
              `[Chat API] ${selectedChatModel}: Insufficient credits or access denied`
            );
            return "⚠️ Insufficient credits for this model";
          }

          if (message?.includes("rate limit") || message?.includes("429")) {
            console.warn(
              `[Chat API] ${selectedChatModel}: Rate limit exceeded`
            );
            return "⚠️ Rate limit exceeded";
          }

          if (
            message?.includes("API key") ||
            message?.includes("401") ||
            message?.includes("Unauthorized")
          ) {
            console.warn(`[Chat API] ${selectedChatModel}: Invalid API key`);
            return "⚠️ Invalid API key";
          }

          if (
            message?.includes("network") ||
            message?.includes("fetch failed")
          ) {
            console.warn(`[Chat API] ${selectedChatModel}: Network error`);
            return "⚠️ Network error";
          }

          // Unknown/unexpected errors - log with more details
          console.error(`[Chat API] ${selectedChatModel}: Unexpected error`, {
            name: error.name,
            message: error.message,
          });
          return "An error occurred";
        }

        // Non-Error objects
        console.error(`[Chat API] ${selectedChatModel}: Unknown error`, error);
        return "An error occurred";
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    // Check for Gemini API specific errors
    if (
      error instanceof Error &&
      (error.message?.includes("gemini") ||
        error.message?.includes("GoogleGenerativeAI") ||
        error.message?.includes("INVALID_ARGUMENT") ||
        error.message?.includes("RESOURCE_EXHAUSTED") ||
        error.message?.includes("UNAVAILABLE") ||
        error.message?.includes("fetch failed") ||
        error.message?.includes("model_not_found") ||
        error.message?.includes("PERMISSION_DENIED") ||
        error.message?.includes("NOT_FOUND") ||
        error.message?.includes("FAILED_PRECONDITION"))
    ) {
      console.error("Gemini API error:", error.message, error.stack, {
        vercelId,
        selectedChatModel: selectedChatModel || "unknown",
        errorName: error.name,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      return new ChatSDKError("bad_request:api").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
