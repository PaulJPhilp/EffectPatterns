import { Effect, Layer, ManagedRuntime } from "effect";
import { NodeContext, NodeFileSystem, NodePath } from "@effect/platform-node";
import { AuthService } from "./services/auth-service/service.js";
import { MetricsService } from "./services/metrics-service/service.js";

// Test service construction with proper platform layer provision
async function testServiceConstruction() {
  console.log("Testing service construction with platform layers...");

  // Create platform layer with all necessary services
  const platformLayer = Layer.mergeAll(
    NodeContext.layer,
    NodeFileSystem.layer,
    NodePath.layer
  );

  // Test individual service construction
  console.log("\n=== Testing AuthService construction ===");
  try {
    const authLayer = Layer.merge(platformLayer, AuthService.Default);
    const runtime = ManagedRuntime.make(authLayer);
    
    // Test that we can access the service
    const testEffect = Effect.gen(function* () {
      const auth = yield* AuthService;
      console.log("✅ AuthService constructed successfully");
      return auth;
    });

    const authService = await runtime.runPromise(testEffect);
    console.log("✅ AuthService: SUCCESS");
    
    // Test a simple method call
    const isAuth = await runtime.runPromise(authService.isProviderConfigured("openai"));
    console.log(`✅ AuthService.isProviderConfigured: ${isAuth}`);
    
    return true;
  } catch (error) {
    console.log(`❌ AuthService: FAILED - ${error}`);
    return false;
  }

  console.log("\n=== Testing MetricsService construction ===");
  try {
    const metricsLayer = Layer.merge(platformLayer, MetricsService.Default);
    const runtime = ManagedRuntime.make(metricsLayer);
    
    const testEffect = Effect.gen(function* () {
      const metrics = yield* MetricsService;
      console.log("✅ MetricsService constructed successfully");
      return metrics;
    });

    const metricsService = await runtime.runPromise(testEffect);
    console.log("✅ MetricsService: SUCCESS");
    
    // Test a simple method call
    const history = await runtime.runPromise(metricsService.getMetricsHistory());
    console.log(`✅ MetricsService.getMetricsHistory: ${history.runs.length} runs`);
    
    return true;
  } catch (error) {
    console.log(`❌ MetricsService: FAILED - ${error}`);
    return false;
  }
}

// Run the tests
testServiceConstruction()
  .then((success) => {
    console.log("\nService construction verification complete");
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
