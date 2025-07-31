import { Effect, Layer, ManagedRuntime } from "effect";
import { NodeContext, NodeHttpClient } from "@effect/platform-node";
import { ConfigError, ConfigService } from "../services/config-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { MetricsService } from "../services/metrics-service/service.js";
import { LLMService } from "../services/llm-service/service.js";
import { AuthError, AuthService } from "../services/auth-service/service.js";
import { RunService } from "../services/run-service/service.js";
import { ConfigProvider } from "effect";

// Test configuration provider for testing environment
const TestConfigProvider = ConfigProvider.fromMap(
  new Map([
    ["OPENAI_API_KEY", "test-openai-key"],
    ["ANTHROPIC_API_KEY", "test-anthropic-key"],
    ["GOOGLE_API_KEY", "test-google-key"],
    ["OTEL_ENDPOINT", "http://localhost:4317"],
    ["OTEL_SERVICE_NAME", "effect-patterns-cli-test"],
  ])
);

// Platform layer - essential Node.js services
const TestPlatformLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layer
);

// Application service layers
const TestAppServiceLayer = Layer.mergeAll(
  ConfigService.Default,
  AuthService.Default,
  MetricsService.Default,
  OtelService.Default,
  RunService.Default,
  LLMService.Default
);

// Compose all layers for testing
// Using Layer.provide to ensure platform services are available to application services
const TestingLayers = Layer.provide(
  Layer.mergeAll(
    TestAppServiceLayer,
    Layer.setConfigProvider(TestConfigProvider)
  ),
  TestPlatformLayer
);

// Create the managed runtime for testing
export const TestingRuntime = ManagedRuntime.make(TestingLayers as Layer.Layer<MetricsService | NodeContext.NodeContext | OtelService  | ConfigService | AuthService | RunService | LLMService, ConfigError | AuthError, never>);


// Compose all layers for production
// Using Layer.provide to ensure platform services are available to application services
const TestLayers = Layer.provide(
  Layer.mergeAll(
    TestAppServiceLayer,
    Layer.setConfigProvider(TestConfigProvider)
  ),
  TestPlatformLayer
);

// Create the managed runtime for production
export const TestRuntime = ManagedRuntime.make(TestLayers as Layer.Layer<MetricsService | NodeContext.NodeContext | OtelService | ConfigService | AuthService | RunService | LLMService, ConfigError | AuthError, never>);

// Helper function to run effects in production runtime
export const runTestEffect = <A, E>(effect: Effect.Effect<A, E>) => {
  return TestRuntime.runPromise(effect);
};
// Helper function to run effects and get exit in production
export const runTestExit = <A, E>(effect: Effect.Effect<A, E>) => {
  return TestRuntime.runSyncExit(effect);
};
