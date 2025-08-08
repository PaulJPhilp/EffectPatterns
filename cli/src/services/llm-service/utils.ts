// File reading and MDX processing utilities
import { FileSystem } from "@effect/platform";
import { Effect, Redacted } from "effect";
import { MdxService } from "../mdx-service/service.js";
import { CONFIG_KEYS } from "../../config/constants.js";
import { FileReadError } from "./errors.js";
import type { Models, Providers } from "./types.js";

interface MdxPromptConfig {
  provider: string;
  model: string;
  parameters?: Record<string, unknown>;
}

interface ParsedMdxFile {
  attributes: { provider: string; model: string; parameters?: Record<string, unknown> };
  provider: string;
  model: string;
  parameters?: Record<string, unknown>;
  body: string;
}

// Custom error types
export class InvalidMdxFormatError extends Error {
  readonly _tag = "InvalidMdxFormatError";
  constructor(public readonly reason: string) {
    super(`Invalid MDX format: ${reason}`);
  }
}

export class InvalidFrontmatterError extends Error {
  readonly _tag = "InvalidFrontmatterError";
  constructor(public readonly reason: string) {
    super(`Invalid frontmatter: ${reason}`);
  }
}

// Read file content safely
export const readFileContent = (filePath: string) =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fs) => fs.readFileString(filePath)),
    Effect.mapError((error) => new Error(`Failed to read file ${filePath}: ${error}`))
  );

// Parse MDX frontmatter using MDX service
export const parseMdxFile = (content: string) =>
  Effect.gen(function* () {
    const mdxService = yield* MdxService;
    const parsed = yield* mdxService.parseMdxFile(content);
    return {
      attributes: parsed.attributes as Record<string, unknown>,
      body: parsed.body,
    };
  });

// Validate MDX configuration
export const validateMdxConfig = (attributes: Record<string, unknown>) =>
  Effect.gen(function* () {
    const provider = typeof attributes.provider === 'string' ? attributes.provider : undefined;
    const model = typeof attributes.model === 'string' ? attributes.model : undefined;
    const parameters = typeof attributes.parameters === 'object' && attributes.parameters !== null
      ? attributes.parameters as Record<string, unknown>
      : undefined;

    if (!provider || !isValidProvider(provider)) {
      return yield* Effect.fail(new InvalidFrontmatterError(`Invalid provider: ${String(provider)}`));
    }

    if (!model || !isValidModel(model)) {
      return yield* Effect.fail(new InvalidFrontmatterError(`Invalid model: ${String(model)}`));
    }

    return { provider, model, parameters };
  });

// Combine all file processing steps
export const processMdxFile = (filePath: string) =>
	Effect.gen(function* () {
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
export const processTextFile = (filePath: string) =>
	Effect.gen(function* () {
		const content = yield* readFileContent(filePath);
		return content.trim();
	});

// Type guard function to validate providers
export const isValidProvider = (provider: string): provider is Providers => {
	return (
		provider === "google" || provider === "openai" || provider === "anthropic"
	);
};

const isValidModel = (model: string): model is Models => {
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
		model === "claude-3-5-opus-latest"
	);
};

// Function to get Google API key
export const getGoogleApiKey = Effect.gen(function* () {
	const key = process.env[CONFIG_KEYS.GOOGLE_AI_API_KEY];
	if (!key) {
		return yield* Effect.fail(new Error(`${CONFIG_KEYS.GOOGLE_AI_API_KEY} not found`));
	}
	return Redacted.make(key);
});

// Function to get OpenAI API key
export const getOpenAIApiKey = Effect.gen(function* () {
	const key = process.env[CONFIG_KEYS.OPENAI_API_KEY];
	if (!key) {
		return yield* Effect.fail(new Error(`${CONFIG_KEYS.OPENAI_API_KEY} not found`));
	}
	return Redacted.make(key);
});

// Function to get Anthropic API key
export const getAnthropicApiKey = Effect.gen(function* () {
	const key = process.env[CONFIG_KEYS.ANTHROPIC_API_KEY];
	if (!key) {
		return yield* Effect.fail(new Error(`${CONFIG_KEYS.ANTHROPIC_API_KEY} not found`));
	}
	return Redacted.make(key);
});
