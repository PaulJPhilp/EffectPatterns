import { Console, Data } from "effect";
import { AiError } from "@effect/ai";
import { Providers } from "./types.js";

const isAiError = (e: unknown): e is AiError.AiError =>
  typeof e === "object" && e !== null && "_tag" in e && (e as any)._tag === "AiError";

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
    const error = e as any;
    return Console.error(`
      ---------------------------------------
      💥 OTHER ERROR CAUGHT 💥
      Type: "${error?.constructor?.name || 'UnknownType'}"
      Message: "${String(error)}"
      Stack: ${error instanceof Error ? error.stack || 'No stack trace.' : 'Not an Error object.'}
      Raw Object: ${JSON.stringify(error, null, 2)}
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
