// File reading and MDX processing utilities
import { FileSystem } from "@effect/platform";
import { Effect, Redacted } from "effect";
import matter from "gray-matter";
import { CONFIG_KEYS } from "../../config/constants.js";
import { FileReadError, InvalidFrontmatterError, InvalidMdxFormatError } from "./errors.js";
import type { Models, Providers } from "./types.js";


export interface MdxPromptConfig {
	provider: string;
	model: string;
	parameters?: Record<string, unknown>;
}

export interface ParsedMdxFile {
	attributes: { provider: string; model: string; parameters?: Record<string, unknown> };
	body: string;
}

// Read file content safely
export const readFileContent = (filePath: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const content = yield* fs.readFileString(filePath);
		return content;
	}).pipe(
		Effect.catchAll((error) => Effect.fail(new FileReadError({ filePath, reason: error instanceof Error ? error.message : String(error) }))
		))

// Parse MDX frontmatter
export const parseMdxFile = (content: string) =>
	Effect.gen(function* () {
		try {
			const parsed = matter(content);

			if (!parsed.data || typeof parsed.data !== 'object') {
				return yield* Effect.fail(new InvalidMdxFormatError({ reason: "Invalid frontmatter format" }));
			}

			return {
				attributes: parsed.data as Record<string, unknown>,
				body: parsed.content,
			};
		} catch (error) {
			return yield* Effect.fail(new InvalidMdxFormatError({ reason: error instanceof Error ? error.message : "Failed to parse MDX" }));
		}
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
			return yield* Effect.fail(new InvalidFrontmatterError({ reason: `Invalid provider: ${String(provider)}` }));
		}

		if (!model || !isValidModel(model)) {
			return yield* Effect.fail(new InvalidFrontmatterError({ reason: `Invalid model: ${String(model)}` }));
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
