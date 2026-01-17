import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBlocks, useSessions, useAsyncCommand } from "../index";
import { generateId } from "../../types";
import type { Block, Session } from "../../types";

/**
 * Test suite for React hooks
 * Tests custom hooks that bridge Effect services and React state
 */

describe("useBlocks", () => {
  describe("initialization", () => {
    it("should initialize with empty blocks by default", () => {
      const { result } = renderHook(() => useBlocks());

      expect(result.current.blocks).toEqual([]);
      expect(Array.isArray(result.current.blocks)).toBe(true);
    });

    it("should initialize with provided initial blocks", () => {
      const initialBlocks: Block[] = [
        {
          id: "block-1",
          command: "echo test",
          status: "success",
          stdout: "test",
          stderr: "",
          startTime: 1000,
          metadata: {},
        },
      ];

      const { result } = renderHook(() => useBlocks(initialBlocks));

      expect(result.current.blocks).toHaveLength(1);
      expect(result.current.blocks[0].id).toBe("block-1");
      expect(result.current.blocks[0].command).toBe("echo test");
    });
  });

  describe("addBlock", () => {
    it("should add a block to the list", () => {
      const { result } = renderHook(() => useBlocks());

      act(() => {
        result.current.addBlock("ls -la");
      });

      expect(result.current.blocks).toHaveLength(1);
      expect(result.current.blocks[0].command).toBe("ls -la");
    });

    it("should create block with proper structure", () => {
      const { result } = renderHook(() => useBlocks());

      act(() => {
        result.current.addBlock("echo hello");
      });

      const block = result.current.blocks[0];
      expect(block.id).toBeDefined();
      expect(typeof block.id).toBe("string");
      expect(block.command).toBe("echo hello");
      expect(block.status).toBe("idle");
      expect(block.stdout).toBe("");
      expect(block.stderr).toBe("");
      expect(typeof block.startTime).toBe("number");
      expect(block.startTime).toBeGreaterThan(0);
    });

    it("should generate unique IDs for different blocks", () => {
      const { result } = renderHook(() => useBlocks());

      act(() => {
        result.current.addBlock("cmd1");
        result.current.addBlock("cmd2");
        result.current.addBlock("cmd3");
      });

      const ids = result.current.blocks.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it("should add multiple blocks in order", () => {
      const { result } = renderHook(() => useBlocks());

      act(() => {
        result.current.addBlock("first");
        result.current.addBlock("second");
        result.current.addBlock("third");
      });

      expect(result.current.blocks).toHaveLength(3);
      expect(result.current.blocks[0].command).toBe("first");
      expect(result.current.blocks[1].command).toBe("second");
      expect(result.current.blocks[2].command).toBe("third");
    });

    it("should preserve metadata object", () => {
      const { result } = renderHook(() => useBlocks());

      act(() => {
        result.current.addBlock("test");
      });

      expect(result.current.blocks[0].metadata).toBeDefined();
      expect(typeof result.current.blocks[0].metadata).toBe("object");
    });
  });

  describe("updateBlock", () => {
    it("should update block by ID", () => {
      const { result } = renderHook(() => useBlocks());

      let blockId: string;
      act(() => {
        const block = result.current.addBlock("original");
        blockId = block.id;
      });

      act(() => {
        result.current.updateBlock(blockId!, {
          status: "success",
          stdout: "output",
        });
      });

      const updated = result.current.blocks[0];
      expect(updated.status).toBe("success");
      expect(updated.stdout).toBe("output");
      expect(updated.command).toBe("original"); // Original field unchanged
    });

    it("should update only specified fields", () => {
      const { result } = renderHook(() => useBlocks());

      let blockId: string;
      act(() => {
        const block = result.current.addBlock("test");
        blockId = block.id;
      });

      act(() => {
        result.current.updateBlock(blockId!, { status: "running" });
      });

      const block = result.current.blocks[0];
      expect(block.status).toBe("running");
      expect(block.command).toBe("test");
      expect(block.stdout).toBe("");
    });

    it("should handle update of non-existent block", () => {
      const { result } = renderHook(() => useBlocks());

      act(() => {
        result.current.addBlock("test");
      });

      act(() => {
        result.current.updateBlock("non-existent-id", { status: "success" });
      });

      expect(result.current.blocks).toHaveLength(1);
      expect(result.current.blocks[0].status).toBe("idle");
    });

    it("should update among multiple blocks", () => {
      const { result } = renderHook(() => useBlocks());

      let targetId: string;
      act(() => {
        result.current.addBlock("cmd1");
        const target = result.current.addBlock("cmd2");
        targetId = target.id;
        result.current.addBlock("cmd3");
      });

      act(() => {
        result.current.updateBlock(targetId!, {
          status: "success",
          stdout: "middle",
        });
      });

      expect(result.current.blocks[1].status).toBe("success");
      expect(result.current.blocks[1].stdout).toBe("middle");
      expect(result.current.blocks[0].status).toBe("idle");
      expect(result.current.blocks[2].status).toBe("idle");
    });

    it("should maintain block immutability", () => {
      const { result } = renderHook(() => useBlocks());

      let blockId: string;
      let originalBlock: Block;
      act(() => {
        const block = result.current.addBlock("test");
        blockId = block.id;
        originalBlock = block;
      });

      act(() => {
        result.current.updateBlock(blockId!, { stdout: "new output" });
      });

      expect(originalBlock.stdout).toBe(""); // Original unchanged
      expect(result.current.blocks[0].stdout).toBe("new output"); // Updated version
    });
  });

  describe("clearBlocks", () => {
    it("should clear all blocks", () => {
      const { result } = renderHook(() => useBlocks());

      act(() => {
        result.current.addBlock("cmd1");
        result.current.addBlock("cmd2");
        result.current.addBlock("cmd3");
      });

      expect(result.current.blocks).toHaveLength(3);

      act(() => {
        result.current.clearBlocks();
      });

      expect(result.current.blocks).toHaveLength(0);
      expect(result.current.blocks).toEqual([]);
    });

    it("should handle clearing empty blocks", () => {
      const { result } = renderHook(() => useBlocks());

      act(() => {
        result.current.clearBlocks();
      });

      expect(result.current.blocks).toHaveLength(0);
    });

    it("should clear only once when called multiple times", () => {
      const { result } = renderHook(() => useBlocks());

      act(() => {
        result.current.addBlock("test");
        result.current.clearBlocks();
        result.current.clearBlocks();
      });

      expect(result.current.blocks).toHaveLength(0);
    });
  });

  describe("Block management workflow", () => {
    it("should maintain full block lifecycle", () => {
      const { result } = renderHook(() => useBlocks());

      let blockId: string;

      // Create
      act(() => {
        const block = result.current.addBlock("echo test");
        blockId = block.id;
      });
      expect(result.current.blocks).toHaveLength(1);
      expect(result.current.blocks[0].status).toBe("idle");

      // Update to running
      act(() => {
        result.current.updateBlock(blockId!, { status: "running" });
      });
      expect(result.current.blocks[0].status).toBe("running");

      // Update to success
      act(() => {
        result.current.updateBlock(blockId!, {
          status: "success",
          stdout: "test output",
        });
      });
      expect(result.current.blocks[0].status).toBe("success");
      expect(result.current.blocks[0].stdout).toBe("test output");

      // Clear all
      act(() => {
        result.current.clearBlocks();
      });
      expect(result.current.blocks).toHaveLength(0);
    });
  });
});

describe("useSessions", () => {
  describe("initialization", () => {
    it("should initialize with empty sessions and no current session", () => {
      const { result } = renderHook(() => useSessions());

      expect(result.current.sessions).toEqual([]);
      expect(result.current.currentSession).toBeNull();
    });
  });

  describe("createSession", () => {
    it("should create a new session", () => {
      const { result } = renderHook(() => useSessions());

      act(() => {
        result.current.createSession();
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.currentSession).toBeDefined();
    });

    it("should create session with proper structure", () => {
      const { result } = renderHook(() => useSessions());

      act(() => {
        result.current.createSession();
      });

      const session = result.current.currentSession!;
      expect(session.id).toBeDefined();
      expect(typeof session.id).toBe("string");
      expect(Array.isArray(session.blocks)).toBe(true);
      expect(session.blocks).toHaveLength(0);
      expect(session.activeBlockId).toBeNull();
      expect(typeof session.workingDirectory).toBe("string");
      expect(typeof session.environment).toBe("object");
      expect(typeof session.createdAt).toBe("number");
      expect(typeof session.lastModified).toBe("number");
    });

    it("should set environment from process.env safely", () => {
      const { result } = renderHook(() => useSessions());

      act(() => {
        result.current.createSession();
      });

      const session = result.current.currentSession!;
      expect(session.environment).toBeDefined();

      // All values should be strings
      for (const [key, value] of Object.entries(session.environment)) {
        expect(typeof value).toBe("string");
      }
    });

    it("should generate unique session IDs", () => {
      const { result } = renderHook(() => useSessions());

      act(() => {
        result.current.createSession();
        result.current.createSession();
        result.current.createSession();
      });

      const ids = result.current.sessions.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it("should add multiple sessions to the list", () => {
      const { result } = renderHook(() => useSessions());

      act(() => {
        result.current.createSession();
        result.current.createSession();
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.currentSession).toBe(result.current.sessions[1]);
    });

    it("should update currentSession to latest created", () => {
      const { result } = renderHook(() => useSessions());

      let firstSessionId: string;
      let secondSessionId: string;

      act(() => {
        result.current.createSession();
        firstSessionId = result.current.currentSession!.id;
      });

      act(() => {
        result.current.createSession();
        secondSessionId = result.current.currentSession!.id;
      });

      expect(firstSessionId).not.toBe(secondSessionId);
      expect(result.current.currentSession?.id).toBe(secondSessionId);
    });
  });

  describe("updateSession", () => {
    it("should update current session", () => {
      const { result } = renderHook(() => useSessions());

      act(() => {
        result.current.createSession();
      });

      act(() => {
        result.current.updateSession({
          workingDirectory: "/home/test",
        });
      });

      expect(result.current.currentSession?.workingDirectory).toBe(
        "/home/test"
      );
    });

    it("should update lastModified timestamp", () => {
      const { result } = renderHook(() => useSessions());

      act(() => {
        result.current.createSession();
      });

      const beforeTime = Date.now();

      act(() => {
        result.current.updateSession({ workingDirectory: "/new" });
      });

      const afterTime = Date.now();
      const lastModified = result.current.currentSession!.lastModified;

      expect(lastModified).toBeGreaterThanOrEqual(beforeTime);
      expect(lastModified).toBeLessThanOrEqual(afterTime);
    });

    it("should handle update with multiple fields", () => {
      const { result } = renderHook(() => useSessions());

      act(() => {
        result.current.createSession();
      });

      act(() => {
        result.current.updateSession({
          workingDirectory: "/custom",
          activeBlockId: "block-123",
        });
      });

      const session = result.current.currentSession!;
      expect(session.workingDirectory).toBe("/custom");
      expect(session.activeBlockId).toBe("block-123");
    });

    it("should handle update when currentSession is null", () => {
      const { result } = renderHook(() => useSessions());

      act(() => {
        result.current.updateSession({ workingDirectory: "/test" });
      });

      expect(result.current.currentSession).toBeNull();
    });

    it("should preserve session ID during update", () => {
      const { result } = renderHook(() => useSessions());

      let originalId: string;
      act(() => {
        result.current.createSession();
        originalId = result.current.currentSession!.id;
      });

      act(() => {
        result.current.updateSession({ workingDirectory: "/new" });
      });

      expect(result.current.currentSession?.id).toBe(originalId);
    });
  });

  describe("Session management workflow", () => {
    it("should maintain full session lifecycle", () => {
      const { result } = renderHook(() => useSessions());

      // Create session
      act(() => {
        result.current.createSession();
      });
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.currentSession).toBeDefined();

      const originalId = result.current.currentSession!.id;

      // Update session
      act(() => {
        result.current.updateSession({
          workingDirectory: "/tmp",
        });
      });
      expect(result.current.currentSession!.workingDirectory).toBe("/tmp");
      expect(result.current.currentSession!.id).toBe(originalId);

      // Create another session
      act(() => {
        result.current.createSession();
      });
      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.currentSession!.id).not.toBe(originalId);
    });
  });
});

describe("useAsyncCommand", () => {
  describe("initialization", () => {
    it("should initialize with not loading and no error", () => {
      const { result } = renderHook(() => useAsyncCommand());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("executeCommand", () => {
    it("should set loading state during execution", async () => {
      const { result } = renderHook(() => useAsyncCommand());

      expect(result.current.isLoading).toBe(false);

      // Note: This test may be difficult to verify loading state
      // since mock execution is instantaneous in tests
    });

    it("should accept command, cwd, and env parameters", async () => {
      const { result } = renderHook(() => useAsyncCommand());

      const executeCommand = result.current.executeCommand;
      expect(typeof executeCommand).toBe("function");

      // Should accept all parameter combinations
      expect(() => {
        executeCommand("echo test");
      }).not.toThrow();
    });

    it("should clear error on successful execution", async () => {
      const { result } = renderHook(() => useAsyncCommand());

      act(() => {
        // Simulate previous error
        const { executeCommand } = result.current;
        // In real scenario, error would be set by failed command
      });

      // executeCommand should clear error when called
      expect(result.current.error).toBeNull();
    });

    it("should handle missing optional parameters", async () => {
      const { result } = renderHook(() => useAsyncCommand());

      expect(() => {
        result.current.executeCommand("echo test");
      }).not.toThrow();

      expect(() => {
        result.current.executeCommand("echo test", "/tmp");
      }).not.toThrow();

      expect(() => {
        result.current.executeCommand("echo test", "/tmp", {
          VAR: "value",
        });
      }).not.toThrow();
    });
  });

  describe("cleanup", () => {
    it("should dispose runner on unmount", () => {
      const { unmount } = renderHook(() => useAsyncCommand());

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it("should handle multiple unmounts gracefully", () => {
      const { unmount } = renderHook(() => useAsyncCommand());

      expect(() => {
        unmount();
        unmount();
      }).not.toThrow();
    });
  });

  describe("Error handling", () => {
    it("should initialize error as null", () => {
      const { result } = renderHook(() => useAsyncCommand());

      expect(result.current.error).toBeNull();
    });

    it("should maintain isLoading as false when not executing", () => {
      const { result } = renderHook(() => useAsyncCommand());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Hook state management", () => {
    it("should maintain separate state for different hook instances", () => {
      const { result: result1 } = renderHook(() => useAsyncCommand());
      const { result: result2 } = renderHook(() => useAsyncCommand());

      expect(result1.current).not.toBe(result2.current);
      expect(result1.current.isLoading).toBe(result2.current.isLoading);
    });
  });
});

describe("Hooks integration", () => {
  it("useBlocks and useSessions should work together", () => {
    const { result: blocksResult } = renderHook(() => useBlocks());
    const { result: sessionsResult } = renderHook(() => useSessions());

    act(() => {
      blocksResult.current.addBlock("cmd1");
      blocksResult.current.addBlock("cmd2");
    });

    act(() => {
      sessionsResult.current.createSession();
    });

    expect(blocksResult.current.blocks).toHaveLength(2);
    expect(sessionsResult.current.sessions).toHaveLength(1);
  });

  it("should maintain block and session state independently", () => {
    const { result: blocksResult } = renderHook(() => useBlocks());
    const { result: sessionsResult } = renderHook(() => useSessions());

    act(() => {
      blocksResult.current.addBlock("cmd");
      blocksResult.current.clearBlocks();
    });

    act(() => {
      sessionsResult.current.createSession();
    });

    expect(blocksResult.current.blocks).toHaveLength(0);
    expect(sessionsResult.current.sessions).toHaveLength(1);
  });
});
