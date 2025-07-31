import { Effect, Layer, ManagedRuntime, Config } from "effect";
import { NodeContext, NodeHttpClient, NodeFileSystem, NodePath, NodeTerminal } from "@effect/platform-node";
import { ConfigError, ConfigService } from "../services/config-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { MetricsService } from "../services/metrics-service/service.js";
import { LLMService } from "../services/llm-service/service.js";
import { AuthError, AuthService } from "../services/auth-service/service.js";
import { RunService } from "../services/run-service/service.js";
import { ConfigProvider } from "effect";
import * as AnthropicClient from "@effect/ai-anthropic/AnthropicClient";
import * as GoogleAiClient from "@effect/ai-google/GoogleAiClient";
import * as OpenAiClient from "@effect/ai-openai/OpenAiClient";

// Test configuration provider for testing environment
const ProductionConfigProvider = ConfigProvider.fromEnv();

// Platform services layer that provides all necessary platform services
const ProductionPlatformLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layer,
  NodeFileSystem.layer,
  NodePath.layer,
  NodeTerminal.layer,
);

// Application service layers

// Merge all application-level services into a single layer.
const AppLayer = Layer.mergeAll(
  ConfigService.Default,
  AuthService.Default,
  MetricsService.Default,
  OtelService.Default,
  RunService.Default,
  LLMService.Default
);

// The LiveEnv layer provides all the live implementations for the application's context.
const LiveEnv = Layer.merge(
  ProductionPlatformLayer,
  Layer.setConfigProvider(ProductionConfigProvider)
);

// AI client layers
const AiClientLayers = Layer.mergeAll(
  Layer.effect(
    AnthropicClient.AnthropicClient,
    Effect.flatMap(Config.redacted("ANTHROPIC_API_KEY"), (apiKey) =>
      AnthropicClient.make({ apiKey })
    )
  ),
  Layer.scoped(
    GoogleAiClient.GoogleAiClient,
    Effect.flatMap(Config.redacted("GOOGLE_AI_API_KEY"), (apiKey) =>
      GoogleAiClient.make({ apiKey })
    )
  ),
  Layer.effect(
    OpenAiClient.OpenAiClient,
    Effect.flatMap(Config.redacted("OPENAI_API_KEY"), (apiKey) =>
      OpenAiClient.make({ apiKey })
    )
  )
);

// The final ProductionLayers provides the live environment to the application, resolving all dependencies.
const AppAndAiLayer = Layer.merge(AppLayer, AiClientLayers);

// The final ProductionLayers provides the live environment to the application, resolving all dependencies,
// and then merges the LiveEnv back in to expose the platform services in the final output.
export const ProductionLayers = Layer.provide(AppAndAiLayer, LiveEnv).pipe(
  Layer.merge(LiveEnv)
);

// Create the managed runtime for production
export const ProductionRuntime = ManagedRuntime.make(ProductionLayers);

// Helper function to run effects in production runtime
export const runProductionEffect = <A, E>(effect: Effect.Effect<A, E>) => {
  return ProductionRuntime.runPromise(effect);
};

// Helper function to run effects and get exit in production
export const runProductionExit = <A, E>(effect: Effect.Effect<A, E>) => {
  return ProductionRuntime.runSyncExit(effect);
};
