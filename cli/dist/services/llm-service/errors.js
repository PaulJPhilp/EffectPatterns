import { Console, Data } from "effect";
const isAiError = (e) => typeof e === "object" && e !== null && "_tag" in e && e._tag === "AiError";
export const logError = (e) => {
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
    }
    else {
        const error = e;
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
export class InvalidMdxFormatError extends Data.TaggedError("InvalidMdxFormatError") {
}
export class InvalidFrontmatterError extends Data.TaggedError("InvalidFrontmatterError") {
}
export class UnsupportedProviderError extends Data.TaggedError("UnsupportedProviderError") {
}
export class InvalidJsonResponseError extends Data.TaggedError("InvalidJsonResponseError") {
}
export class FileReadError extends Data.TaggedError("FileReadError") {
}
export class LlmServiceError extends Data.TaggedError("LlmServiceError") {
}
export class RateLimitError extends Data.TaggedError("RateLimitError") {
}
export class QuotaExceededError extends Data.TaggedError("QuotaExceededError") {
}
