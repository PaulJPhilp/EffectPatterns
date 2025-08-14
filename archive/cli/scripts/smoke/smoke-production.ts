import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { runProductionEffect } from "../../src/runtime/production-runtime.js";
import { OtelService } from "../../src/services/otel-service/service.js";
import { HttpClient } from "@effect/platform";

const program = Effect.gen(function* () {
  // Start a tracer span (no external OTel SDK wiring required for smoke)
  const otel = yield* OtelService;
  const span = yield* otel.startSpan("smoke-production-span", {
    attributes: { test: true },
  });
  yield* otel.addEvent(span, "prod_testing_start");

  // Ensure HttpClient service is provided in production runtime
  const client = yield* HttpClient.HttpClient;
  if (!client) {
    throw new Error("HttpClient service not available in Production runtime");
  }

  // Ensure FileSystem is also available
  const fs = yield* FileSystem.FileSystem;
  const cwdEntries = yield* fs.readDirectory(".");
  console.log("[PRODUCTION] entries in .:", cwdEntries.slice(0, 5));

  yield* otel.addEvent(span, "prod_testing_end");
  yield* otel.endSpan(span);
});

runProductionEffect(program).then(() => {
  console.log("[PRODUCTION] OK");
}).catch((err) => {
  console.error("[PRODUCTION] FAIL", err);
  process.exitCode = 1;
});
