import { FileSystem } from "@effect/platform";
import { Effect, Redacted } from "effect";
import { MdxService } from "../mdx-service/service.js";
import { FileReadError, InvalidFrontmatterError, LlmServiceError } from "./errors.js";
import type { Models, Providers } from "./types.js";
export declare const readFileContent: (filePath: string) => Effect.Effect<string, FileReadError, FileSystem.FileSystem>;
export declare const parseMdxFile: (content: string) => Effect.Effect<{
    attributes: Record<string, unknown>;
    body: string;
}, import("../mdx-service/errors.js").InvalidMdxFormatError, MdxService>;
export declare const validateMdxConfig: (attributes: Record<string, unknown>) => Effect.Effect<{
    provider: Providers;
    model: Models;
    parameters: Record<string, unknown>;
}, InvalidFrontmatterError, never>;
export declare const processMdxFile: (filePath: string) => Effect.Effect<{
    prompt: string;
    provider: Providers;
    model: Models;
    parameters: Record<string, unknown>;
}, import("../mdx-service/errors.js").InvalidMdxFormatError | InvalidFrontmatterError | FileReadError, FileSystem.FileSystem | MdxService>;
export declare const processTextFile: (filePath: string) => Effect.Effect<string, FileReadError, FileSystem.FileSystem>;
export declare const isValidProvider: (provider: string) => provider is Providers;
export declare const getGoogleApiKey: Effect.Effect<Redacted.Redacted<string>, LlmServiceError, never>;
export declare const getOpenAIApiKey: Effect.Effect<Redacted.Redacted<string>, LlmServiceError, never>;
export declare const getAnthropicApiKey: Effect.Effect<Redacted.Redacted<string>, LlmServiceError, never>;
//# sourceMappingURL=utils.d.ts.map