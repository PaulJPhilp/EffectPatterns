import { Schema } from "effect";
// Run information schema
export const RunInfoSchema = Schema.Struct({
    name: Schema.String,
    directory: Schema.String,
    timestamp: Schema.Date,
    number: Schema.Number
});
// Run configuration schema
export const RunConfigSchema = Schema.Struct({
    namePrefix: Schema.optional(Schema.String),
    includeTimestamp: Schema.optional(Schema.Boolean),
    includeNumber: Schema.optional(Schema.Boolean)
});
// Run state schema
export const RunStateSchema = Schema.Struct({
    lastRunNumber: Schema.Number
});
// Standard file names within run directory
export const StandardFiles = {
    response: "response.md",
    metrics: "metrics.jsonl",
    log: "log.txt",
    prompt: "prompt.mdx",
    runInfo: "run-info.json"
};
//# sourceMappingURL=types.js.map