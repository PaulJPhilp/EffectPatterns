import { Effect } from "effect";
import type { Model, Provider } from "./types.js";
import { ModelNotFoundError, ProviderNotFoundError } from "./errors.js";
export type { ModelNotFoundError, ProviderNotFoundError } from "./errors.js";

const hardcodedProviders: Provider[] = [
  {
    name: "OpenAI",
    apiKeyEnvVar: "OPENAI_API_KEY",
    supportedModels: [
      "gpt-4",
      "gpt-3.5-turbo",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5-chat-latest",
    ],
  },
  {
    name: "Anthropic",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    supportedModels: [
      // Latest Anthropic models (see: docs)
      "claude-opus-4-1-20250805",
      "claude-opus-4-20250514",
      "claude-sonnet-4-20250514",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-haiku-20240307",
    ],
  },
  {
    name: "Google",
    apiKeyEnvVar: "GOOGLE_AI_API_KEY",
    supportedModels: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ],
  },
];

const hardcodedModels: Model[] = [
  {
    name: "gpt-4",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 8192,
    inputCostPerMillionTokens: 10.0,
    outputCostPerMillionTokens: 30.0,
    rateLimit: { requestsPerMinute: 1000, tokensPerMinute: 50000 },
  },
  {
    name: "gpt-3.5-turbo",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 4096,
    inputCostPerMillionTokens: 0.5,
    outputCostPerMillionTokens: 1.5,
    rateLimit: { requestsPerMinute: 3000, tokensPerMinute: 200000 },
  },
  // OpenAI GPT-5 frontier family
  {
    name: "gpt-5",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 400000,
    inputCostPerMillionTokens: 1.25,
    outputCostPerMillionTokens: 10.0,
    rateLimit: { requestsPerMinute: 2000, tokensPerMinute: 200000 },
    maxOutputTokens: 128000,
    knowledgeCutoff: "2024-09-30",
  },
  {
    name: "gpt-5-mini",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 400000,
    inputCostPerMillionTokens: 0.25,
    outputCostPerMillionTokens: 2.0,
    rateLimit: { requestsPerMinute: 5000, tokensPerMinute: 400000 },
    maxOutputTokens: 128000,
    knowledgeCutoff: "2024-05-30",
  },
  {
    name: "gpt-5-nano",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 400000,
    inputCostPerMillionTokens: 0.05,
    outputCostPerMillionTokens: 0.4,
    rateLimit: { requestsPerMinute: 10000, tokensPerMinute: 800000 },
    maxOutputTokens: 128000,
    knowledgeCutoff: "2024-05-30",
  },
  {
    name: "gpt-5-chat-latest",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 400000,
    inputCostPerMillionTokens: 1.25,
    outputCostPerMillionTokens: 10.0,
    rateLimit: { requestsPerMinute: 3000, tokensPerMinute: 300000 },
    maxOutputTokens: 128000,
    knowledgeCutoff: "2024-09-29",
  },
  {
    name: "claude-opus-4-1-20250805",
    capabilities: ["text-generation", "image-analysis", "code-generation"],
    contextWindow: 200000,
    inputCostPerMillionTokens: 15.0,
    outputCostPerMillionTokens: 75.0,
    rateLimit: { requestsPerMinute: 100, tokensPerMinute: 50000 },
  },
  {
    name: "claude-opus-4-20250514",
    capabilities: ["text-generation", "image-analysis", "code-generation"],
    contextWindow: 200000,
    inputCostPerMillionTokens: 15.0,
    outputCostPerMillionTokens: 75.0,
    rateLimit: { requestsPerMinute: 100, tokensPerMinute: 50000 },
  },
  {
    name: "claude-sonnet-4-20250514",
    capabilities: ["text-generation", "image-analysis", "code-generation"],
    contextWindow: 200000,
    inputCostPerMillionTokens: 3.0,
    outputCostPerMillionTokens: 15.0,
    rateLimit: { requestsPerMinute: 200, tokensPerMinute: 100000 },
  },
  {
    name: "claude-3-7-sonnet-20250219",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 200000,
    inputCostPerMillionTokens: 3.0,
    outputCostPerMillionTokens: 15.0,
    rateLimit: { requestsPerMinute: 200, tokensPerMinute: 100000 },
  },
  {
    name: "claude-3-5-sonnet-20241022",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 200000,
    inputCostPerMillionTokens: 3.0,
    outputCostPerMillionTokens: 15.0,
    rateLimit: { requestsPerMinute: 200, tokensPerMinute: 100000 },
  },
  {
    name: "claude-3-5-haiku-20241022",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 200000,
    inputCostPerMillionTokens: 0.8,
    outputCostPerMillionTokens: 4.0,
    rateLimit: { requestsPerMinute: 500, tokensPerMinute: 200000 },
  },
  {
    name: "claude-3-haiku-20240307",
    capabilities: ["text-generation", "code-generation"],
    contextWindow: 200000,
    inputCostPerMillionTokens: 0.25,
    outputCostPerMillionTokens: 1.25,
    rateLimit: { requestsPerMinute: 500, tokensPerMinute: 200000 },
  },
  // Google Gemini models
  {
    name: "gemini-2.5-pro",
    capabilities: ["text-generation"],
    contextWindow: 100000,
    inputCostPerMillionTokens: 0,
    outputCostPerMillionTokens: 0,
  },
  {
    name: "gemini-2.5-flash",
    capabilities: ["text-generation"],
    contextWindow: 100000,
    inputCostPerMillionTokens: 0,
    outputCostPerMillionTokens: 0,
  },
  {
    name: "gemini-2.5-flash-lite",
    capabilities: ["text-generation"],
    contextWindow: 100000,
    inputCostPerMillionTokens: 0,
    outputCostPerMillionTokens: 0,
  },
  {
    name: "gemini-2.0-flash",
    capabilities: ["text-generation"],
    contextWindow: 100000,
    inputCostPerMillionTokens: 0,
    outputCostPerMillionTokens: 0,
  },
  {
    name: "gemini-2.0-flash-lite",
    capabilities: ["text-generation"],
    contextWindow: 100000,
    inputCostPerMillionTokens: 0,
    outputCostPerMillionTokens: 0,
  },
];

// Implementation is provided via Effect.Service below; no separate factory needed.

export class ModelService extends Effect.Service<ModelService>()(
  "ModelService",
  {
    sync: () => ({
      getModel: (modelName: string) => {
        const model = hardcodedModels.find((m) => m.name === modelName);
        if (model) return Effect.succeed(model);
        return Effect.fail(new ModelNotFoundError({ modelName }));
      },

      getModels: (providerName: string) => {
        const provider = hardcodedProviders.find((p) => p.name === providerName);
        if (provider) {
          const models = hardcodedModels.filter((m) =>
            provider.supportedModels.includes(m.name)
          );
          return Effect.succeed(models);
        }
        return Effect.fail(new ProviderNotFoundError({ providerName }));
      },

      getProvider: (providerName: string) => {
        const provider = hardcodedProviders.find((p) => p.name === providerName);
        if (provider) return Effect.succeed(provider);
        return Effect.fail(new ProviderNotFoundError({ providerName }));
      },

      listAllModels: () => Effect.succeed(hardcodedModels),

      getModelsByCapability: (capability: string) =>
        Effect.succeed(
          hardcodedModels.filter((m) => m.capabilities.includes(capability))
        ),

      getModelsByProviderAndCapability: (
        providerName: string,
        capability: string
      ) => {
        const provider = hardcodedProviders.find((p) => p.name === providerName);
        if (provider) {
          const models = hardcodedModels.filter(
            (m) =>
              provider.supportedModels.includes(m.name) &&
              m.capabilities.includes(capability)
          );
          return Effect.succeed(models);
        }
        return Effect.fail(new ProviderNotFoundError({ providerName }));
      },
    }),
  }
) {}
