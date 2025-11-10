import { Schema } from "effect";

/**
 * ConfigService Schemas
 * Effect.Schema validation schemas for configuration
 */

export const SupermemoryConfigSchema = Schema.Struct({
  activeProject: Schema.String,
  apiKey: Schema.String,
  supermemoryUrl: Schema.String,
  uploadedPatterns: Schema.Array(Schema.String),
});
