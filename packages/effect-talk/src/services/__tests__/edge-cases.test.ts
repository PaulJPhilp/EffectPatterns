import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { SessionStore } from "../SessionStore";
import { BlockService } from "../BlockService";
import { ProcessService } from "../ProcessService";
import { PersistenceService } from "../PersistenceService";
import { LoggerService } from "../LoggerService";

/**
 * Edge case and stress testing for EffectTalk
 * Tests boundary conditions, race conditions, and unusual scenarios
 */

describe("Edge Cases & Stress Testing", () => {
  const runEdgeCaseTest = async <A>(
    effect: Effect.Effect<
      A,
      never,
      | SessionStore
      | BlockService
      | ProcessService
      | PersistenceService
      | LoggerService
    >
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(LoggerService.Default),
        Effect.provide(ProcessService.Default),
        Effect.provide(BlockService.Default),
        Effect.provide(SessionStore.Default),
        Effect.provide(PersistenceService.Default)
      )
    );
  };

  describe("Boundary Conditions", () => {
    it("should handle empty session gracefully", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          const session = yield* store.getSession();

          expect(session.blocks).toHaveLength(0);
          expect(session.activeBlockId).toBeNull();

          return { empty: true };
        })
      );

      expect(result.empty).toBe(true);
    });

    it("should handle single block session", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          const block = yield* blockService.createBlock("single");
          yield* store.addBlock(block);

          const session = yield* store.getSession();

          expect(session.blocks).toHaveLength(1);
          expect(session.blocks[0].command).toBe("single");

          return { singleBlock: true };
        })
      );

      expect(result.singleBlock).toBe(true);
    });

    it("should handle very large session (1000+ blocks)", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          for (let i = 0; i < 1000; i++) {
            const block = yield* blockService.createBlock(`cmd${i}`);
            yield* store.addBlock(block);
          }

          const session = yield* store.getSession();

          expect(session.blocks).toHaveLength(1000);

          return { largeSession: true };
        })
      );

      expect(result.largeSession).toBe(true);
    });

    it("should handle zero-length output", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          yield* blockService.updateBlockOutput("block-1", "", "");

          return { zero: true };
        })
      );

      expect(result.zero).toBe(true);
    });

    it("should handle maxint-like timestamps", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const block = yield* blockService.createBlock("test");

          expect(block.startTime).toBeGreaterThan(0);
          expect(block.startTime).toBeLessThan(Date.now() + 1000); // Reasonable recent time

          return { timestamp: true };
        })
      );

      expect(result.timestamp).toBe(true);
    });
  });

  describe("Race Conditions", () => {
    it("should handle concurrent block creation safely", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          // Create blocks concurrently
          const blocks = yield* Effect.all(
            Array.from({ length: 50 }, (_, i) =>
              blockService.createBlock(`concurrent${i}`)
            )
          );

          const ids = blocks.map((b) => b.id);
          const uniqueIds = new Set(ids);

          expect(uniqueIds.size).toBe(50); // All unique

          return { concurrent: true };
        })
      );

      expect(result.concurrent).toBe(true);
    });

    it("should handle concurrent session updates safely", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          // Update session concurrently
          yield* Effect.all(
            Array.from({ length: 20 }, (_, i) =>
              store.updateSession((s) => ({
                ...s,
                workingDirectory: `/path${i}`,
              }))
            )
          );

          const session = yield* store.getSession();

          // Should have latest update
          expect(session.workingDirectory).toMatch(/^\/path\d+$/);

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });

    it("should handle rapid add/remove cycles", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          // Cycle: add blocks, clear, add again
          for (let cycle = 0; cycle < 3; cycle++) {
            for (let i = 0; i < 10; i++) {
              const block = yield* blockService.createBlock(`cycle${cycle}-${i}`);
              yield* store.addBlock(block);
            }

            const session = yield* store.getSession();
            expect(session.blocks.length).toBeGreaterThan(0);

            yield* store.clearBlocks();

            const empty = yield* store.getSession();
            expect(empty.blocks).toHaveLength(0);
          }

          return { rapid: true };
        })
      );

      expect(result.rapid).toBe(true);
    });
  });

  describe("State Consistency", () => {
    it("should maintain session ID consistency", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          const session1 = yield* store.getSession();
          const id1 = session1.id;

          // Add block
          const block = yield* blockService.createBlock("test");
          yield* store.addBlock(block);

          const session2 = yield* store.getSession();
          const id2 = session2.id;

          // Add another block
          yield* store.addBlock(yield* blockService.createBlock("test2"));

          const session3 = yield* store.getSession();
          const id3 = session3.id;

          expect(id1).toBe(id2);
          expect(id2).toBe(id3);

          return { consistent: true };
        })
      );

      expect(result.consistent).toBe(true);
    });

    it("should maintain block integrity through updates", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          const block = yield* blockService.createBlock("original");
          yield* store.addBlock(block);

          const original = yield* store.getBlock(block.id);
          expect(original?.command).toBe("original");

          // Update block in session
          yield* store.updateSession((s) => ({
            ...s,
            blocks: s.blocks.map((b) =>
              b.id === block.id ? { ...b, stdout: "updated" } : b
            ),
          }));

          const updated = yield* store.getBlock(block.id);
          expect(updated?.stdout).toBe("updated");
          expect(updated?.command).toBe("original"); // Command unchanged

          return { integrity: true };
        })
      );

      expect(result.integrity).toBe(true);
    });
  });

  describe("Stress Testing", () => {
    it("should handle rapid status changes", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const statuses = ["idle", "running", "success", "failure", "interrupted"];

          for (let i = 0; i < 100; i++) {
            const status = statuses[i % statuses.length];
            yield* blockService.updateBlockStatus("block-1", status as any);
          }

          return { stressed: true };
        })
      );

      expect(result.stressed).toBe(true);
    });

    it("should handle extreme output volume", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          // Capture 10,000 lines of output
          for (let i = 0; i < 10000; i++) {
            yield* blockService.updateBlockOutput(
              "block-1",
              `Line ${i}: Some output data\n`,
              ""
            );
          }

          return { extreme: true };
        })
      );

      expect(result.extreme).toBe(true);
    });

    it("should handle many blocks with many operations", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          // Create 100 blocks with multiple operations each
          for (let i = 0; i < 100; i++) {
            const block = yield* blockService.createBlock(`stress${i}`);
            yield* store.addBlock(block);
            yield* store.setActiveBlock(block.id);

            yield* blockService.updateBlockStatus(block.id, "running");

            for (let j = 0; j < 10; j++) {
              yield* blockService.updateBlockOutput(
                block.id,
                `output ${j}\n`,
                ""
              );
            }

            yield* blockService.updateBlockStatus(block.id, "success", 0);
          }

          const session = yield* store.getSession();

          expect(session.blocks).toHaveLength(100);

          return { stress: true };
        })
      );

      expect(result.stress).toBe(true);
    });
  });

  describe("Error Recovery", () => {
    it("should recover from invalid block ID", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          // Try to get non-existent block
          const block = yield* store.getBlock("non-existent");

          expect(block).toBeNull();

          return { recovered: true };
        })
      );

      expect(result.recovered).toBe(true);
    });

    it("should handle operations on empty session", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          // Clear blocks on empty session
          yield* store.clearBlocks();

          // Get active block on empty session
          const active = yield* store.getActiveBlock();

          expect(active).toBeNull();

          return { empty: true };
        })
      );

      expect(result.empty).toBe(true);
    });

    it("should handle setting inactive active block", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          // Set active block that doesn't exist
          yield* store.setActiveBlock("non-existent");

          const session = yield* store.getSession();

          // Should be set even if block doesn't exist (UI responsibility to validate)
          expect(session.activeBlockId).toBe("non-existent");

          return { set: true };
        })
      );

      expect(result.set).toBe(true);
    });
  });

  describe("Data Integrity", () => {
    it("should preserve data through complex operations", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          // Create diverse data
          const commands = [
            "echo test",
            "cd /home",
            "ls -la",
            "ps aux",
            "grep pattern file",
          ];

          for (const cmd of commands) {
            const block = yield* blockService.createBlock(cmd);
            yield* store.addBlock(block);

            yield* blockService.updateBlockStatus(block.id, "running");
            yield* blockService.updateBlockOutput(block.id, "test output\n", "");
            yield* blockService.updateBlockStatus(block.id, "success", 0);
          }

          const session = yield* store.getSession();

          // Verify all data intact
          expect(session.blocks).toHaveLength(commands.length);

          for (let i = 0; i < commands.length; i++) {
            expect(session.blocks[i].command).toBe(commands[i]);
            expect(session.blocks[i].status).toBe("success");
            expect(session.blocks[i].stdout).toBe("test output\n");
          }

          return { integral: true };
        })
      );

      expect(result.integral).toBe(true);
    });

    it("should maintain block ordering", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          const order = [];

          for (let i = 0; i < 20; i++) {
            const block = yield* blockService.createBlock(`cmd${i}`);
            yield* store.addBlock(block);
            order.push(`cmd${i}`);
          }

          const session = yield* store.getSession();
          const retrieved = session.blocks.map((b) => b.command);

          expect(retrieved).toEqual(order);

          return { ordered: true };
        })
      );

      expect(result.ordered).toBe(true);
    });
  });

  describe("Timeout & Deadlock Prevention", () => {
    it("should not deadlock on nested updates", async () => {
      const result = await runEdgeCaseTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          // Nested updates
          yield* store.updateSession((s1) => ({
            ...s1,
            workingDirectory: "/path1",
          }));

          yield* store.updateSession((s2) => ({
            ...s2,
            workingDirectory: "/path2",
          }));

          const session = yield* store.getSession();

          expect(session.workingDirectory).toBe("/path2");

          return { noDeadlock: true };
        })
      );

      expect(result.noDeadlock).toBe(true);
    });

    it("should complete operations within reasonable time", async () => {
      const timeout = 5000; // 5 seconds
      const startTime = Date.now();

      const result = await Promise.race([
        runEdgeCaseTest(
          Effect.gen(function* () {
            const store = yield* SessionStore;
            const blockService = yield* BlockService;

            for (let i = 0; i < 500; i++) {
              const block = yield* blockService.createBlock(`cmd${i}`);
              yield* store.addBlock(block);
            }

            return { completed: true };
          })
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeout)
        ),
      ]);

      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(timeout);
      expect(result).toEqual({ completed: true });
    });
  });
});
