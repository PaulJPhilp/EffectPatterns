import { Effect, Layer, ManagedRuntime } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import { NodeContext, NodeHttpClient, NodeFileSystem, NodePath } from "@effect/platform-node";
import { ConfigProvider } from "effect";

// Create a test service that accesses FileSystem in the effect block (construction time)
class EagerService extends Effect.Service<EagerService>()(
  "EagerService",
  {
    effect: Effect.gen(function* () {
      console.log("🔥 EagerService: About to access FileSystem during construction");
      const fs = yield* FileSystem.FileSystem;
      console.log("✅ EagerService: Successfully accessed FileSystem during construction");
      
      return {
        test: () => Effect.sync(() => console.log("EagerService test method called"))
      };
    })
  }
) {}

// Create a test service that does NOT access FileSystem during construction
class LazyService extends Effect.Service<LazyService>()(
  "LazyService",
  {
    sync: () => {
      console.log("✅ LazyService: Constructor called (no FileSystem access)");
      
      return {
        test: () => Effect.gen(function* () {
          console.log("🔥 LazyService: About to access FileSystem in method");
          const fs = yield* FileSystem.FileSystem;
          console.log("✅ LazyService: Successfully accessed FileSystem in method");
        })
      };
    }
  }
) {}

// Platform layer
const PlatformLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layer,
  NodeFileSystem.layer,
  NodePath.layer
);

async function testEagerConstruction() {
  console.log("\n=== Testing Eager Construction (should fail) ===");
  
  try {
    console.log("Creating runtime with EagerService...");
    const eagerLayer = Layer.provide(EagerService.Default, PlatformLayer);
    const eagerRuntime = ManagedRuntime.make(eagerLayer);
    
    console.log("Runtime created successfully - this should not happen!");
    
    const testEffect = Effect.gen(function* () {
      const service = yield* EagerService;
      yield* service.test();
    });
    
    await eagerRuntime.runPromise(testEffect);
    console.log("✅ EagerService test completed");
  } catch (error) {
    console.log(`❌ EagerService failed as expected: ${error}`);
  }
}

async function testLazyConstruction() {
  console.log("\n=== Testing Lazy Construction (should work) ===");
  
  try {
    console.log("Creating runtime with LazyService...");
    const lazyLayer = Layer.provide(LazyService.Default, PlatformLayer);
    const lazyRuntime = ManagedRuntime.make(lazyLayer);
    
    console.log("✅ Runtime created successfully");
    
    const testEffect = Effect.gen(function* () {
      const service = yield* LazyService;
      yield* service.test();
    });
    
    await lazyRuntime.runPromise(testEffect);
    console.log("✅ LazyService test completed");
  } catch (error) {
    console.log(`❌ LazyService failed: ${error}`);
  }
}

async function runTests() {
  await testEagerConstruction();
  await testLazyConstruction();
}

runTests().then(() => {
  console.log("\n=== Test Results ===");
  console.log("If EagerService failed and LazyService worked, this proves the issue is eager construction.");
  process.exit(0);
}).catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
