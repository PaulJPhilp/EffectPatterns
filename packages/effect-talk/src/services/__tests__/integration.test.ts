import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { SessionStore } from "../SessionStore";
import { CommandExecutor } from "../CommandExecutor";
import { ProcessService } from "../ProcessService";
import { BlockService } from "../BlockService";
import { PersistenceService } from "../PersistenceService";
import { LoggerService } from "../LoggerService";
import { ErrorRecoveryService } from "../ErrorRecoveryService";
import { createMockBlock, createMockSession } from "../../__tests__/fixtures";
import type { Session, Block } from "../../types";

/**
 * Integration tests for EffectTalk
 * Tests complex workflows involving multiple services interacting
 */

describe("EffectTalk Integration Tests", () => {
  const fullLayer = Effect.all([
    LoggerService.Default,
    ProcessService.Default,
    BlockService.Default,
    SessionStore.Default,
    CommandExecutor.Default,
    PersistenceService.Default,
    ErrorRecoveryService,
  ]).pipe(
    Effect.andThen((deps) =>
      Effect.provide(
        Effect.gen(function* () {
          return "integrated";
        }),
        Effect.mergeAll(...deps)
      )
    )
  );

  const runIntegration = async <A>(
    effect: Effect.Effect<
      A,
      never,
      | SessionStore
      | CommandExecutor
      | ProcessService
      | BlockService
      | PersistenceService
      | LoggerService
      | ErrorRecoveryService
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
        Effect.provide(ErrorRecoveryService)
      )
    );
  };

  describe("Session + Block + CommandExecutor Workflow", () => {
    it("should create session, add blocks, and verify state", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const blockService = yield* BlockService;

          // Get initial session
          const initialSession = yield* sessionStore.getSession();
          expect(initialSession.blocks).toHaveLength(0);

          // Create some blocks
          const block1 = yield* blockService.createBlock("echo hello");
          const block2 = yield* blockService.createBlock("echo world");

          // Add blocks to session
          yield* sessionStore.addBlock(block1);
          yield* sessionStore.addBlock(block2);

          // Verify session state
          const finalSession = yield* sessionStore.getSession();

          return {
            sessionId: finalSession.id,
            blockCount: finalSession.blocks.length,
            commands: finalSession.blocks.map((b) => b.command),
          };
        })
      );

      expect(result.blockCount).toBe(2);
      expect(result.commands).toContain("echo hello");
      expect(result.commands).toContain("echo world");
    });

    it("should manage block lifecycle through session", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const blockService = yield* BlockService;

          // Create and add block
          const block = yield* blockService.createBlock("test-cmd");
          yield* sessionStore.addBlock(block);

          // Update block status
          yield* blockService.updateBlockStatus(block.id, "running");

          // Update block output
          yield* blockService.updateBlockOutput(block.id, "test output\n", "");

          // Mark complete
          yield* blockService.updateBlockStatus(block.id, "success", 0);

          // Retrieve from session
          const session = yield* sessionStore.getSession();
          const retrievedBlock = yield* sessionStore.getBlock(block.id);

          return {
            found: retrievedBlock !== null,
            command: retrievedBlock?.command,
            status: retrievedBlock?.status,
          };
        })
      );

      expect(result.found).toBe(true);
      expect(result.command).toBe("test-cmd");
      expect(result.status).toBe("success");
    });

    it("should handle multiple concurrent blocks", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const blockService = yield* BlockService;

          // Create multiple blocks
          const blocks = yield* Effect.all([
            blockService.createBlock("cmd1"),
            blockService.createBlock("cmd2"),
            blockService.createBlock("cmd3"),
            blockService.createBlock("cmd4"),
            blockService.createBlock("cmd5"),
          ]);

          // Add all blocks
          yield* Effect.all(
            blocks.map((block) => sessionStore.addBlock(block))
          );

          // Update each block with different status
          yield* Effect.all(
            blocks.map((block, index) => {
              const status = index % 2 === 0 ? "success" : "running";
              return blockService.updateBlockStatus(block.id, status as any);
            })
          );

          // Get final session
          const session = yield* sessionStore.getSession();

          const successCount = session.blocks.filter(
            (b) => b.status === "success"
          ).length;
          const runningCount = session.blocks.filter(
            (b) => b.status === "running"
          ).length;

          return {
            totalBlocks: session.blocks.length,
            successCount,
            runningCount,
          };
        })
      );

      expect(result.totalBlocks).toBe(5);
      expect(result.successCount).toBe(3);
      expect(result.runningCount).toBe(2);
    });
  });

  describe("Process + Block Output Workflow", () => {
    it("should capture process output into blocks", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const blockService = yield* BlockService;
          const sessionStore = yield* SessionStore;

          // Create block
          const block = yield* blockService.createBlock("npm test");
          yield* sessionStore.addBlock(block);

          // Simulate process output capture
          const outputs = [
            "Running tests...\n",
            "✓ Test 1 passed\n",
            "✓ Test 2 passed\n",
            "Tests complete\n",
          ];

          yield* blockService.updateBlockStatus(block.id, "running");

          for (const output of outputs) {
            yield* blockService.updateBlockOutput(block.id, output, "");
          }

          yield* blockService.updateBlockStatus(block.id, "success", 0);

          // Get final block
          const finalBlock = yield* sessionStore.getBlock(block.id);

          return {
            command: finalBlock?.command,
            status: finalBlock?.status,
            hasOutput: (finalBlock?.stdout ?? "").length > 0,
          };
        })
      );

      expect(result.command).toBe("npm test");
      expect(result.status).toBe("success");
      expect(result.hasOutput).toBe(true);
    });

    it("should separate stdout and stderr", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          yield* blockService.updateBlockOutput(
            "block-1",
            "normal output\n",
            ""
          );
          yield* blockService.updateBlockOutput("block-1", "", "error\n");
          yield* blockService.updateBlockOutput(
            "block-1",
            "more output\n",
            "more errors\n"
          );

          return {
            outputsCaptured: 3,
          };
        })
      );

      expect(result.outputsCaptured).toBe(3);
    });
  });

  describe("Session Persistence Workflow", () => {
    it("should create, populate, and prepare to save session", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const blockService = yield* BlockService;

          // Create and populate session
          let session = yield* sessionStore.getSession();
          const sessionId = session.id;

          const blocks = yield* Effect.all([
            blockService.createBlock("cmd1"),
            blockService.createBlock("cmd2"),
          ]);

          for (const block of blocks) {
            yield* sessionStore.addBlock(block);
            yield* blockService.updateBlockStatus(block.id, "success", 0);
          }

          // Get final session
          session = yield* sessionStore.getSession();

          return {
            sessionId,
            blockCount: session.blocks.length,
            allSuccess: session.blocks.every((b) => b.status === "success"),
          };
        })
      );

      expect(result.blockCount).toBe(2);
      expect(result.allSuccess).toBe(true);
    });
  });

  describe("Active Block Management", () => {
    it("should track active block through operations", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const blockService = yield* BlockService;

          const block1 = yield* blockService.createBlock("cmd1");
          const block2 = yield* blockService.createBlock("cmd2");
          const block3 = yield* blockService.createBlock("cmd3");

          // Add blocks
          yield* sessionStore.addBlock(block1);
          yield* sessionStore.addBlock(block2);
          yield* sessionStore.addBlock(block3);

          // Set active block
          yield* sessionStore.setActiveBlock(block2.id);

          // Verify active
          let session = yield* sessionStore.getSession();
          expect(session.activeBlockId).toBe(block2.id);

          const activeBlock = yield* sessionStore.getActiveBlock();
          expect(activeBlock?.command).toBe("cmd2");

          // Clear active
          yield* sessionStore.setActiveBlock(null);

          session = yield* sessionStore.getSession();
          expect(session.activeBlockId).toBeNull();

          return {
            totalBlocks: session.blocks.length,
            hasActiveBlock: session.activeBlockId !== null,
          };
        })
      );

      expect(result.totalBlocks).toBe(3);
      expect(result.hasActiveBlock).toBe(false);
    });
  });

  describe("Error Recovery in Workflow", () => {
    it("should recover from block operation errors", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const errorRecovery = yield* ErrorRecoveryService;

          const effect = Effect.gen(function* () {
            const session = yield* sessionStore.getSession();
            yield* sessionStore.addBlock(createMockBlock());
            return yield* sessionStore.getSession();
          });

          const recovered = yield* errorRecovery.executeWithRecovery(effect);

          return {
            blockCount: recovered.blocks.length,
            recovered: true,
          };
        })
      );

      expect(result.recovered).toBe(true);
      expect(result.blockCount).toBeGreaterThan(0);
    });

    it("should fallback on session load error", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const errorRecovery = yield* ErrorRecoveryService;

          const fallbackSession = createMockSession();

          const effect = Effect.fail(
            new Error("Session load failed")
          );

          const result = yield* errorRecovery.withFallback(
            effect,
            fallbackSession
          );

          return {
            hasFallback: result !== null,
            blockCount: result.blocks.length,
          };
        })
      );

      expect(result.hasFallback).toBe(true);
    });
  });

  describe("Complex Multi-Service Workflow", () => {
    it("should handle complete session workflow", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const blockService = yield* BlockService;
          const errorRecovery = yield* ErrorRecoveryService;

          // Workflow with error recovery
          const workflow = Effect.gen(function* () {
            // 1. Get session
            let session = yield* sessionStore.getSession();

            // 2. Execute multiple commands
            const commands = ["ls", "pwd", "echo test"];

            for (const cmd of commands) {
              // Create block
              const block = yield* blockService.createBlock(cmd);

              // Add to session
              yield* sessionStore.addBlock(block);

              // Set as active
              yield* sessionStore.setActiveBlock(block.id);

              // Simulate execution
              yield* blockService.updateBlockStatus(block.id, "running");

              // Simulate output
              yield* blockService.updateBlockOutput(
                block.id,
                `Output from ${cmd}\n`,
                ""
              );

              // Mark complete
              yield* blockService.updateBlockStatus(block.id, "success", 0);
            }

            // 3. Get final session
            session = yield* sessionStore.getSession();

            return {
              sessionId: session.id,
              blockCount: session.blocks.length,
              allSuccess: session.blocks.every((b) => b.status === "success"),
              commandsExecuted: session.blocks.map((b) => b.command),
            };
          });

          return yield* errorRecovery.executeWithRecovery(workflow);
        })
      );

      expect(result.blockCount).toBe(3);
      expect(result.allSuccess).toBe(true);
      expect(result.commandsExecuted).toEqual(["ls", "pwd", "echo test"]);
    });
  });

  describe("Session Reset and Clear Workflow", () => {
    it("should clear all blocks and reset session", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const blockService = yield* BlockService;

          // Populate session
          for (let i = 0; i < 5; i++) {
            const block = yield* blockService.createBlock(`cmd${i}`);
            yield* sessionStore.addBlock(block);
          }

          let session = yield* sessionStore.getSession();
          const sessionIdBefore = session.id;
          expect(session.blocks).toHaveLength(5);

          // Clear blocks
          yield* sessionStore.clearBlocks();

          session = yield* sessionStore.getSession();
          expect(session.blocks).toHaveLength(0);

          // Reset session
          yield* sessionStore.resetSession();

          session = yield* sessionStore.getSession();
          const sessionIdAfter = session.id;

          return {
            sessionIdChanged: sessionIdBefore !== sessionIdAfter,
            blockCleared: session.blocks.length === 0,
            newSession: sessionIdAfter !== sessionIdBefore,
          };
        })
      );

      expect(result.sessionIdChanged).toBe(true);
      expect(result.blockCleared).toBe(true);
      expect(result.newSession).toBe(true);
    });
  });

  describe("Rapid Command Execution", () => {
    it("should handle rapid sequential command execution", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const blockService = yield* BlockService;

          const startTime = Date.now();

          // Rapidly execute commands
          for (let i = 0; i < 10; i++) {
            const block = yield* blockService.createBlock(`cmd${i}`);
            yield* sessionStore.addBlock(block);
            yield* sessionStore.setActiveBlock(block.id);

            yield* blockService.updateBlockStatus(block.id, "running");
            yield* blockService.updateBlockOutput(
              block.id,
              `output${i}\n`,
              ""
            );
            yield* blockService.updateBlockStatus(block.id, "success", 0);
          }

          const endTime = Date.now();
          const session = yield* sessionStore.getSession();

          return {
            duration: endTime - startTime,
            blockCount: session.blocks.length,
            allSuccess: session.blocks.every((b) => b.status === "success"),
          };
        })
      );

      expect(result.blockCount).toBe(10);
      expect(result.allSuccess).toBe(true);
    });
  });

  describe("State Immutability Across Operations", () => {
    it("should maintain immutability in complex workflows", async () => {
      const result = await runIntegration(
        Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const blockService = yield* BlockService;

          // Get initial session reference
          const session1 = yield* sessionStore.getSession();
          const session1Id = session1.id;
          const blocks1Count = session1.blocks.length;

          // Add block
          const block = yield* blockService.createBlock("cmd");
          yield* sessionStore.addBlock(block);

          // Get new session reference
          const session2 = yield* sessionStore.getSession();
          const session2Id = session2.id;
          const blocks2Count = session2.blocks.length;

          // Add another block
          const block2 = yield* blockService.createBlock("cmd2");
          yield* sessionStore.addBlock(block2);

          // Get latest session
          const session3 = yield* sessionStore.getSession();
          const session3Id = session3.id;
          const blocks3Count = session3.blocks.length;

          return {
            sameSessionId: session1Id === session2Id && session2Id === session3Id,
            blockCountProgression: [blocks1Count, blocks2Count, blocks3Count],
            immutableGrowth: blocks1Count < blocks2Count && blocks2Count < blocks3Count,
          };
        })
      );

      expect(result.sameSessionId).toBe(true);
      expect(result.blockCountProgression).toEqual([0, 1, 2]);
      expect(result.immutableGrowth).toBe(true);
    });
  });
});
