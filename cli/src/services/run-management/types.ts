import { Schema } from "effect";

// Run information schema
export const RunInfoSchema = Schema.Struct({
  name: Schema.String,
  directory: Schema.String,
  timestamp: Schema.Date,
  number: Schema.Number
});

export interface RunInfo extends Schema.Schema.Type<typeof RunInfoSchema> {}

// Run configuration schema
export const RunConfigSchema = Schema.Struct({
  namePrefix: Schema.optional(Schema.String),
  includeTimestamp: Schema.optional(Schema.Boolean),
  includeNumber: Schema.optional(Schema.Boolean)
});

export interface RunConfig extends Schema.Schema.Type<typeof RunConfigSchema> {}

// Run state schema
export const RunStateSchema = Schema.Struct({
  lastRunNumber: Schema.Number
});

export interface RunState extends Schema.Schema.Type<typeof RunStateSchema> {}

// Run directory structure
export interface RunDirectoryStructure {
  readonly root: string;
  readonly outputs: string;
  readonly logs: string;
  readonly metrics: string;
  readonly metadata: string;
}

// Standard file names within run directory
export const StandardFiles = {
  response: "response.md",
  metrics: "metrics.jsonl",
  log: "log.txt",
  prompt: "prompt.mdx",
  runInfo: "run-info.json"
} as const;
