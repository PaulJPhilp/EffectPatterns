import { Effect, Exit, type Cause } from "effect";
import { describe, expect, it } from "vitest";
import {
  ModelService,
  type ModelNotFoundError,
  type ProviderNotFoundError,
} from "../service.js";
import type { Model, Provider } from "../types.js";

describe("ModelService", () => {
  const runEffect = <E, A>(effect: Effect.Effect<A, E, ModelService>) =>
    Effect.runPromiseExit(
      Effect.provide(effect, ModelService.Default)
    );

  describe("getModel", () => {
    it("should retrieve a model by name successfully", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModel("gpt-4");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const model = exit.value as Model;
        expect(model.name).toBe("gpt-4");
        expect(model.capabilities).toContain("text-generation");
        expect(model.capabilities).toContain("code-generation");
        expect(model.contextWindow).toBe(8192);
        expect(model.inputCostPerMillionTokens).toBe(10.0);
        expect(model.outputCostPerMillionTokens).toBe(30.0);
        expect(model.rateLimit).toBeDefined();
        expect(model.rateLimit?.requestsPerMinute).toBe(1000);
        expect(model.rateLimit?.tokensPerMinute).toBe(50000);
      }
    });

    it("should retrieve gpt-3.5-turbo model with correct properties", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModel("gpt-3.5-turbo");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const model = exit.value as Model;
        expect(model.name).toBe("gpt-3.5-turbo");
        expect(model.contextWindow).toBe(4096);
        expect(model.inputCostPerMillionTokens).toBe(0.5);
        expect(model.outputCostPerMillionTokens).toBe(1.5);
        expect(model.rateLimit?.requestsPerMinute).toBe(3000);
        expect(model.rateLimit?.tokensPerMinute).toBe(200000);
      }
    });

    it("should retrieve Anthropic Opus 4.1 with correct properties", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModel("claude-opus-4-1-20250805");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const model = exit.value as Model;
        expect(model.name).toBe("claude-opus-4-1-20250805");
        expect(model.capabilities).toContain("image-analysis");
        expect(model.contextWindow).toBe(200000);
        expect(model.inputCostPerMillionTokens).toBe(15.0);
        expect(model.outputCostPerMillionTokens).toBe(75.0);
      }
    });

    it("should fail with ModelNotFoundError for non-existent model", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModel("non-existent-model");
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ModelNotFoundError>).error._tag).toBe(
          "ModelNotFoundError"
        );
        expect((cause as Cause.Fail<ModelNotFoundError>).error.modelName).toBe(
          "non-existent-model"
        );
      }
    });

    it("should fail with ModelNotFoundError for empty model name", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModel("");
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ModelNotFoundError>).error._tag).toBe(
          "ModelNotFoundError"
        );
        expect((cause as Cause.Fail<ModelNotFoundError>).error.modelName).toBe(
          ""
        );
      }
    });

    it("should fail with ModelNotFoundError for case-sensitive model names", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModel("GPT-4");
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ModelNotFoundError>).error._tag).toBe(
          "ModelNotFoundError"
        );
        expect((cause as Cause.Fail<ModelNotFoundError>).error.modelName).toBe(
          "GPT-4"
        );
      }
    });
  });

  describe("getModels", () => {
    it("should retrieve all models for OpenAI provider", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModels("OpenAI");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(6);
        const names = models.map((m) => m.name);
        expect(names).toContain("gpt-4");
        expect(names).toContain("gpt-3.5-turbo");
        expect(names).toContain("gpt-5");
        expect(names).toContain("gpt-5-mini");
        expect(names).toContain("gpt-5-nano");
        expect(names).toContain("gpt-5-chat-latest");
        expect(
          models.every(
            (model) =>
              model.capabilities.includes("text-generation") ||
              model.capabilities.includes("code-generation")
          )
        ).toBe(true);
      }
    });

    it("should retrieve all models for Anthropic provider", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModels("Anthropic");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(7);
        const names = models.map((m) => m.name);
        expect(names).toEqual(
          expect.arrayContaining([
            "claude-opus-4-1-20250805",
            "claude-opus-4-20250514",
            "claude-sonnet-4-20250514",
            "claude-3-7-sonnet-20250219",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-haiku-20240307",
          ])
        );
      }
    });

    it("should fail with ProviderNotFoundError for non-existent provider", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModels("NonExistentProvider");
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ProviderNotFoundError>).error._tag).toBe(
          "ProviderNotFoundError"
        );
        expect(
          (cause as Cause.Fail<ProviderNotFoundError>).error.providerName
        ).toBe("NonExistentProvider");
      }
    });

    it("should fail with ProviderNotFoundError for empty provider name", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModels("");
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ProviderNotFoundError>).error._tag).toBe(
          "ProviderNotFoundError"
        );
        expect(
          (cause as Cause.Fail<ProviderNotFoundError>).error.providerName
        ).toBe("");
      }
    });

    it("should fail with ProviderNotFoundError for case-sensitive provider names", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModels("openai");
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ProviderNotFoundError>).error._tag).toBe(
          "ProviderNotFoundError"
        );
        expect(
          (cause as Cause.Fail<ProviderNotFoundError>).error.providerName
        ).toBe("openai");
      }
    });
  });

  describe("getProvider", () => {
    it("should retrieve OpenAI provider with correct properties", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getProvider("OpenAI");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const provider = exit.value as Provider;
        expect(provider.name).toBe("OpenAI");
        expect(provider.apiKeyEnvVar).toBe("OPENAI_API_KEY");
        expect(provider.supportedModels).toEqual(
          expect.arrayContaining([
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-5",
            "gpt-5-mini",
            "gpt-5-nano",
            "gpt-5-chat-latest",
          ])
        );
        expect(provider.supportedModels.length).toBe(6);
      }
    });

    it("should retrieve Anthropic provider with correct properties", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getProvider("Anthropic");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const provider = exit.value as Provider;
        expect(provider.name).toBe("Anthropic");
        expect(provider.apiKeyEnvVar).toBe("ANTHROPIC_API_KEY");
        expect(provider.supportedModels).toContain("claude-opus-4-1-20250805");
        expect(provider.supportedModels).toContain("claude-sonnet-4-20250514");
        expect(provider.supportedModels.length).toBe(7);
      }
    });

    it("should fail with ProviderNotFoundError for non-existent provider", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getProvider("NonExistentProvider");
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ProviderNotFoundError>).error._tag).toBe(
          "ProviderNotFoundError"
        );
        expect(
          (cause as Cause.Fail<ProviderNotFoundError>).error.providerName
        ).toBe("NonExistentProvider");
      }
    });

    it("should fail with ProviderNotFoundError for empty provider name", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getProvider("");
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ProviderNotFoundError>).error._tag).toBe(
          "ProviderNotFoundError"
        );
        expect(
          (cause as Cause.Fail<ProviderNotFoundError>).error.providerName
        ).toBe("");
      }
    });
  });

  describe("listAllModels", () => {
    it("should return all available models", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.listAllModels();
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(18);

        // Check all expected models are present
        const modelNames = models.map((m) => m.name);
        expect(modelNames).toContain("gpt-4");
        expect(modelNames).toContain("gpt-3.5-turbo");
        expect(modelNames).toContain("gpt-5");
        expect(modelNames).toContain("gpt-5-mini");
        expect(modelNames).toContain("gpt-5-nano");
        expect(modelNames).toContain("gpt-5-chat-latest");
        expect(modelNames).toContain("claude-opus-4-1-20250805");
        expect(modelNames).toContain("claude-opus-4-20250514");
        expect(modelNames).toContain("claude-sonnet-4-20250514");
        expect(modelNames).toContain("claude-3-7-sonnet-20250219");
        expect(modelNames).toContain("claude-3-5-sonnet-20241022");
        expect(modelNames).toContain("claude-3-5-haiku-20241022");
        expect(modelNames).toContain("claude-3-haiku-20240307");
        expect(modelNames).toContain("gemini-2.5-pro");
        expect(modelNames).toContain("gemini-2.5-flash");
        expect(modelNames).toContain("gemini-2.5-flash-lite");
        expect(modelNames).toContain("gemini-2.0-flash");
        expect(modelNames).toContain("gemini-2.0-flash-lite");

        // Check all models have required properties
        for (const model of models) {
          expect(model.name).toBeDefined();
          expect(typeof model.name).toBe("string");
          expect(model.name.length).toBeGreaterThan(0);

          expect(model.capabilities).toBeDefined();
          expect(Array.isArray(model.capabilities)).toBe(true);
          expect(model.capabilities.length).toBeGreaterThan(0);
          expect(
            model.capabilities.every((cap) => typeof cap === "string")
          ).toBe(true);

          expect(model.contextWindow).toBeDefined();
          expect(typeof model.contextWindow).toBe("number");
          expect(model.contextWindow).toBeGreaterThan(0);

          expect(model.inputCostPerMillionTokens).toBeDefined();
          expect(typeof model.inputCostPerMillionTokens).toBe("number");
          expect(model.inputCostPerMillionTokens).toBeGreaterThanOrEqual(0);

          expect(model.outputCostPerMillionTokens).toBeDefined();
          expect(typeof model.outputCostPerMillionTokens).toBe("number");
          expect(model.outputCostPerMillionTokens).toBeGreaterThanOrEqual(0);

          if (model.rateLimit) {
            expect(typeof model.rateLimit).toBe("object");
            if (model.rateLimit.requestsPerMinute) {
              expect(typeof model.rateLimit.requestsPerMinute).toBe("number");
              expect(model.rateLimit.requestsPerMinute).toBeGreaterThan(0);
            }
            if (model.rateLimit.tokensPerMinute) {
              expect(typeof model.rateLimit.tokensPerMinute).toBe("number");
              expect(model.rateLimit.tokensPerMinute).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });

  describe("getModelsByCapability", () => {
    it("should return models with text-generation capability", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByCapability("text-generation");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBeGreaterThan(0);
        expect(
          models.every((model) =>
            model.capabilities.includes("text-generation")
          )
        ).toBe(true);
      }
    });

    it("should return models with code-generation capability", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByCapability("code-generation");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBeGreaterThan(0);
        expect(
          models.every((model) =>
            model.capabilities.includes("code-generation")
          )
        ).toBe(true);
      }
    });

    it("should return models with image-analysis capability", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByCapability("image-analysis");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(3);
        const names = models.map((m) => m.name);
        expect(names).toEqual(
          expect.arrayContaining([
            "claude-opus-4-1-20250805",
            "claude-opus-4-20250514",
            "claude-sonnet-4-20250514",
          ])
        );
      }
    });

    it("should return empty array for non-existent capability", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByCapability(
            "non-existent-capability"
          );
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(0);
      }
    });

    it("should return empty array for empty capability string", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByCapability("");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(0);
      }
    });

    it("should handle case-sensitive capability matching", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByCapability("TEXT-GENERATION");
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(0);
      }
    });
  });

  describe("getModelsByProviderAndCapability", () => {
    it("should return OpenAI models with code-generation capability", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByProviderAndCapability(
            "OpenAI",
            "code-generation"
          );
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(6);
        expect(models.some((model) => model.name === "gpt-4")).toBe(true);
        expect(models.some((model) => model.name === "gpt-3.5-turbo")).toBe(
          true
        );
        expect(
          models.every((model) =>
            model.capabilities.includes("code-generation")
          )
        ).toBe(true);
      }
    });

    it("should return Anthropic models with text-generation capability", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByProviderAndCapability(
            "Anthropic",
            "text-generation"
          );
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(7);
        expect(
          models.some((model) => model.name === "claude-opus-4-1-20250805")
        ).toBe(true);
        expect(
          models.some((model) => model.name === "claude-sonnet-4-20250514")
        ).toBe(true);
        expect(
          models.every((model) =>
            model.capabilities.includes("text-generation")
          )
        ).toBe(true);
      }
    });

    it("should return only models with specific capability from provider", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByProviderAndCapability(
            "Anthropic",
            "image-analysis"
          );
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(3);
        expect(models[0].name).toBe("claude-opus-4-1-20250805");
        expect(models[0].capabilities).toContain("image-analysis");
      }
    });

    it("should return empty array when provider has no models with capability", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByProviderAndCapability(
            "OpenAI",
            "image-analysis"
          );
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const models = exit.value as Model[];
        expect(models.length).toBe(0);
      }
    });

    it("should fail with ProviderNotFoundError for non-existent provider", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByProviderAndCapability(
            "NonExistentProvider",
            "text-generation"
          );
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ProviderNotFoundError>).error._tag).toBe(
          "ProviderNotFoundError"
        );
        expect(
          (cause as Cause.Fail<ProviderNotFoundError>).error.providerName
        ).toBe("NonExistentProvider");
      }
    });

    it("should fail with ProviderNotFoundError for empty provider name", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          return yield* service.getModelsByProviderAndCapability(
            "",
            "text-generation"
          );
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const cause = exit.cause;
        expect(cause._tag).toBe("Fail");
        expect((cause as Cause.Fail<ProviderNotFoundError>).error._tag).toBe(
          "ProviderNotFoundError"
        );
        expect(
          (cause as Cause.Fail<ProviderNotFoundError>).error.providerName
        ).toBe("");
      }
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle concurrent access to the same model", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          const [model1, model2] = yield* Effect.all([
            service.getModel("gpt-4"),
            service.getModel("gpt-4"),
          ]);
          return [model1, model2];
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const [model1, model2] = exit.value as [Model, Model];
        expect(model1.name).toBe("gpt-4");
        expect(model2.name).toBe("gpt-4");
        expect(model1).toEqual(model2);
      }
    });

    it("should handle concurrent access to different models", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          const [gpt4, gpt35, claude] = yield* Effect.all([
            service.getModel("gpt-4"),
            service.getModel("gpt-3.5-turbo"),
            service.getModel("claude-opus-4-1-20250805"),
          ]);
          return [gpt4, gpt35, claude];
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const [gpt4, gpt35, claude] = exit.value as [Model, Model, Model];
        expect(gpt4.name).toBe("gpt-4");
        expect(gpt35.name).toBe("gpt-3.5-turbo");
        expect(claude.name).toBe("claude-opus-4-1-20250805");
      }
    });

    it("should handle concurrent failures gracefully", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          const [success, failure] = yield* Effect.all([
            service.getModel("gpt-4"),
            service.getModel("non-existent-model"),
          ]);
          return [success, failure];
        })
      );
      expect(Exit.isFailure(exit)).toBe(true);
    });

    it("should validate model properties are consistent", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          const allModels = yield* service.listAllModels();

          // Validate each model has consistent properties
          for (const model of allModels) {
            expect(model.name).toBeDefined();
            expect(typeof model.name).toBe("string");
            expect(model.name.length).toBeGreaterThan(0);

            expect(model.capabilities).toBeDefined();
            expect(Array.isArray(model.capabilities)).toBe(true);
            expect(model.capabilities.length).toBeGreaterThan(0);
            expect(
              model.capabilities.every((cap) => typeof cap === "string")
            ).toBe(true);

            expect(model.contextWindow).toBeDefined();
            expect(typeof model.contextWindow).toBe("number");
            expect(model.contextWindow).toBeGreaterThan(0);

            expect(model.inputCostPerMillionTokens).toBeDefined();
            expect(typeof model.inputCostPerMillionTokens).toBe("number");
            expect(model.inputCostPerMillionTokens).toBeGreaterThanOrEqual(0);

            expect(model.outputCostPerMillionTokens).toBeDefined();
            expect(typeof model.outputCostPerMillionTokens).toBe("number");
            expect(model.outputCostPerMillionTokens).toBeGreaterThanOrEqual(0);

            if (model.rateLimit) {
              expect(typeof model.rateLimit).toBe("object");
              if (model.rateLimit.requestsPerMinute) {
                expect(typeof model.rateLimit.requestsPerMinute).toBe("number");
                expect(model.rateLimit.requestsPerMinute).toBeGreaterThan(0);
              }
              if (model.rateLimit.tokensPerMinute) {
                expect(typeof model.rateLimit.tokensPerMinute).toBe("number");
                expect(model.rateLimit.tokensPerMinute).toBeGreaterThan(0);
              }
            }
          }

          return allModels;
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
    });

    it("should validate provider properties are consistent", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          const providers = ["OpenAI", "Anthropic"];

          for (const providerName of providers) {
            const provider = yield* service.getProvider(providerName);

            expect(provider.name).toBeDefined();
            expect(typeof provider.name).toBe("string");
            expect(provider.name).toBe(providerName);

            expect(provider.apiKeyEnvVar).toBeDefined();
            expect(typeof provider.apiKeyEnvVar).toBe("string");
            expect(provider.apiKeyEnvVar.length).toBeGreaterThan(0);

            expect(provider.supportedModels).toBeDefined();
            expect(Array.isArray(provider.supportedModels)).toBe(true);
            expect(provider.supportedModels.length).toBeGreaterThan(0);
            expect(
              provider.supportedModels.every(
                (model) => typeof model === "string"
              )
            ).toBe(true);
          }

          return providers;
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    it("should work with all providers and their models", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          const providers = ["OpenAI", "Anthropic"];
          const results = [];

          for (const providerName of providers) {
            const provider = yield* service.getProvider(providerName);
            const models = yield* service.getModels(providerName);

            results.push({
              provider: provider.name,
              modelCount: models.length,
              models: models.map((m) => m.name),
            });
          }

          return results;
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const results = exit.value as Array<{
          provider: string;
          modelCount: number;
          models: string[];
        }>;

        expect(results.length).toBe(2);

        const openaiResult = results.find((r) => r.provider === "OpenAI");
        expect(openaiResult).toBeDefined();
        if (openaiResult) {
          expect(openaiResult.modelCount).toBe(6);
          expect(openaiResult.models).toContain("gpt-4");
          expect(openaiResult.models).toContain("gpt-3.5-turbo");
        }

        const anthropicResult = results.find((r) => r.provider === "Anthropic");
        expect(anthropicResult).toBeDefined();
        if (anthropicResult) {
          expect(anthropicResult.modelCount).toBe(7);
          expect(anthropicResult.models).toContain("claude-opus-4-1-20250805");
          expect(anthropicResult.models).toContain("claude-sonnet-4-20250514");
        }
      }
    });

    it("should find models by multiple capabilities", async () => {
      const exit = await runEffect(
        Effect.gen(function* () {
          const service = yield* ModelService;
          const capabilities = [
            "text-generation",
            "code-generation",
            "image-analysis",
          ];
          const results = [];

          for (const capability of capabilities) {
            const models = yield* service.getModelsByCapability(capability);
            results.push({
              capability,
              modelCount: models.length,
              models: models.map((m) => m.name),
            });
          }

          return results;
        })
      );
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        const results = exit.value as Array<{
          capability: string;
          modelCount: number;
          models: string[];
        }>;

        expect(results.length).toBe(3);

        const textGenResult = results.find(
          (r) => r.capability === "text-generation"
        );
        expect(textGenResult).toBeDefined();
        if (textGenResult) {
          expect(textGenResult.modelCount).toBeGreaterThan(0);
        }

        const codeGenResult = results.find(
          (r) => r.capability === "code-generation"
        );
        expect(codeGenResult).toBeDefined();
        if (codeGenResult) {
          expect(codeGenResult.modelCount).toBeGreaterThan(0);
        }

        const imageAnalysisResult = results.find(
          (r) => r.capability === "image-analysis"
        );
        expect(imageAnalysisResult).toBeDefined();
        if (imageAnalysisResult) {
          expect(imageAnalysisResult.modelCount).toBe(3);
          expect(imageAnalysisResult.models).toContain(
            "claude-opus-4-1-20250805"
          );
        }
      }
    });
  });
});
