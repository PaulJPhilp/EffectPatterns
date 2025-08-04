import { FileSystem } from "@effect/platform";
import { Effect, Redacted } from "effect";
import { FileReadError, InvalidFrontmatterError, InvalidMdxFormatError } from "./errors.js";
import type { Models, Providers } from "./types.js";
export interface MdxPromptConfig {
    provider: string;
    model: string;
    parameters?: Record<string, unknown>;
}
export interface ParsedMdxFile {
    attributes: {
        provider: string;
        model: string;
        parameters?: Record<string, unknown>;
    };
    body: string;
}
export declare const readFileContent: (filePath: string) => Effect.Effect<string, FileReadError, FileSystem.FileSystem>;
export declare const parseMdxFile: (content: string) => Effect.Effect<{
    attributes: Record<string, unknown>;
    body: string;
}, InvalidMdxFormatError, never>;
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
}, InvalidMdxFormatError | InvalidFrontmatterError | FileReadError, FileSystem.FileSystem>;
export declare const processTextFile: (filePath: string) => Effect.Effect<string, FileReadError, FileSystem.FileSystem>;
export declare const isValidProvider: (provider: string) => provider is Providers;
export declare const getGoogleApiKey: Effect.Effect<Redacted.Redacted<string>, Error, never>;
export declare const getOpenAIApiKey: Effect.Effect<Redacted.Redacted<string>, Error, never>;
export declare const getAnthropicApiKey: Effect.Effect<Redacted.Redacted<string>, Error, never>;
