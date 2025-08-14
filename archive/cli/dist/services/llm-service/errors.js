import { Console, Data } from "effect";
const hasTag = (x) => typeof x === "object" && x !== null && "_tag" in x &&
    typeof x["_tag"] === "string";
const isAiError = (e) => hasTag(e) && e._tag === "AiError";
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
        const isObject = typeof e === "object" && e !== null;
        let ctorName;
        if (isObject) {
            const ctor = e.constructor;
            ctorName = typeof ctor?.name === "string" ? ctor.name : "Object";
        }
        else {
            ctorName = typeof e;
        }
        const message = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error ? (e.stack || 'No stack trace.') : 'Not an Error object.';
        let raw = "<unserializable>";
        try {
            raw = JSON.stringify(e, null, 2);
        }
        catch {
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
//# sourceMappingURL=errors.js.map