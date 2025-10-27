/**
 * JSON Schema Emitter
 *
 * Build-time script to emit JSON Schema representations of Effect
 * schemas for LLM tool-call function parameter specifications.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stderr, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { JSONSchema } from '@effect/schema';
import { ExplainPatternRequest, GenerateRequest, SearchPatternsRequest, } from './schemas/generate.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Emit JSON Schema for a given Effect schema
 */
function emitSchema(schema, name, outputDir) {
    try {
        const jsonSchema = JSONSchema.make(schema);
        const outputPath = join(outputDir, `${name}.json`);
        writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2), 'utf-8');
        stdout.write(`✓ Emitted ${name}.json\n`);
    }
    catch (error) {
        stderr.write(`✗ Failed to emit ${name}: ${String(error)}\n`);
        process.exit(1);
    }
}
/**
 * Main emitter function
 */
function main() {
    stdout.write('Emitting JSON Schemas for LLM tool calls...\n\n');
    const outputDir = join(__dirname, '../dist/schemas');
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }
    // Emit schemas for tool-call functions
    emitSchema(GenerateRequest, 'generate-request', outputDir);
    emitSchema(SearchPatternsRequest, 'search-patterns-request', outputDir);
    emitSchema(ExplainPatternRequest, 'explain-pattern-request', outputDir);
    stdout.write('\nAll schemas emitted successfully!\n');
}
main();
//# sourceMappingURL=emit-schemas.js.map