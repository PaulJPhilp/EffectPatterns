import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import type { Frontmatter, ParameterDefinition } from "./types.js";
import { InvalidMdxFormatError } from "./errors.js";
declare const MdxService_base: Effect.Service.Class<MdxService, "MdxService", {
    readonly effect: Effect.Effect<{
        readMdxAndFrontmatter: (filePath: string) => Effect.Effect<{
            readonly content: string;
            readonly frontmatter: Frontmatter;
            readonly mdxBody: string;
        }, import("@effect/platform/Error").PlatformError | InvalidMdxFormatError, never>;
        updateMdxContent: (originalFullMdxContent: string, updatedFrontmatter: Frontmatter) => string;
        parseMdxFile: (content: string) => Effect.Effect<{
            attributes: Record<string, unknown>;
            body: string;
        }, InvalidMdxFormatError, never>;
        validateMdxConfig: (attributes: Record<string, unknown>) => {
            provider: string;
            model: string;
            parameters: Record<string, unknown>;
        };
        extractParameters: (metadata: Record<string, unknown>) => Record<string, ParameterDefinition>;
    }, never, FileSystem.FileSystem>;
}>;
export declare class MdxService extends MdxService_base {
}
export {};
