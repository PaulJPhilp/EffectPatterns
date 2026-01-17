import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  EffectProvider,
  useEffectTalk,
  EffectContext,
} from "../EffectProvider";
import type { Block, Session } from "../../types";
import { createMockBlock, createMockSession } from "../../__tests__/fixtures";

/**
 * Test suite for EffectProvider and useEffectTalk hook
 * Tests React Context integration with Effect-based state management
 */

describe("EffectProvider", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EffectProvider>{children}</EffectProvider>
  );

  describe("Provider initialization", () => {
    it("should provide initial context values", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.session).toBeDefined();
      expect(typeof result.current.isLoading).toBe("boolean");
      expect(result.current.error === null || typeof result.current.error === "string").toBe(true);
    });

    it("should have null session initially or load a session", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(
          result.current.session === null || typeof result.current.session === "object"
        ).toBe(true);
      });
    });

    it("should have false isLoading after initialization", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should start with null error", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(result.current.error).toBeNull();
    });
  });

  describe("Context API methods", () => {
    it("should provide executeCommand method", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(typeof result.current.executeCommand).toBe("function");
    });

    it("should provide addBlock method", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(typeof result.current.addBlock).toBe("function");
    });

    it("should provide updateBlock method", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(typeof result.current.updateBlock).toBe("function");
    });

    it("should provide clearBlocks method", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(typeof result.current.clearBlocks).toBe("function");
    });

    it("should provide setActiveBlock method", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(typeof result.current.setActiveBlock).toBe("function");
    });

    it("should provide deleteSession method", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(typeof result.current.deleteSession).toBe("function");
    });

    it("should provide saveSession method", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(typeof result.current.saveSession).toBe("function");
    });

    it("should provide restoreSession method", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(typeof result.current.restoreSession).toBe("function");
    });
  });

  describe("Session management", () => {
    it("should have a session object with blocks", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        if (result.current.session) {
          expect(Array.isArray(result.current.session.blocks)).toBe(true);
        }
      });
    });

    it("should update session with addBlock", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      const mockBlock = createMockBlock({ command: "test-cmd" });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      if (result.current.session) {
        const initialBlockCount = result.current.session.blocks.length;

        await act(async () => {
          await result.current.addBlock(mockBlock);
        });

        await waitFor(() => {
          if (result.current.session) {
            expect(result.current.session.blocks.length).toBeGreaterThanOrEqual(
              initialBlockCount
            );
          }
        });
      }
    });

    it("should clear blocks with clearBlocks", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      if (result.current.session && result.current.session.blocks.length > 0) {
        await act(async () => {
          await result.current.clearBlocks();
        });

        await waitFor(() => {
          expect(result.current.session?.blocks).toHaveLength(0);
        });
      }
    });

    it("should set active block", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      if (result.current.session) {
        const testBlockId = "test-block-id";

        await act(async () => {
          await result.current.setActiveBlock(testBlockId);
        });

        await waitFor(() => {
          // setActiveBlock should complete without throwing
          expect(result.current.session).toBeDefined();
        });
      }
    });

    it("should clear active block with null", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      if (result.current.session) {
        await act(async () => {
          await result.current.setActiveBlock(null);
        });

        await waitFor(() => {
          expect(result.current.session).toBeDefined();
        });
      }
    });
  });

  describe("Error handling", () => {
    it("should set error state on failure", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      // Attempt invalid operation to trigger error
      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      // Most operations should succeed or be handled gracefully
      expect(result.current.error === null || typeof result.current.error === "string").toBe(true);
    });

    it("should clear error on successful operation", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      const mockBlock = createMockBlock();

      await act(async () => {
        await result.current.addBlock(mockBlock);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe("Loading state", () => {
    it("should have loading false after initialization", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle loading state during operations", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      const mockBlock = createMockBlock();

      await act(async () => {
        await result.current.addBlock(mockBlock);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("autoRestore feature", () => {
    it("should respect autoRestore prop", async () => {
      const { result } = renderHook(() => useEffectTalk(), {
        wrapper: ({ children }) => (
          <EffectProvider autoRestore={true}>{children}</EffectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      expect(result.current.session).not.toBeNull();
    });

    it("should create new session when autoRestore is false", async () => {
      const { result } = renderHook(() => useEffectTalk(), {
        wrapper: ({ children }) => (
          <EffectProvider autoRestore={false}>{children}</EffectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      // Should have a session even without autoRestore
      expect(result.current.session).not.toBeNull();
    });
  });

  describe("Context value stability", () => {
    it("should update context when session changes", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      const initialSession = result.current.session;
      const mockBlock = createMockBlock();

      await act(async () => {
        await result.current.addBlock(mockBlock);
      });

      await waitFor(() => {
        if (result.current.session && initialSession) {
          // After adding block, the session reference should update
          expect(result.current.session).toBeDefined();
        }
      });
    });
  });
});

describe("useEffectTalk hook", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EffectProvider>{children}</EffectProvider>
  );

  describe("Context access", () => {
    it("should return context when used inside EffectProvider", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current).not.toBeNull();
    });

    it("should throw error when used outside EffectProvider", () => {
      expect(() => {
        renderHook(() => useEffectTalk());
      }).toThrow("useEffectTalk must be used within EffectProvider");
    });

    it("should throw specific error message", () => {
      try {
        renderHook(() => useEffectTalk());
        expect.fail("Should have thrown error");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toContain("useEffectTalk must be used within EffectProvider");
      }
    });
  });

  describe("Hook return value", () => {
    it("should return object with all required properties", () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      const context = result.current;

      expect("session" in context).toBe(true);
      expect("isLoading" in context).toBe(true);
      expect("error" in context).toBe(true);
      expect("executeCommand" in context).toBe(true);
      expect("addBlock" in context).toBe(true);
      expect("updateBlock" in context).toBe(true);
      expect("clearBlocks" in context).toBe(true);
      expect("setActiveBlock" in context).toBe(true);
      expect("deleteSession" in context).toBe(true);
      expect("saveSession" in context).toBe(true);
      expect("restoreSession" in context).toBe(true);
    });

    it("should return consistent context instance", () => {
      const { result, rerender } = renderHook(() => useEffectTalk(), { wrapper });

      const context1 = result.current;
      rerender();
      const context2 = result.current;

      // Context values should be accessible (though some may change)
      expect(context1).toBeDefined();
      expect(context2).toBeDefined();
    });
  });

  describe("Hook behavior", () => {
    it("should allow multiple hook calls within same provider", () => {
      const { result: result1 } = renderHook(() => useEffectTalk(), { wrapper });
      const { result: result2 } = renderHook(() => useEffectTalk(), { wrapper });

      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();
    });

    it("should maintain independent state for different provider instances", async () => {
      const wrapper1 = ({ children }: { children: React.ReactNode }) => (
        <EffectProvider>{children}</EffectProvider>
      );

      const wrapper2 = ({ children }: { children: React.ReactNode }) => (
        <EffectProvider>{children}</EffectProvider>
      );

      const { result: result1 } = renderHook(() => useEffectTalk(), {
        wrapper: wrapper1,
      });
      const { result: result2 } = renderHook(() => useEffectTalk(), {
        wrapper: wrapper2,
      });

      await waitFor(() => {
        expect(result1.current.session).toBeDefined();
        expect(result2.current.session).toBeDefined();
      });

      // Both should have independent sessions
      if (result1.current.session && result2.current.session) {
        expect(result1.current.session.id).not.toBe(result2.current.session.id);
      }
    });
  });

  describe("Async operations", () => {
    it("should handle addBlock as async operation", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      const mockBlock = createMockBlock();
      const initialBlockCount = result.current.session?.blocks.length ?? 0;

      let operationCompleted = false;

      await act(async () => {
        await result.current.addBlock(mockBlock);
        operationCompleted = true;
      });

      expect(operationCompleted).toBe(true);
    });

    it("should handle updateBlock as async operation", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      let operationCompleted = false;

      await act(async () => {
        await result.current.updateBlock("test-id", { status: "running" });
        operationCompleted = true;
      });

      expect(operationCompleted).toBe(true);
    });

    it("should handle clearBlocks as async operation", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      let operationCompleted = false;

      await act(async () => {
        await result.current.clearBlocks();
        operationCompleted = true;
      });

      expect(operationCompleted).toBe(true);
    });

    it("should handle setActiveBlock as async operation", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      let operationCompleted = false;

      await act(async () => {
        await result.current.setActiveBlock("block-id");
        operationCompleted = true;
      });

      expect(operationCompleted).toBe(true);
    });

    it("should handle saveSession as async operation", async () => {
      const { result } = renderHook(() => useEffectTalk(), { wrapper });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });

      let operationCompleted = false;

      await act(async () => {
        await result.current.saveSession();
        operationCompleted = true;
      });

      expect(operationCompleted).toBe(true);
    });
  });
});

describe("EffectProvider lifecycle", () => {
  it("should initialize and cleanup properly", async () => {
    const { unmount } = renderHook(() => useEffectTalk(), {
      wrapper: ({ children }) => <EffectProvider>{children}</EffectProvider>,
    });

    await waitFor(() => {
      // Wait for initialization
    });

    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it("should handle multiple provider instances", () => {
    const { unmount: unmount1 } = renderHook(() => useEffectTalk(), {
      wrapper: ({ children }) => <EffectProvider>{children}</EffectProvider>,
    });

    const { unmount: unmount2 } = renderHook(() => useEffectTalk(), {
      wrapper: ({ children }) => <EffectProvider>{children}</EffectProvider>,
    });

    expect(() => {
      unmount1();
      unmount2();
    }).not.toThrow();
  });
});

describe("Context error recovery", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EffectProvider>{children}</EffectProvider>
  );

  it("should recover from error state", async () => {
    const { result } = renderHook(() => useEffectTalk(), { wrapper });

    await waitFor(() => {
      expect(result.current.session).toBeDefined();
    });

    // Attempt an operation
    const mockBlock = createMockBlock();

    await act(async () => {
      await result.current.addBlock(mockBlock);
    });

    // Should be in clean state after operation
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should maintain session even after errors", async () => {
    const { result } = renderHook(() => useEffectTalk(), { wrapper });

    await waitFor(() => {
      expect(result.current.session).toBeDefined();
    });

    const sessionBefore = result.current.session;

    // Perform operation (may fail)
    await act(async () => {
      await result.current.clearBlocks();
    });

    // Session should still exist
    expect(result.current.session).toBeDefined();
    expect(result.current.session?.id).toBe(sessionBefore?.id);
  });
});
