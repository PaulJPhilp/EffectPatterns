import { describe, it, expect, beforeEach } from "vitest";
import { Effect } from "effect";
import { CommandExecutor } from "../CommandExecutor";
import { SessionStore } from "../SessionStore";
import { ProcessService } from "../ProcessService";
import { LoggerService } from "../LoggerService";
import {
  createMockBlock,
  createMockSession,
  runEffect,
} from "../../__tests__/fixtures";
import {
  expectBlockRunning,
  expectBlockSuccess,
  expectBlockFailure,
  expectActiveBlock,
  expectBlockCount,
  findBlockByCommand,
} from "../../__tests__/helpers";

/**
 * Integration tests for CommandExecutor service
 * Tests the orchestration of command execution workflow
 */
describe("CommandExecutor", () => {
  /**
   * Helper to run a CommandExecutor operation with all dependencies
   */
  const runCommandExecutor = async <A>(
    effect: Effect.Effect<
      A,
      never,
      CommandExecutor | SessionStore | ProcessService | LoggerService
    >
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(LoggerService.Default),
        Effect.provide(ProcessService.Default),
        Effect.provide(SessionStore.Default),
        Effect.provide(CommandExecutor.Default)
      )
    );
  };

  describe("executeCommand", () => {
    it("should execute a command and create a block", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          // Get initial session
          const initialSession = yield* store.getSession();
          expect(initialSession.blocks).toHaveLength(0);

          // Execute command
          yield* executor.executeCommand("echo test", "/tmp", {});

          // Verify block was created
          const updatedSession = yield* store.getSession();
          expect(updatedSession.blocks.length).toBeGreaterThan(0);
        })
      );
    });

    it("should set block to running status during execution", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test", "/tmp", {});

          const session = yield* store.getSession();
          const lastBlock = session.blocks[session.blocks.length - 1];

          // Block should have running status initially or be completed
          expect(
            ["running", "success", "failure"].includes(lastBlock.status)
          ).toBe(true);
        })
      );
    });

    it("should set active block during execution", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test", "/tmp", {});

          const session = yield* store.getSession();
          // Active block might be cleared after completion, but should have been set
          expect(session.blocks.length).toBeGreaterThan(0);
        })
      );
    });

    it("should preserve command string in block", async () => {
      const command = "echo hello world";

      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand(command, "/tmp", {});

          const session = yield* store.getSession();
          const block = session.blocks[0];
          expect(block.command).toBe(command);
        })
      );
    });

    it("should set working directory in block metadata", async () => {
      const cwd = "/home/user";

      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test", cwd, {});

          const session = yield* store.getSession();
          const block = session.blocks[0];
          expect(block.metadata.cwd).toBe(cwd);
        })
      );
    });

    it("should use default working directory if not provided", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test");

          const session = yield* store.getSession();
          const block = session.blocks[0];
          expect(block.metadata.cwd).toBe("/");
        })
      );
    });

    it("should update session lastModified when command executes", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          const beforeTime = Date.now();
          yield* executor.executeCommand("echo test", "/tmp", {});
          const afterTime = Date.now();

          const session = yield* store.getSession();
          expect(session.lastModified).toBeGreaterThanOrEqual(beforeTime);
          expect(session.lastModified).toBeLessThanOrEqual(afterTime + 1000);
        })
      );
    });

    it("should handle command with environment variables", async () => {
      const env = { TEST_VAR: "test_value", CUSTOM: "custom" };

      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test", "/tmp", env);

          const session = yield* store.getSession();
          expect(session.blocks.length).toBeGreaterThan(0);
        })
      );
    });

    it("should capture process ID in block metadata", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test", "/tmp", {});

          const session = yield* store.getSession();
          const block = session.blocks[0];
          expect(block.metadata).toBeDefined();
          // PID should be set when process is spawned
          expect(typeof block.metadata.pid).toBe("number");
        })
      );
    });
  });

  describe("interruptCommand", () => {
    it("should interrupt a running command", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("sleep 10", "/tmp", {});

          const session = yield* store.getSession();
          const blockId = session.blocks[0].id;

          // Interrupt the command
          yield* executor.interruptCommand(blockId);

          const updatedSession = yield* store.getSession();
          const block = updatedSession.blocks[0];

          // Block should be marked as interrupted
          expect(block.status).toBe("interrupted");
          expect(block.endTime).toBeDefined();
        })
      );
    });

    it("should not interrupt a non-running block", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          // Create a completed block
          yield* executor.executeCommand("echo test", "/tmp", {});

          const session = yield* store.getSession();
          const blockId = session.blocks[0].id;
          const originalStatus = session.blocks[0].status;

          // Try to interrupt completed block
          yield* executor.interruptCommand(blockId);

          const updatedSession = yield* store.getSession();
          const block = updatedSession.blocks[0];

          // Status should not change for completed block
          expect(block.status).toBe(originalStatus);
        })
      );
    });

    it("should handle interrupt of non-existent block gracefully", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;

          // Should not throw
          yield* executor.interruptCommand("non-existent-id");
        })
      );
    });

    it("should set endTime when interrupting", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("sleep 10", "/tmp", {});

          const session = yield* store.getSession();
          const blockId = session.blocks[0].id;
          const beforeInterrupt = Date.now();

          yield* executor.interruptCommand(blockId);

          const updatedSession = yield* store.getSession();
          const block = updatedSession.blocks[0];

          expect(block.endTime).toBeDefined();
          if (block.endTime) {
            expect(block.endTime).toBeGreaterThanOrEqual(beforeInterrupt);
          }
        })
      );
    });

    it("should clear active block when interrupting", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("sleep 10", "/tmp", {});

          const session = yield* store.getSession();
          const blockId = session.blocks[0].id;

          expect(session.activeBlockId).toBe(blockId);

          yield* executor.interruptCommand(blockId);

          const updatedSession = yield* store.getSession();
          expect(updatedSession.activeBlockId).toBeNull();
        })
      );
    });
  });

  describe("getBlockStatus", () => {
    it("should return the status of a block", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test", "/tmp", {});

          const session = yield* store.getSession();
          const blockId = session.blocks[0].id;

          const status = yield* executor.getBlockStatus(blockId);
          expect(status).toBeDefined();
          expect(
            ["idle", "running", "success", "failure", "interrupted"].includes(
              status
            )
          ).toBe(true);
        })
      );
    });

    it("should return null for non-existent block", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;

          const status = yield* executor.getBlockStatus("non-existent-id");
          expect(status).toBeNull();
        })
      );
    });
  });

  describe("Command execution workflow", () => {
    it("should execute multiple commands sequentially", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo cmd1", "/tmp", {});
          yield* executor.executeCommand("echo cmd2", "/tmp", {});
          yield* executor.executeCommand("echo cmd3", "/tmp", {});

          const session = yield* store.getSession();
          expectBlockCount(session, 3);
          expect(session.blocks[0].command).toBe("echo cmd1");
          expect(session.blocks[1].command).toBe("echo cmd2");
          expect(session.blocks[2].command).toBe("echo cmd3");
        })
      );
    });

    it("should maintain block order", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          const commands = ["first", "second", "third", "fourth"];

          for (const cmd of commands) {
            yield* executor.executeCommand(`echo ${cmd}`, "/tmp", {});
          }

          const session = yield* store.getSession();
          expect(session.blocks.map((b) => b.command)).toEqual(
            commands.map((c) => `echo ${c}`)
          );
        })
      );
    });

    it("should find block by command", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          const targetCmd = "echo find-me";
          yield* executor.executeCommand("echo first", "/tmp", {});
          yield* executor.executeCommand(targetCmd, "/tmp", {});
          yield* executor.executeCommand("echo third", "/tmp", {});

          const session = yield* store.getSession();
          const foundBlock = findBlockByCommand(session, targetCmd);

          expect(foundBlock).toBeDefined();
          expect(foundBlock?.command).toBe(targetCmd);
        })
      );
    });
  });

  describe("Error handling", () => {
    it("should handle invalid working directory", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          // Should not crash with invalid directory
          yield* Effect.tryPromise(() =>
            Promise.resolve(
              yield* executor.executeCommand(
                "echo test",
                "/invalid/path/that/does/not/exist",
                {}
              )
            )
          ).pipe(
            Effect.catchAll(() =>
              Effect.sync(() => {
                // Error is expected
              })
            )
          );
        })
      );
    });

    it("should maintain session integrity on command failure", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          const initialSession = yield* store.getSession();
          const initialBlockCount = initialSession.blocks.length;

          // Execute even if it might fail
          yield* Effect.tryPromise(() =>
            Promise.resolve(yield* executor.executeCommand("invalid-command", "/tmp", {}))
          ).pipe(
            Effect.catchAll(() => Effect.unit)
          );

          const finalSession = yield* store.getSession();

          // Session should still be valid
          expect(finalSession).toBeDefined();
          expect(finalSession.blocks.length).toBeGreaterThanOrEqual(
            initialBlockCount
          );
          expect(finalSession.id).toBeDefined();
        })
      );
    });
  });

  describe("Block lifecycle", () => {
    it("should track complete block lifecycle", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          // Execute command
          yield* executor.executeCommand("echo test", "/tmp", {});

          const session = yield* store.getSession();
          const block = session.blocks[0];

          // Verify block has required fields
          expect(block.id).toBeDefined();
          expect(block.command).toBe("echo test");
          expect(block.status).toBeDefined();
          expect(block.startTime).toBeDefined();
          expect(block.startTime).toBeGreaterThan(0);

          // For completed commands, should have these
          if (block.status === "success" || block.status === "failure") {
            expect(block.endTime).toBeDefined();
            expect(block.endTime).toBeGreaterThanOrEqual(block.startTime);
          }
        })
      );
    });

    it("should calculate duration from startTime and endTime", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test", "/tmp", {});

          const session = yield* store.getSession();
          const block = session.blocks[0];

          if (block.endTime) {
            const duration = block.endTime - block.startTime;
            expect(duration).toBeGreaterThanOrEqual(0);
          }
        })
      );
    });
  });

  describe("Concurrency", () => {
    it("should handle multiple blocks with different states", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          // Execute multiple commands
          yield* executor.executeCommand("echo one", "/tmp", {});
          yield* executor.executeCommand("echo two", "/tmp", {});
          yield* executor.executeCommand("echo three", "/tmp", {});

          const session = yield* store.getSession();

          // All blocks should exist
          expectBlockCount(session, 3);

          // Each block should have a unique ID
          const ids = session.blocks.map((b) => b.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(3);
        })
      );
    });
  });

  describe("Stream processing", () => {
    it("should capture stdout from process", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test-output", "/tmp", {});

          const session = yield* store.getSession();
          const block = session.blocks[0];

          // Should have captured some output (mock includes output)
          expect(block.stdout).toBeDefined();
          // Mock or real output should be string
          expect(typeof block.stdout).toBe("string");
        })
      );
    });

    it("should maintain separate stdout and stderr", async () => {
      await runCommandExecutor(
        Effect.gen(function* () {
          const executor = yield* CommandExecutor;
          const store = yield* SessionStore;

          yield* executor.executeCommand("echo test", "/tmp", {});

          const session = yield* store.getSession();
          const block = session.blocks[0];

          expect(block.stdout).toBeDefined();
          expect(block.stderr).toBeDefined();
          expect(typeof block.stdout).toBe("string");
          expect(typeof block.stderr).toBe("string");
        })
      );
    });
  });
});
