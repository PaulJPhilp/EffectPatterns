// File reading and MDX processing utilities
import { FileSystem } from "@effect/platform";
import { Effect, Redacted } from "effect";
import { MdxService } from "../mdx-service/service.js";
import { CONFIG_KEYS } from "../../config/constants.js";
import { FileReadError, InvalidFrontmatterError, LlmServiceError } from "./errors.js";
// Custom error types are defined in errors.ts
// Read file content safely
export const readFileContent = (filePath) => FileSystem.FileSystem.pipe(Effect.flatMap((fs) => fs.readFileString(filePath)), Effect.mapError((error) => new FileReadError({ filePath, reason: String(error) })));
// Parse MDX frontmatter using MDX service
export const parseMdxFile = (content) => Effect.gen(function* () {
    const mdxService = yield* MdxService;
    const parsed = yield* mdxService.parseMdxFile(content);
    return {
        attributes: parsed.attributes,
        body: parsed.body,
    };
});
// Validate MDX configuration
export const validateMdxConfig = (attributes) => Effect.gen(function* () {
    const provider = typeof attributes.provider === 'string' ? attributes.provider : undefined;
    const model = typeof attributes.model === 'string' ? attributes.model : undefined;
    const parameters = typeof attributes.parameters === 'object' && attributes.parameters !== null
        ? attributes.parameters
        : undefined;
    if (!provider || !isValidProvider(provider)) {
        return yield* Effect.fail(new InvalidFrontmatterError({
            reason: `Invalid provider: ${String(provider)}`,
        }));
    }
    if (!model || !isValidModel(model)) {
        return yield* Effect.fail(new InvalidFrontmatterError({
            reason: `Invalid model: ${String(model)}`,
        }));
    }
    return { provider, model, parameters };
});
// Combine all file processing steps
export const processMdxFile = (filePath) => Effect.gen(function* () {
    const content = yield* readFileContent(filePath);
    const parsed = yield* parseMdxFile(content);
    const validated = yield* validateMdxConfig(parsed.attributes);
    return {
        prompt: parsed.body,
        provider: validated.provider,
        model: validated.model,
        parameters: validated.parameters,
    };
});
// Simple text file processing
export const processTextFile = (filePath) => Effect.gen(function* () {
    const content = yield* readFileContent(filePath);
    return content.trim();
});
// Type guard function to validate providers
export const isValidProvider = (provider) => {
    return (provider === "google" || provider === "openai" || provider === "anthropic");
};
const isValidModel = (model) => {
    return (
    // Google models
    model === "gemini-2.5-flash" ||
        model === "gemini-2.5-pro" ||
        model === "gemini-2.0-flash" ||
        model === "gemini-1.5-pro" ||
        model === "gemini-1.5-flash" ||
        model === "gemini-1.0-pro" ||
        // OpenAI models
        model === "gpt-4o" ||
        model === "gpt-4o-mini" ||
        model === "gpt-4-turbo" ||
        model === "gpt-4" ||
        model === "gpt-3.5-turbo" ||
        // Anthropic models
        model === "claude-3-5-sonnet-latest" ||
        model === "claude-3-5-haiku-latest" ||
        model === "claude-3-5-opus-latest");
};
// Function to get Google API key
export const getGoogleApiKey = Effect.gen(function* () {
    const key = process.env[CONFIG_KEYS.GOOGLE_AI_API_KEY];
    if (!key) {
        return yield* Effect.fail(new LlmServiceError({
            provider: "google",
            reason: `${CONFIG_KEYS.GOOGLE_AI_API_KEY} not found`,
        }));
    }
    return Redacted.make(key);
});
// Function to get OpenAI API key
export const getOpenAIApiKey = Effect.gen(function* () {
    const key = process.env[CONFIG_KEYS.OPENAI_API_KEY];
    if (!key) {
        return yield* Effect.fail(new LlmServiceError({
            provider: "openai",
            reason: `${CONFIG_KEYS.OPENAI_API_KEY} not found`,
        }));
    }
    return Redacted.make(key);
});
// Function to get Anthropic API key
export const getAnthropicApiKey = Effect.gen(function* () {
    const key = process.env[CONFIG_KEYS.ANTHROPIC_API_KEY];
    if (!key) {
        return yield* Effect.fail(new LlmServiceError({
            provider: "anthropic",
            reason: `${CONFIG_KEYS.ANTHROPIC_API_KEY} not found`,
        }));
    }
    return Redacted.make(key);
});
//# sourceMappingURL=utils.js.map