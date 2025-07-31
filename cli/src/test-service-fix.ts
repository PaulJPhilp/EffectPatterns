import { Effect, Layer, ManagedRuntime } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import { NodeContext, NodeFileSystem, NodePath } from "@effect/platform-node";
import { MetricsService } from "./services/metrics-service/service.js";
import { AuthService } from "./services/auth-service/service.js";

// Test the service fixes with proper platform services
async function testServiceFixes() {
  console.log("Testing service fixes with lazy service access...");

  // Create platform layer with all necessary services
  const platformLayer = Layer.mergeAll(
    NodeContext.layer,
    NodeFileSystem.layer,
    NodePath.layer
  );

  // Test MetricsService
  console.log("\n=== Testing MetricsService ===");
  try {
    const metricsLayer = Layer.provide(MetricsService.Default, platformLayer);
    const runtime = ManagedRuntime.make(metricsLayer);

    const testEffect = Effect.gen(function* () {
      const metrics = yield* MetricsService;
      yield* metrics.clearMetrics(); // Reset first
      yield* metrics.startCommand("test-command");
      yield* metrics.endCommand();
      const history = yield* metrics.getMetricsHistory();
      return history;
    });

    const result = await runtime.runPromise(testEffect);
    console.log("✅ MetricsService: SUCCESS");
    console.log(`Commands recorded: ${result.runs.length}`);
    return true;
  } catch (error) {
    console.log(`❌ MetricsService: FAILED - ${error}`);
    return false;
  }

  // Test AuthService
  console.log("\n=== Testing AuthService ===");
  try {
    const authLayer = Layer.provide(AuthService.Default, platformLayer);
    const runtime = ManagedRuntime.make(authLayer);

    const testEffect = Effect.gen(function* () {
      const auth = yield* AuthService;
      const isAuthenticated = yield* auth.isAuthenticated();
      return isAuthenticated;
    });

    const result = await runtime.runPromise(testEffect);
    console.log("✅ AuthService: SUCCESS");
    console.log(`Authenticated: ${result}`);
    return true;
  } catch (error) {
    console.log(`❌ AuthService: FAILED - ${error}`);
    return false;
  }
}

// Run the tests
testServiceFixes()
  .then((success) => {
    console.log("\nService fix verification complete");
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
