import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import * as OS from "node:os";
import { runTestEffect } from "../../src/runtime/testing-runtime.js";
import { OtelService } from "../../src/services/otel-service/service.js";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const otel = yield* OtelService;

  const span = yield* otel.startSpan("smoke-testing-span", {
    attributes: { test: true },
  });
  yield* otel.addEvent(span, "testing_start");

  // Ensure FS works under testing runtime
  const base = path.join(OS.tmpdir(), "effect-ai-smoke-testing");
  yield* fs.makeDirectory(base, { recursive: true });
  const f = path.join(base, "file.txt");
  yield* fs.writeFileString(f, "hello testing");
  const txt = yield* fs.readFileString(f);
  console.log("[TESTING] read:", txt);

  yield* otel.addEvent(span, "testing_end");
  yield* otel.endSpan(span);
});

runTestEffect(program).then(() => {
  console.log("[TESTING] OK");
}).catch((err) => {
  console.error("[TESTING] FAIL", err);
  process.exitCode = 1;
});
