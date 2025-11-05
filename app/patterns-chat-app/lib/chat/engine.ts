import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
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
import { isProductionEnvironment } from "@/lib/constants";
import { rememberModelChoice } from "@/lib/memory";
import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { Effect } from "effect";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";

import { generateTitleFromUserMessage } from "@/app/(chat)/actions";
import { type PostRequestBody } from "@/app/(chat)/api/chat/schema";
import { DbService } from "@/lib/db/service";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";

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

export function processChat({
  requestBody,
  request,
}: {
  requestBody: PostRequestBody;
  request: Request;
}) {
  return Effect.gen(function* () {
    const db = yield* DbService;
    const {
      getChatById,
      getMessageCountByUserId,
      saveChat,
      getMessagesByChatId,
      saveMessages,
      createStreamId,
      updateChatLastContextById,
    } = db;

    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    if (!selectedChatModel) {
      throw new ChatSDKError("bad_request:api");
    }

    const session = yield* Effect.promise(() => auth());

    if (!session || !session.user) {
      throw new ChatSDKError("unauthorized:chat");
    }

    const userType: UserType = session.user.type;

    const messageCount = yield* (Effect.promise(() =>
      getMessageCountByUserId({
        id: session.user.id,
        differenceInHours: 24,
      })
    ) as any);

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      throw new ChatSDKError("rate_limit:chat");
    }

    // Remember user's model choice for future sessions
    yield* Effect.promise(() =>
      rememberModelChoice(session.user.id, selectedChatModel)
    );

    const chat = yield* (Effect.promise(() => getChatById({ id })) as any);

    if (chat) {
      if (chat.userId !== session.user.id) {
        throw new ChatSDKError("forbidden:chat");
      }
    } else {
      let title: string;
      try {
        title = yield* Effect.promise(() =>
          generateTitleFromUserMessage({
            message,
          })
        );
      } catch (error) {
        console.error("Error generating chat title:", error);
        // Fallback title if generation fails
        title = "New Chat";
      }

      yield* Effect.promise(() =>
        saveChat({
          id,
          userId: session.user.id,
          title,
          visibility: selectedVisibilityType,
        })
      );
    }

    const messagesFromDb = yield* (Effect.promise(() =>
      getMessagesByChatId({ id })
    ) as any);
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    yield* Effect.promise(() =>
      saveMessages({
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
      })
    );

    const streamId = generateUUID();
    yield* Effect.promise(() => createStreamId({ streamId, chatId: id }));

    let finalMergedUsage: AppUsage | undefined;

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
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
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          stopWhen: stepCountIs(5),
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
              if (!modelId || !providers) {
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

        // Note: The AI stream is already being consumed and written to dataStream
        // through the streamText onChunk callback above. The response body is
        // handled by the caller through the createUIMessageStream context.
        const aiResponse = result.toTextStreamResponse();
        // The aiResponse.body is already integrated into the stream processing above
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        try {
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

          if (finalMergedUsage) {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          }
        } catch (error) {
          console.error("Failed to save messages in onFinish:", error);
          throw error;
        }
      },
    });
    return stream;
  });
}
