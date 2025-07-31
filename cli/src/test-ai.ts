import { Effect } from "effect";
import { ProductionRuntime } from "./runtime/production-runtime.js";
import { streamText } from "./services/llm-service/service.js";

const testEffect = streamText("Say hello world", "openai", "gpt-4o-mini").pipe(
  Effect.tap((text) => Effect.sync(() => console.log("AI Response:", text)))
);

console.log("Testing AI service...");

ProductionRuntime.runPromise(testEffect).then(
  () => {
    console.log("AI test completed");
    process.exit(0);
  },
  (error) => {
    console.error(`AI test failed: ${error}`);
    process.exit(1);
  }
);
