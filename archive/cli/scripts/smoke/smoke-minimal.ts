import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import * as OS from "node:os";
import { runMinimalEffect } from "../../src/runtime/minimal-runtime.js";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  // List current directory
  const entries = yield* fs.readDirectory(".");
  console.log(`[MINIMAL] entries in .:`, entries.slice(0, 5));

  // Write/read a temp file
  const tmp = OS.tmpdir();
  const file = path.join(tmp, "effect-ai-smoke-minimal.txt");
  yield* fs.writeFileString(file, "hello minimal");
  const contents = yield* fs.readFileString(file);
  console.log(`[MINIMAL] read temp file:`, contents);
});

runMinimalEffect(program).then(() => {
  console.log("[MINIMAL] OK");
}).catch((err) => {
  console.error("[MINIMAL] FAIL", err);
  process.exitCode = 1;
});
