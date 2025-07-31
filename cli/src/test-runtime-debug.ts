import { Effect, Layer, ManagedRuntime } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import { NodeContext, NodeHttpClient, NodeFileSystem } from "@effect/platform-node";
import { ConfigProvider } from "effect";
import { ConfigService } from "./services/config-service/service.js";
import { AuthService } from "./services/auth-service/service.js";
import { MetricsService } from "./services/metrics-service/service.js";
import { OtelService } from "./services/otel-service/service.js";
import { RunService } from "./services/run-service/service.js";
import { LLMService } from "./services/llm-service/service.js";

// Platform layer that works
const PlatformLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layer,
  NodeFileSystem.layer
);

const ProductionConfigProvider = ConfigProvider.fromEnv();

// Test each service individually
async function testService(serviceName: string, serviceLayer: Layer.Layer<any, any, any>) {
  console.log(`\n=== Testing ${serviceName} ===`);
  
  try {
    const testLayer = Layer.provide(
      Layer.mergeAll(
        serviceLayer,
        Layer.setConfigProvider(ProductionConfigProvider)
      ),
      PlatformLayer
    );
    
    const runtime = ManagedRuntime.make(testLayer);
    
    const testEffect = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const exists = yield* fs.exists("../test-prompt.txt");
      console.log(`${serviceName}: FileSystem service accessible, file exists: ${exists}`);
      return exists;
    });
    
    const result = await runtime.runPromise(testEffect);
    console.log(`✅ ${serviceName}: SUCCESS`);
    return true;
  } catch (error) {
    console.log(`❌ ${serviceName}: FAILED - ${error}`);
    return false;
  }
}

// Test services one by one
async function debugServices() {
  console.log("Testing individual services...");
  
  await testService("ConfigService", ConfigService.Default);
  await testService("AuthService", AuthService.Default);
  await testService("MetricsService", MetricsService.Default);
  await testService("OtelService", OtelService.Default);
  await testService("RunService", RunService.Default);
  await testService("LLMService", LLMService.Default);
  
  console.log("\n=== Testing combined services ===");
  
  // Test combinations
  const combinations = [
    ["ConfigService + AuthService", Layer.mergeAll(ConfigService.Default, AuthService.Default)],
    ["ConfigService + MetricsService", Layer.mergeAll(ConfigService.Default, MetricsService.Default)],
    ["All services", Layer.mergeAll(
      ConfigService.Default,
      AuthService.Default,
      MetricsService.Default,
      OtelService.Default,
      RunService.Default,
      LLMService.Default
    )]
  ];
  
  for (const [name, layer] of combinations) {
    await testService(name, layer);
  }
}

debugServices().then(() => {
  console.log("\nDebugging complete");
  process.exit(0);
}).catch((error) => {
  console.error("Debugging failed:", error);
  process.exit(1);
});
