import { Effect } from "effect";
import { FileSystem } from "@effect/platform";
export interface Frontmatter {
    readonly expectedOutput?: string;
    readonly expectedError?: string;
    needsReview?: boolean;
    readonly [key: string]: unknown;
}
export declare const readMdxAndFrontmatter: (filePath: string) => Effect.Effect<{
    readonly content: string;
    readonly frontmatter: Frontmatter;
    readonly mdxBody: string;
}, import("@effect/platform/Error").PlatformError | Error, FileSystem.FileSystem>;
export declare function updateMdxContent(originalFullMdxContent: string, updatedFrontmatter: Frontmatter): string;
