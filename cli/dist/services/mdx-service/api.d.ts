import { Effect } from "effect";
import type { Frontmatter, ParameterDefinition } from "./types.js";
import { InvalidMdxFormatError } from "./errors.js";
export interface MdxServiceApi {
    readonly readMdxAndFrontmatter: (filePath: string) => Effect.Effect<{
        readonly content: string;
        readonly frontmatter: Frontmatter;
        readonly mdxBody: string;
    }, InvalidMdxFormatError>;
    readonly updateMdxContent: (originalFullMdxContent: string, updatedFrontmatter: Frontmatter) => string;
    readonly parseMdxFile: (content: string) => Effect.Effect<{
        readonly attributes: Record<string, unknown>;
        readonly body: string;
    }, InvalidMdxFormatError>;
    readonly validateMdxConfig: (attributes: Record<string, unknown>) => {
        readonly provider?: string;
        readonly model?: string;
        readonly parameters?: Record<string, unknown>;
    };
    readonly extractParameters: (metadata: Record<string, unknown>) => Record<string, ParameterDefinition>;
}
