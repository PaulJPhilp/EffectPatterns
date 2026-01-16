/**
 * JSON Schema Emitter
 *
 * Build-time script to emit JSON Schema representations of Effect
 * schemas for LLM tool-call function parameter specifications.
 */

import { JSONSchema, type Schema as S } from "@effect/schema";
import { Effect } from "effect";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import {
  ExplainPatternRequest,
  GenerateRequest,
  SearchPatternsRequest,
} from "./schemas/generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Emit JSON Schema for a given Effect schema
 */
function emitSchema<A, I, R>(
  schema: S.Schema<A, I, R>,
  name: string,
  outputDir: string
): Effect.Effect<void, string> {
  return Effect.gen(function* () {
    const jsonSchema = yield* Effect.try({
      try: () => JSONSchema.make(schema),
      catch: (error) => `Failed to create JSON schema for ${name}: ${String(error)}`
    });

    const outputPath = join(outputDir, `${name}.json`);

    yield* Effect.try({
      try: () => writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2), "utf-8"),
      catch: (error) => `Failed to write schema file ${name}: ${String(error)}`
    });

    yield* Effect.sync(() => stdout.write(`✓ Emitted ${name}.json\n`));
  });
}

/**
 * Main emitter function
 */
function main(): Effect.Effect<void, string> {
  return Effect.gen(function* () {
    yield* Effect.sync(() => stdout.write("Emitting JSON Schemas for LLM tool calls...\n\n"));

    const outputDir = join(__dirname, "../dist/schemas");

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      yield* Effect.try({
        try: () => mkdirSync(outputDir, { recursive: true }),
        catch: (error) => `Failed to create output directory: ${String(error)}`
      });
    }

    // Emit schemas for tool-call functions
    yield* emitSchema(GenerateRequest, "generate-request", outputDir);
    yield* emitSchema(SearchPatternsRequest, "search-patterns-request", outputDir);
    yield* emitSchema(ExplainPatternRequest, "explain-pattern-request", outputDir);

    yield* Effect.sync(() => stdout.write("\nAll schemas emitted successfully!\n"));
  });
}

// Run the main function
Effect.runPromise(main()).catch((error) => {
  stderr.write(`✗ Failed to emit schemas: ${String(error)}\n`);
  process.exit(1);
});
