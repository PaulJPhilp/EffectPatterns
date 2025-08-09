import { Context, Effect } from "effect";
const hardcodedProviders = [
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
const hardcodedModels = [
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
export const make = {
    getModel: (modelName) => {
        const model = hardcodedModels.find((model) => model.name === modelName);
        if (model) {
            return Effect.succeed(model);
        }
        return Effect.fail({
            _tag: "ModelNotFoundError",
            modelName: modelName,
        });
    },
    getModels: (providerName) => {
        const provider = hardcodedProviders.find((provider) => provider.name === providerName);
        if (provider) {
            const models = hardcodedModels.filter((model) => provider.supportedModels.includes(model.name));
            return Effect.succeed(models);
        }
        return Effect.fail({
            _tag: "ProviderNotFoundError",
            providerName: providerName,
        });
    },
    getProvider: (providerName) => {
        const provider = hardcodedProviders.find((provider) => provider.name === providerName);
        if (provider) {
            return Effect.succeed(provider);
        }
        return Effect.fail({
            _tag: "ProviderNotFoundError",
            providerName: providerName,
        });
    },
    listAllModels: () => Effect.succeed(hardcodedModels),
    getModelsByCapability: (capability) => Effect.succeed(hardcodedModels.filter((model) => model.capabilities.includes(capability))),
    getModelsByProviderAndCapability: (providerName, capability) => {
        const provider = hardcodedProviders.find((provider) => provider.name === providerName);
        if (provider) {
            const models = hardcodedModels.filter((model) => provider.supportedModels.includes(model.name) &&
                model.capabilities.includes(capability));
            return Effect.succeed(models);
        }
        return Effect.fail({
            _tag: "ProviderNotFoundError",
            providerName: providerName,
        });
    },
};
export class ModelService extends Context.Tag("ModelService")() {
}
