import { Effect } from "effect";
import type { Frontmatter, ParameterDefinition } from "./types.js";
import { InvalidMdxFormatError } from "./errors.js";

export interface MdxServiceApi {
  // Read MDX content and parse YAML frontmatter
  readonly readMdxAndFrontmatter: (
    filePath: string
  ) => Effect.Effect<
    { readonly content: string; readonly frontmatter: Frontmatter; readonly mdxBody: string },
    InvalidMdxFormatError
  >;

  // Reconstruct MDX content with updated frontmatter
  readonly updateMdxContent: (
    originalFullMdxContent: string,
    updatedFrontmatter: Frontmatter
  ) => string;

  // Parse MDX frontmatter with validation
  readonly parseMdxFile: (
    content: string
  ) => Effect.Effect<
    { readonly attributes: Record<string, unknown>; readonly body: string },
    InvalidMdxFormatError
  >;

  // Pulls common optional config values out of attributes
  readonly validateMdxConfig: (
    attributes: Record<string, unknown>
  ) => {
    readonly provider?: string;
    readonly model?: string;
    readonly parameters?: Record<string, unknown>;
  };

  // Extract typed parameter definitions
  readonly extractParameters: (
    metadata: Record<string, unknown>
  ) => Record<string, ParameterDefinition>;
}
