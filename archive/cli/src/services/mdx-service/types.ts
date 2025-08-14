import { Data } from "effect";
export { InvalidMdxFormatError, InvalidFrontmatterError } from "./errors.js";

// Frontmatter interface with readonly properties and index signature
export interface Frontmatter {
  readonly expectedOutput?: string;
  readonly expectedError?: string;
  needsReview?: boolean; // Can be updated, so not readonly if it is to be written to.
  readonly [key: string]: unknown; // Allows for any other properties in frontmatter
}

// Parsed MDX file structure
export interface ParsedMdxFile {
  readonly content: string;
  readonly frontmatter: Frontmatter;
  readonly body: string;
}

// Parameter definition for MDX templates
export interface ParameterDefinition {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required?: boolean;
  default?: unknown;
}

// Prompt template with frontmatter parameters
export interface PromptTemplate {
  readonly content: string;
  readonly parameters: Record<string, ParameterDefinition>;
  readonly body: string;
}

// Error types are defined in ./errors.ts
