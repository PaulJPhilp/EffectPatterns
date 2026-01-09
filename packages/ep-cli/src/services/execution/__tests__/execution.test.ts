import { Context, Effect, Exit, Layer } from "effect";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TUILoader } from "../../tui-loader.js";
import { Execution } from "../service.js";

// --- Mocking ---

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

const makeMockTUILoader = (tuiModule: any | null) => 
  Layer.succeed(TUILoader, TUILoader.of({ load: () => Effect.succeed(tuiModule) }));

// Helper to mock child process
const mockChildProcess = (exitCode: number, stdout = "", stderr = "", error: Error | null = null) => {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  
  (spawn as any).mockImplementation(() => {
    return child;
  });
  
  // Use a delay to ensure listeners are definitely attached
  setTimeout(() => {
    if (error) {
      child.emit("error", error);
    } else {
      if (stdout) {
        child.stdout.emit("data", Buffer.from(stdout));
      }
      if (stderr) {
        child.stderr.emit("data", Buffer.from(stderr));
      }
      // Small delay before exit
      setTimeout(() => {
        child.emit("exit", exitCode);
      }, 10);
    }
  }, 20);
  
  return child;
};

// --- Tests ---

describe("Execution Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("executeScriptCapture", () => {
    it("should capture stdout on success", async () => {
      mockChildProcess(0, "success output");
      
      const program = Execution.executeScriptCapture("test-script.ts").pipe(
        Effect.provide(Execution.Default),
        Effect.provide(makeMockTUILoader(null))
      );
      
      const result = await Effect.runPromise(program);
      expect(result).toBe("success output");
    });

    it("should include stderr in error on failure", async () => {
      mockChildProcess(1, "", "error output");
      
      const program = Execution.executeScriptCapture("test-script.ts").pipe(
        Effect.provide(Execution.Default),
        Effect.provide(makeMockTUILoader(null))
      );
      
      const exit = await Effect.runPromiseExit(program);
      if (Exit.isFailure(exit)) {
        const err = exit.cause._tag === "Fail" ? exit.cause.error : (exit.cause as any);
        expect(err.message).toContain("exited with code 1");
        expect(err.scriptOutput).toBe("error output");
      } else {
        expect(true).toBe(false); // Should have failed
      }
    });

    it("should handle spawn errors", async () => {
      mockChildProcess(0, "", "", new Error("Spawn failed"));
      
      const program = Execution.executeScriptCapture("test-script.ts").pipe(
        Effect.provide(Execution.Default),
        Effect.provide(makeMockTUILoader(null))
      );
      
      await expect(Effect.runPromise(program)).rejects.toThrow("Spawn failed");
    });
  });

  describe("executeScriptStream", () => {
    it("should succeed when script exits with 0", async () => {
      mockChildProcess(0);
      
      const program = Execution.executeScriptStream("test-script.ts").pipe(
        Effect.provide(Execution.Default),
        Effect.provide(makeMockTUILoader(null))
      );
      
      await expect(Effect.runPromise(program)).resolves.toBeUndefined();
    });

    it("should fail when script exits with non-zero", async () => {
      mockChildProcess(2);
      
      const program = Execution.executeScriptStream("test-script.ts").pipe(
        Effect.provide(Execution.Default),
        Effect.provide(makeMockTUILoader(null))
      );
      
      await expect(Effect.runPromise(program)).rejects.toThrow(/exited with code 2/);
    });
  });

  describe("executeScriptWithTUI", () => {
    it("should fallback to console when TUI is not available", async () => {
      mockChildProcess(0);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const program = Execution.executeScriptWithTUI("test-script.ts", "Task").pipe(
        Effect.provide(Execution.Default),
        Effect.provide(makeMockTUILoader(null))
      );
      
      await Effect.runPromise(program);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Task"));
    });

    it("should handle script failure in TUI fallback path", async () => {
      mockChildProcess(1, "some output");
      vi.spyOn(console, "log").mockImplementation(() => {});
      
      const program = Execution.executeScriptWithTUI("test-script.ts", "Task").pipe(
        Effect.provide(Execution.Default),
        Effect.provide(makeMockTUILoader(null))
      );
      
      const exit = await Effect.runPromiseExit(program);
      if (Exit.isFailure(exit)) {
        const err = exit.cause._tag === "Fail" ? exit.cause.error : (exit.cause as any);
        expect(err.message).toContain("exited with code 1");
        expect(err.scriptOutput).toBe("some output");
      } else {
        expect(true).toBe(false);
      }
    });

    it("should use TUI spinner when available", async () => {
      mockChildProcess(0);
      class MockInkTag extends Context.Tag("MockInkTag")<MockInkTag, {}>() {}
      const spinnerSpy = vi.fn().mockReturnValue(Effect.void);
      
      const tuiModule = {
        InkService: MockInkTag,
        spinnerEffect: spinnerSpy
      };

      const program = Execution.executeScriptWithTUI("test-script.ts", "TUI Task").pipe(
        Effect.provide(Execution.Default),
        Effect.provide(makeMockTUILoader(tuiModule)),
        Effect.provideService(MockInkTag, {})
      );
      
      await Effect.runPromise(program);
      expect(spinnerSpy).toHaveBeenCalled();
    });
  });

  describe("withSpinner", () => {
    it("should wrap an effect with progress messages", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const program = Execution.withSpinner("Spinning", Effect.succeed("Done")).pipe(
        Effect.provide(Execution.Default),
        Effect.provide(makeMockTUILoader(null))
      );
      
      const result = await Effect.runPromise(program);
      expect(result).toBe("Done");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Spinning"));
    });
  });
});
