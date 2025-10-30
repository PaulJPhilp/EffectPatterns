import * as Effect from 'effect/Effect'
import { TUIHandler } from 'effect-cli-tui'
import { processChat } from '../app/code-assistant/lib/chat/engine';
import { MockDbServiceLive } from './mock-db';

const program = Effect.gen(function* (_) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: bun run scripts/test-harness.ts <prompt_message> <model_id>");
    return;
  }

  const promptMessage = args[0];
  const modelId = args[1];

  console.log(`Testing prompt: "${promptMessage}" with model: "${modelId}"`);

  // Simulate a request object for processChat
  const mockRequest = new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "test-chat-id", // Dummy ID
      message: {
        id: "test-message-id",
        role: "user",
        parts: [{ type: "text", text: promptMessage }],
      },
      selectedChatModel: modelId,
      selectedVisibilityType: "private", // Dummy value
    }),
  });

  // Simulate a request body for processChat
  const mockRequestBody = {
    id: "test-chat-id",
    message: {
      id: "test-message-id",
      role: "user",
      parts: [{ type: "text", text: promptMessage }],
    },
    selectedChatModel: modelId,
    selectedVisibilityType: "private",
  };

  try {
    const stream = yield* _(Effect.promise(() => processChat({ requestBody: mockRequestBody, request: mockRequest })));

    // Read the stream and print the content
    const fullResponse = yield* _(Effect.promise(async () => {
      const reader = stream.getReader();
      let result;
      let responseText = "";
      while (!(result = await reader.read()).done) {
        responseText += new TextDecoder().decode(result.value);
      }
      return responseText;
    }));

    console.log("Model Response:");
    console.log(fullResponse);

  } catch (error) {
    console.error("Error during chat processing:", error);
  }
});

const runnable = Effect.provide(program, MockDbServiceLive);

Effect.runPromise(runnable);
