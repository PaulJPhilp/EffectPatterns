import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { SessionStore } from "../SessionStore";
import { CommandExecutor } from "../CommandExecutor";
import { ProcessService } from "../ProcessService";
import { BlockService } from "../BlockService";
import { PersistenceService } from "../PersistenceService";
import { LoggerService } from "../LoggerService";
import { StructuredLoggingService } from "../StructuredLoggingService";
import { createMockBlock } from "../../__tests__/fixtures";

/**
 * Performance profiling tests for EffectTalk
 * Measures latency, throughput, and resource usage
 * Not meant to fail, but to profile and establish baselines
 */

describe("Performance Profiling", () => {
  const runPerformanceTest = async <A>(
    effect: Effect.Effect<
      A,
      never,
      | SessionStore
      | CommandExecutor
      | ProcessService
      | BlockService
      | PersistenceService
      | LoggerService
      | StructuredLoggingService
    >
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(LoggerService.Default),
        Effect.provide(ProcessService.Default),
        Effect.provide(BlockService.Default),
        Effect.provide(SessionStore.Default),
        Effect.provide(CommandExecutor.Default),
        Effect.provide(PersistenceService.Default),
        Effect.provide(StructuredLoggingService)
      )
    );
  };

  describe("Session Operations", () => {
    it("should measure session creation time", async () => {
      const result = await runPerformanceTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          const startTime = Date.now();

          // Create 100 sessions
          for (let i = 0; i < 100; i++) {
            yield* store.getSession();
          }

          const duration = Date.now() - startTime;

          return {
            operationCount: 100,
            totalDuration: duration,
            averageLatency: duration / 100,
          };
        })
      );

      console.log("Session creation benchmark:");
      console.log(`  Total: ${result.totalDuration}ms for 100 operations`);
      console.log(`  Average: ${result.averageLatency.toFixed(2)}ms per operation`);

      expect(result.averageLatency).toBeLessThan(10);
    });

    it("should measure block addition throughput", async () => {
      const result = await runPerformanceTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          const startTime = Date.now();
          const blockCount = 100;

          // Add many blocks
          for (let i = 0; i < blockCount; i++) {
            const block = yield* blockService.createBlock(`cmd${i}`);
            yield* store.addBlock(block);
          }

          const duration = Date.now() - startTime;
          const session = yield* store.getSession();

          return {
            blockCount: session.blocks.length,
            totalDuration: duration,
            throughput: Math.round((blockCount / duration) * 1000),
          };
        })
      );

      console.log("\nBlock addition throughput:");
      console.log(`  Total: ${result.totalDuration}ms for ${result.blockCount} blocks`);
      console.log(`  Throughput: ${result.throughput} blocks/second`);

      expect(result.blockCount).toBe(100);
      expect(result.throughput).toBeGreaterThan(100); // At least 100 blocks/sec
    });

    it("should measure session update latency", async () => {
      const result = await runPerformanceTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          const block = yield* blockService.createBlock("test");
          yield* store.addBlock(block);

          const startTime = Date.now();
          const updateCount = 50;

          // Perform many updates
          for (let i = 0; i < updateCount; i++) {
            yield* store.updateSession((s) => ({
              ...s,
              workingDirectory: `/path/${i}`,
            }));
          }

          const duration = Date.now() - startTime;

          return {
            updateCount,
            totalDuration: duration,
            averageLatency: duration / updateCount,
          };
        })
      );

      console.log("\nSession update latency:");
      console.log(`  Total: ${result.totalDuration}ms for ${result.updateCount} updates`);
      console.log(`  Average: ${result.averageLatency.toFixed(2)}ms per update`);

      expect(result.averageLatency).toBeLessThan(5);
    });
  });

  describe("Block Operations", () => {
    it("should measure block creation performance", async () => {
      const result = await runPerformanceTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const startTime = Date.now();
          const blockCount = 200;

          // Create many blocks
          for (let i = 0; i < blockCount; i++) {
            yield* blockService.createBlock(`cmd${i}`);
          }

          const duration = Date.now() - startTime;

          return {
            blockCount,
            totalDuration: duration,
            throughput: Math.round((blockCount / duration) * 1000),
          };
        })
      );

      console.log("\nBlock creation performance:");
      console.log(`  Total: ${result.totalDuration}ms for ${result.blockCount} blocks`);
      console.log(`  Throughput: ${result.throughput} blocks/second`);

      expect(result.throughput).toBeGreaterThan(500); // At least 500 blocks/sec
    });

    it("should measure block status update performance", async () => {
      const result = await runPerformanceTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const block = yield* blockService.createBlock("test");
          const statusSequence = ["running", "success", "failure", "interrupted"];
          const iterations = 50;

          const startTime = Date.now();

          // Perform many status updates
          for (let i = 0; i < iterations; i++) {
            const status = statusSequence[i % statusSequence.length];
            yield* blockService.updateBlockStatus(block.id, status as any);
          }

          const duration = Date.now() - startTime;

          return {
            updateCount: iterations,
            totalDuration: duration,
            averageLatency: duration / iterations,
          };
        })
      );

      console.log("\nBlock status update performance:");
      console.log(`  Total: ${result.totalDuration}ms for ${result.updateCount} updates`);
      console.log(`  Average: ${result.averageLatency.toFixed(2)}ms per update`);

      expect(result.averageLatency).toBeLessThan(2);
    });

    it("should measure output capture performance", async () => {
      const result = await runPerformanceTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const startTime = Date.now();
          const lineCount = 1000;

          // Simulate rapid output capture
          for (let i = 0; i < lineCount; i++) {
            yield* blockService.updateBlockOutput(
              "block-1",
              `Line ${i}: Some output text\n`,
              ""
            );
          }

          const duration = Date.now() - startTime;

          return {
            lineCount,
            totalDuration: duration,
            throughput: Math.round((lineCount / duration) * 1000),
          };
        })
      );

      console.log("\nOutput capture performance:");
      console.log(`  Total: ${result.totalDuration}ms for ${result.lineCount} lines`);
      console.log(`  Throughput: ${result.throughput} lines/second`);

      expect(result.throughput).toBeGreaterThan(1000); // At least 1000 lines/sec
    });
  });

  describe("Memory & Resource Usage", () => {
    it("should profile memory usage with many blocks", async () => {
      const memStart = process.memoryUsage().heapUsed;

      await runPerformanceTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          // Create many blocks
          for (let i = 0; i < 500; i++) {
            const block = yield* blockService.createBlock(`cmd${i}`);
            yield* store.addBlock(block);
          }

          const session = yield* store.getSession();
          expect(session.blocks).toHaveLength(500);
        })
      );

      const memEnd = process.memoryUsage().heapUsed;
      const memUsed = (memEnd - memStart) / 1024 / 1024; // MB

      console.log("\nMemory usage profile:");
      console.log(`  Heap delta: ${memUsed.toFixed(2)}MB for 500 blocks`);
      console.log(`  Per block: ${(memUsed / 500 * 1000).toFixed(2)}KB`);

      // Should not use more than 50MB for 500 blocks
      expect(memUsed).toBeLessThan(50);
    });
  });

  describe("Complex Workflows", () => {
    it("should profile end-to-end command execution workflow", async () => {
      const result = await runPerformanceTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          const startTime = Date.now();
          const commandCount = 50;

          // Simulate 50 command executions
          for (let i = 0; i < commandCount; i++) {
            const block = yield* blockService.createBlock(`cmd${i}`);
            yield* store.addBlock(block);
            yield* store.setActiveBlock(block.id);

            yield* blockService.updateBlockStatus(block.id, "running");

            // Simulate some output
            for (let j = 0; j < 10; j++) {
              yield* blockService.updateBlockOutput(
                block.id,
                `output line ${j}\n`,
                ""
              );
            }

            yield* blockService.updateBlockStatus(block.id, "success", 0);
          }

          const duration = Date.now() - startTime;
          const session = yield* store.getSession();

          return {
            commandCount,
            totalDuration: duration,
            throughput: Math.round((commandCount / duration) * 1000),
            blockCount: session.blocks.length,
          };
        })
      );

      console.log("\nEnd-to-end command workflow:");
      console.log(`  Total: ${result.totalDuration}ms for ${result.commandCount} commands`);
      console.log(`  Throughput: ${result.throughput} commands/second`);
      console.log(`  Final blocks: ${result.blockCount}`);

      expect(result.blockCount).toBe(50);
    });

    it("should profile rapid block lifecycle transitions", async () => {
      const result = await runPerformanceTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const startTime = Date.now();
          const iterations = 100;

          // Rapidly create and update blocks
          for (let i = 0; i < iterations; i++) {
            const block = yield* blockService.createBlock(`rapid${i}`);

            yield* blockService.updateBlockStatus(block.id, "running");
            yield* blockService.updateBlockOutput(block.id, "output\n", "");
            yield* blockService.updateBlockStatus(block.id, "success", 0);
          }

          const duration = Date.now() - startTime;

          return {
            iterationCount: iterations,
            totalDuration: duration,
            averageLatency: duration / iterations,
          };
        })
      );

      console.log("\nRapid block lifecycle transitions:");
      console.log(`  Total: ${result.totalDuration}ms for ${result.iterationCount} cycles`);
      console.log(
        `  Average: ${result.averageLatency.toFixed(2)}ms per cycle`
      );

      expect(result.averageLatency).toBeLessThan(10);
    });
  });

  describe("Concurrent Operations", () => {
    it("should profile concurrent block operations", async () => {
      const result = await runPerformanceTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          const startTime = Date.now();
          const concurrentCount = 20;

          // Create blocks concurrently
          const blocks = yield* Effect.all(
            Array.from({ length: concurrentCount }, (_, i) =>
              blockService.createBlock(`concurrent${i}`)
            )
          );

          // Add all concurrently
          yield* Effect.all(
            blocks.map((block) => store.addBlock(block))
          );

          const duration = Date.now() - startTime;
          const session = yield* store.getSession();

          return {
            blockCount: concurrentCount,
            totalDuration: duration,
            throughput: Math.round((concurrentCount / duration) * 1000),
            sessionBlockCount: session.blocks.length,
          };
        })
      );

      console.log("\nConcurrent operations:");
      console.log(`  Total: ${result.totalDuration}ms for ${result.blockCount} concurrent ops`);
      console.log(`  Throughput: ${result.throughput} ops/second`);

      expect(result.sessionBlockCount).toBe(result.blockCount);
    });
  });

  describe("Baseline Metrics", () => {
    it("should establish performance baselines", async () => {
      const baselines = {
        sessionCreation: 0,
        blockCreation: 0,
        blockStatusUpdate: 0,
        outputCapture: 0,
        endToEndWorkflow: 0,
      };

      // Session creation baseline
      const sessionResult = await runPerformanceTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const start = Date.now();
          yield* store.getSession();
          return Date.now() - start;
        })
      );
      baselines.sessionCreation = sessionResult;

      // Block creation baseline
      const blockResult = await runPerformanceTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;
          const start = Date.now();
          yield* blockService.createBlock("test");
          return Date.now() - start;
        })
      );
      baselines.blockCreation = blockResult;

      console.log("\nPerformance Baselines:");
      console.log(`  Session creation: ${baselines.sessionCreation}ms`);
      console.log(`  Block creation: ${baselines.blockCreation}ms`);

      expect(baselines.sessionCreation).toBeLessThan(5);
      expect(baselines.blockCreation).toBeLessThan(5);
    });
  });
});
