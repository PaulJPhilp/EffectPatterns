import { FileSystem } from "@effect/platform";
import { Effect, Redacted } from "effect";
import { MdxService } from "../mdx-service/service.js";
import type { Models, Providers } from "./types.js";
export declare class InvalidMdxFormatError extends Error {
    readonly reason: string;
    readonly _tag = "InvalidMdxFormatError";
    constructor(reason: string);
}
export declare class InvalidFrontmatterError extends Error {
    readonly reason: string;
    readonly _tag = "InvalidFrontmatterError";
    constructor(reason: string);
}
export declare const readFileContent: (filePath: string) => Effect.Effect<string, Error, FileSystem.FileSystem>;
export declare const parseMdxFile: (content: string) => Effect.Effect<{
    attributes: Record<string, unknown>;
    body: string;
}, import("../mdx-service/types.js").InvalidMdxFormatError, MdxService>;
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
}, Error, MdxService | FileSystem.FileSystem>;
export declare const processTextFile: (filePath: string) => Effect.Effect<string, Error, FileSystem.FileSystem>;
export declare const isValidProvider: (provider: string) => provider is Providers;
export declare const getGoogleApiKey: Effect.Effect<Redacted.Redacted<string>, Error, never>;
export declare const getOpenAIApiKey: Effect.Effect<Redacted.Redacted<string>, Error, never>;
export declare const getAnthropicApiKey: Effect.Effect<Redacted.Redacted<string>, Error, never>;
