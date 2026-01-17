import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { SessionStore } from "../SessionStore";
import { LoggerService } from "../LoggerService";
import {
  createMockBlock,
  createMockSession,
  createMockSessionWithBlocks,
} from "../../__tests__/fixtures";
import {
  expectBlockCount,
  expectActiveBlock,
  expectNoActiveBlock,
  getLastBlock,
} from "../../__tests__/helpers";

/**
 * Test suite for SessionStore service
 * Tests the core session state management using Effect.Ref
 */
describe("SessionStore", () => {
  /**
   * Helper to run a SessionStore operation
   */
  const runSessionStore = async <A>(
    effect: Effect.Effect<A, never, SessionStore | LoggerService>
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(Effect.provide(LoggerService.Default), Effect.provide(SessionStore.Default))
    );
  };

  describe("getSession", () => {
    it("should return the current session", async () => {
      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          return yield* store.getSession();
        })
      );

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.blocks).toBeDefined();
      expect(Array.isArray(session.blocks)).toBe(true);
    });

    it("should return session with correct initial state", async () => {
      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          return yield* store.getSession();
        })
      );

      expect(session.activeBlockId).toBeNull();
      expect(session.blocks).toHaveLength(0);
      expect(session.workingDirectory).toBe("/");
    });
  });

  describe("updateSession", () => {
    it("should update session with transformation function", async () => {
      const newCwd = "/home/user";

      const updated = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const originalSession = yield* store.getSession();

          // Update session
          yield* store.updateSession((session) => ({
            ...session,
            workingDirectory: newCwd,
          }));

          // Verify update
          const updatedSession = yield* store.getSession();
          return updatedSession;
        })
      );

      expect(updated.workingDirectory).toBe(newCwd);
    });

    it("should maintain immutability with transformation", async () => {
      const result = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const original = yield* store.getSession();
          const originalId = original.id;

          // Update
          yield* store.updateSession((session) => ({
            ...session,
            workingDirectory: "/new",
          }));

          const updated = yield* store.getSession();
          return { originalId, updatedId: updated.id };
        })
      );

      // Session should be different instance but same ID
      expect(result.originalId).toBe(result.updatedId);
    });
  });

  describe("addBlock", () => {
    it("should add a block to the session", async () => {
      const block = createMockBlock({ command: "test-command" });

      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block);
          return yield* store.getSession();
        })
      );

      expectBlockCount(session, 1);
      expect(session.blocks[0].id).toBe(block.id);
      expect(session.blocks[0].command).toBe("test-command");
    });

    it("should add multiple blocks in order", async () => {
      const block1 = createMockBlock({ command: "cmd1" });
      const block2 = createMockBlock({ command: "cmd2" });
      const block3 = createMockBlock({ command: "cmd3" });

      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block1);
          yield* store.addBlock(block2);
          yield* store.addBlock(block3);
          return yield* store.getSession();
        })
      );

      expectBlockCount(session, 3);
      expect(session.blocks[0].command).toBe("cmd1");
      expect(session.blocks[1].command).toBe("cmd2");
      expect(session.blocks[2].command).toBe("cmd3");
    });

    it("should update lastModified timestamp", async () => {
      const block = createMockBlock();
      const beforeTime = Date.now();

      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block);
          return yield* store.getSession();
        })
      );

      expect(session.lastModified).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe("setActiveBlock", () => {
    it("should set the active block ID", async () => {
      const block = createMockBlock();

      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block);
          yield* store.setActiveBlock(block.id);
          return yield* store.getSession();
        })
      );

      expect(session.activeBlockId).toBe(block.id);
    });

    it("should allow setting active block to null", async () => {
      const block = createMockBlock();

      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block);
          yield* store.setActiveBlock(block.id);
          yield* store.setActiveBlock(null);
          return yield* store.getSession();
        })
      );

      expectNoActiveBlock(session);
    });

    it("should set active block among multiple", async () => {
      const block1 = createMockBlock({ command: "cmd1" });
      const block2 = createMockBlock({ command: "cmd2" });
      const block3 = createMockBlock({ command: "cmd3" });

      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block1);
          yield* store.addBlock(block2);
          yield* store.addBlock(block3);
          yield* store.setActiveBlock(block2.id);
          return yield* store.getSession();
        })
      );

      expect(session.activeBlockId).toBe(block2.id);
      expectBlockCount(session, 3);
    });
  });

  describe("clearBlocks", () => {
    it("should remove all blocks from session", async () => {
      const block1 = createMockBlock();
      const block2 = createMockBlock();

      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block1);
          yield* store.addBlock(block2);
          yield* store.clearBlocks();
          return yield* store.getSession();
        })
      );

      expectBlockCount(session, 0);
      expectNoActiveBlock(session);
    });

    it("should also clear active block ID", async () => {
      const block = createMockBlock();

      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block);
          yield* store.setActiveBlock(block.id);
          yield* store.clearBlocks();
          return yield* store.getSession();
        })
      );

      expect(session.blocks).toHaveLength(0);
      expect(session.activeBlockId).toBeNull();
    });
  });

  describe("resetSession", () => {
    it("should create a new session with different ID", async () => {
      const result = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const session1 = yield* store.getSession();
          const id1 = session1.id;

          yield* store.resetSession();

          const session2 = yield* store.getSession();
          const id2 = session2.id;

          return { id1, id2 };
        })
      );

      expect(result.id1).not.toBe(result.id2);
    });

    it("should clear all blocks when resetting", async () => {
      const block = createMockBlock();

      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block);
          yield* store.resetSession();
          return yield* store.getSession();
        })
      );

      expectBlockCount(session, 0);
      expectNoActiveBlock(session);
    });

    it("should reset to default working directory", async () => {
      const session = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          // Update working directory
          yield* store.updateSession((s) => ({
            ...s,
            workingDirectory: "/custom/path",
          }));

          // Reset
          yield* store.resetSession();

          return yield* store.getSession();
        })
      );

      expect(session.workingDirectory).toBe("/");
    });
  });

  describe("restoreSession", () => {
    it("should restore a previously saved session", async () => {
      const mockSession = createMockSessionWithBlocks(2, {
        workingDirectory: "/home/test",
      });

      const restored = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.restoreSession(mockSession);
          return yield* store.getSession();
        })
      );

      expect(restored.id).toBe(mockSession.id);
      expect(restored.workingDirectory).toBe("/home/test");
      expectBlockCount(restored, 2);
    });

    it("should preserve block data when restoring", async () => {
      const mockSession = createMockSessionWithBlocks(1, {
        blocks: [
          {
            id: "preserved-block",
            command: "original-command",
            status: "success",
            stdout: "output data",
            stderr: "",
            startTime: 1000,
            endTime: 2000,
            exitCode: 0,
            metadata: { custom: "value" },
          },
        ],
      });

      const restored = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.restoreSession(mockSession);
          return yield* store.getSession();
        })
      );

      const block = restored.blocks[0];
      expect(block.id).toBe("preserved-block");
      expect(block.command).toBe("original-command");
      expect(block.stdout).toBe("output data");
      expect(block.metadata.custom).toBe("value");
    });
  });

  describe("getBlock", () => {
    it("should retrieve a block by ID", async () => {
      const block = createMockBlock({ command: "test-cmd" });

      const retrieved = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block);
          return yield* store.getBlock(block.id);
        })
      );

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(block.id);
      expect(retrieved?.command).toBe("test-cmd");
    });

    it("should return null for non-existent block", async () => {
      const retrieved = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          return yield* store.getBlock("non-existent-id");
        })
      );

      expect(retrieved).toBeNull();
    });
  });

  describe("getAllBlocks", () => {
    it("should return all blocks in session", async () => {
      const block1 = createMockBlock({ command: "cmd1" });
      const block2 = createMockBlock({ command: "cmd2" });

      const blocks = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block1);
          yield* store.addBlock(block2);
          return yield* store.getAllBlocks();
        })
      );

      expect(blocks).toHaveLength(2);
      expect(blocks[0].command).toBe("cmd1");
      expect(blocks[1].command).toBe("cmd2");
    });

    it("should return empty array when no blocks", async () => {
      const blocks = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          return yield* store.getAllBlocks();
        })
      );

      expect(blocks).toEqual([]);
    });
  });

  describe("getActiveBlock", () => {
    it("should return the active block if set", async () => {
      const block = createMockBlock({ command: "active-cmd" });

      const active = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block);
          yield* store.setActiveBlock(block.id);
          return yield* store.getActiveBlock();
        })
      );

      expect(active).toBeDefined();
      expect(active?.command).toBe("active-cmd");
    });

    it("should return null when no active block", async () => {
      const active = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          return yield* store.getActiveBlock();
        })
      );

      expect(active).toBeNull();
    });

    it("should return null when active block ID doesn't match any block", async () => {
      const block = createMockBlock();

      const active = await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          yield* store.addBlock(block);
          // Directly set to non-existent ID (shouldn't happen in practice)
          yield* store.updateSession((s) => ({
            ...s,
            activeBlockId: "non-existent",
          }));
          return yield* store.getActiveBlock();
        })
      );

      expect(active).toBeNull();
    });
  });

  describe("State Immutability", () => {
    it("should not mutate original session on updates", async () => {
      const block = createMockBlock();

      await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const original = yield* store.getSession();
          const originalId = original.id;

          yield* store.addBlock(block);

          const afterAdd = yield* store.getSession();
          expect(afterAdd.blocks).toContain(block);
          expect(originalId).toBe(afterAdd.id);
        })
      );
    });

    it("should maintain referential integrity", async () => {
      const block1 = createMockBlock({ command: "cmd1" });
      const block2 = createMockBlock({ command: "cmd2" });

      await runSessionStore(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          yield* store.addBlock(block1);
          const session1 = yield* store.getSession();
          const blocksRef1 = session1.blocks;

          yield* store.addBlock(block2);
          const session2 = yield* store.getSession();
          const blocksRef2 = session2.blocks;

          // Different array instances for immutability
          expect(blocksRef1).not.toBe(blocksRef2);
          // But session IDs should be same
          expect(session1.id).toBe(session2.id);
        })
      );
    });
  });
});
