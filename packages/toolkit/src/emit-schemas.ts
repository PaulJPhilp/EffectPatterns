/**
 * JSON Schema Emitter
 *
 * Build-time script to emit JSON Schema representations of Effect
 * schemas for LLM tool-call function parameter specifications.
 */

import { JSONSchema, Schema as S } from "@effect/schema";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GenerateRequest,
  SearchPatternsRequest,
  ExplainPatternRequest,
} from "./schemas/generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Emit JSON Schema for a given Effect schema
 */
function emitSchema<A, I, R>(
  schema: S.Schema<A, I, R>,
  name: string,
  outputDir: string
): void {
  try {
    const jsonSchema = JSONSchema.make(schema);

    const outputPath = path.join(outputDir, `${name}.json`);

    fs.writeFileSync(
      outputPath,
      JSON.stringify(jsonSchema, null, 2),
      "utf-8"
    );

    console.log(`✓ Emitted ${name}.json`);
  } catch (error) {
    console.error(`✗ Failed to emit ${name}:`, error);
    process.exit(1);
  }
}

/**
 * Main emitter function
 */
function main(): void {
  console.log("Emitting JSON Schemas for LLM tool calls...\n");

  const outputDir = path.join(__dirname, "../dist/schemas");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Emit schemas for tool-call functions
  emitSchema(GenerateRequest, "generate-request", outputDir);
  emitSchema(SearchPatternsRequest, "search-patterns-request", outputDir);
  emitSchema(ExplainPatternRequest, "explain-pattern-request", outputDir);

  console.log("\nAll schemas emitted successfully!");
}

main();
