import { Console, Data } from "effect";
import { AiError } from "@effect/ai";
import { Providers } from "./types.js";

const hasTag = (x: unknown): x is { _tag: string } =>
  typeof x === "object" && x !== null && "_tag" in (x as Record<string, unknown>) &&
  typeof (x as Record<string, unknown>)["_tag"] === "string";

const isAiError = (e: unknown): e is AiError.AiError =>
  hasTag(e) && e._tag === "AiError";

export const logError = (e: unknown) => {
  if (isAiError(e)) {
    return Console.error(`
      ---------------------------------------
      🚨 OBSERVED AI ERROR 🚨
      Tag: "${e._tag}"
      Description: "${e.description}"
      Module: "${e.module}"
      Method: "${e.method}"
      Stack: ${e.stack || 'No stack trace provided.'}
      ---------------------------------------
    `);
  } else {
    const isObject = typeof e === "object" && e !== null;
    let ctorName: string;
    if (isObject) {
      const ctor = (e as { constructor?: { name?: unknown } }).constructor;
      ctorName = typeof ctor?.name === "string" ? ctor.name : "Object";
    } else {
      ctorName = typeof e;
    }
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack || 'No stack trace.') : 'Not an Error object.';
    let raw = "<unserializable>";
    try {
      raw = JSON.stringify(e, null, 2);
    } catch {
      raw = "<unserializable>";
    }
    return Console.error(`
      ---------------------------------------
      💥 OTHER ERROR CAUGHT 💥
      Type: "${ctorName}"
      Message: "${message}"
      Stack: ${stack}
      Raw Object: ${raw}
      ---------------------------------------
    `);
  }
};

// Define typed errors for the LLM service
export class InvalidMdxFormatError extends Data.TaggedError(
  "InvalidMdxFormatError"
)<{
  reason: string;
}> { }

export class InvalidFrontmatterError extends Data.TaggedError(
  "InvalidFrontmatterError"
)<{
  reason: string;
}> { }

export class UnsupportedProviderError extends Data.TaggedError(
  "UnsupportedProviderError"
)<{
  provider: string;
}> { }

export class InvalidJsonResponseError extends Data.TaggedError(
  "InvalidJsonResponseError"
)<{
  reason: string;
}> { }

export class FileReadError extends Data.TaggedError("FileReadError")<{
  filePath: string;
  reason: string;
}> { }

export class LlmServiceError extends Data.TaggedError("LlmServiceError")<{
  reason: string;
  provider: Providers;
}> { }

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  provider: Providers;
  reason: string;
}> { }

export class QuotaExceededError extends Data.TaggedError("QuotaExceededError")<{
  provider: Providers;
  reason: string;
}> { }
