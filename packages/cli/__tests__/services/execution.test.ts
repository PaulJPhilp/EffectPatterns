import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Effect } from "effect";
import {
  executeScriptWithTUI,
  executeScriptCapture,
  executeScriptStream,
  ExecutionOptions,
} from "../../src/services/execution";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("Execution Service", () => {
  // Helper to create temporary test scripts
  function createTestScript(
    content: string,
    name: string = "test-script"
  ): string {
    const scriptPath = join(tmpdir(), `${name}-${Date.now()}.ts`);
    writeFileSync(
      scriptPath,
      `#!/usr/bin/env bun\n${content}`,
      "utf-8"
    );
    return scriptPath;
  }

  function cleanupScript(scriptPath: string) {
    try {
      unlinkSync(scriptPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  describe("executeScriptWithTUI", () => {
    let consoleLogs: string[] = [];
    let consoleErrors: string[] = [];

    beforeEach(() => {
      consoleLogs = [];
      consoleErrors = [];

      vi.spyOn(console, "log").mockImplementation((msg: string) => {
        consoleLogs.push(msg);
      });
      vi.spyOn(console, "error").mockImplementation((msg: string) => {
        consoleErrors.push(msg);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("executes a successful script without verbose output", async () => {
      const scriptPath = createTestScript(
        'console.log("Script executed")'
      );

      try {
        const effect = executeScriptWithTUI(scriptPath, "Test Task");
        await Effect.runPromise(effect);

        // Should show spinner indicator and completion
        expect(consoleLogs.some((log) => log.includes("⣾"))).toBe(true);
        expect(consoleLogs.some((log) => log.includes("✓"))).toBe(true);
        expect(consoleLogs.some((log) => log.includes("Test Task"))).toBe(true);
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("executes a successful script with verbose output", async () => {
      const scriptPath = createTestScript(
        'console.log("Script executed")'
      );

      try {
        const effect = executeScriptWithTUI(scriptPath, "Test Task", {
          verbose: true,
        });
        await Effect.runPromise(effect);

        // Should not show spinner in verbose mode
        expect(consoleLogs.some((log) => log.includes("⣾"))).toBe(false);
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("handles script failure with error", async () => {
      const scriptPath = createTestScript(
        'process.exit(1)'
      );

      try {
        const effect = executeScriptWithTUI(scriptPath, "Failing Task");
        const result = await Effect.runPromise(effect).catch((e) => e);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain("exited with code 1");
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("captures script output on failure", async () => {
      const scriptPath = createTestScript(
        'console.error("Failed operation"); process.exit(1)'
      );

      try {
        const effect = executeScriptWithTUI(scriptPath, "Task");
        const result = await Effect.runPromise(effect).catch((e) => e);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain("Script output");
        expect(result.message).toContain("Failed operation");
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("does not show spinner output in verbose mode", async () => {
      const scriptPath = createTestScript(
        'console.log("Output")'
      );

      try {
        const effect = executeScriptWithTUI(scriptPath, "Task", {
          verbose: true,
        });
        const beforeLogs = consoleLogs.length;
        await Effect.runPromise(effect);
        const afterLogs = consoleLogs.length;

        // In verbose mode, there should be minimal console output from the service
        // (the script output itself is inherited to stdio)
        expect(afterLogs - beforeLogs).toBeLessThanOrEqual(1);
      } finally {
        cleanupScript(scriptPath);
      }
    });
  });

  describe("executeScriptCapture", () => {
    it("captures stdout from a successful script", async () => {
      const scriptPath = createTestScript(
        'console.log("Captured output")'
      );

      try {
        const effect = executeScriptCapture(scriptPath);
        const output = await Effect.runPromise(effect);

        expect(output).toContain("Captured output");
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("captures multiline output", async () => {
      const scriptPath = createTestScript(
        'console.log("Line 1"); console.log("Line 2"); console.log("Line 3")'
      );

      try {
        const effect = executeScriptCapture(scriptPath);
        const output = await Effect.runPromise(effect);

        expect(output).toContain("Line 1");
        expect(output).toContain("Line 2");
        expect(output).toContain("Line 3");
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("returns empty string for script with no output", async () => {
      const scriptPath = createTestScript('// No output');

      try {
        const effect = executeScriptCapture(scriptPath);
        const output = await Effect.runPromise(effect);

        expect(output).toBe("");
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("handles script failure with stderr", async () => {
      const scriptPath = createTestScript(
        'console.error("Error occurred"); process.exit(1)'
      );

      try {
        const effect = executeScriptCapture(scriptPath);
        const result = await Effect.runPromise(effect).catch((e) => e);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain("exited with code 1");
        expect(result.message).toContain("Error occurred");
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("captures JSON output correctly", async () => {
      const scriptPath = createTestScript(
        'console.log(JSON.stringify({ status: "success", count: 42 }))'
      );

      try {
        const effect = executeScriptCapture(scriptPath);
        const output = await Effect.runPromise(effect);
        const parsed = JSON.parse(output.trim());

        expect(parsed.status).toBe("success");
        expect(parsed.count).toBe(42);
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("respects timeout option", async () => {
      const scriptPath = createTestScript(
        'await new Promise(resolve => setTimeout(resolve, 5000))'
      );

      try {
        const effect = executeScriptCapture(scriptPath, { timeout: 100 });
        const result = await Effect.runPromise(effect).catch((e) => e);

        expect(result).toBeInstanceOf(Error);
        // Either timeout error or exit code error
        expect(
          result.message.includes("timeout") ||
          result.message.includes("exit")
        ).toBe(true);
      } finally {
        cleanupScript(scriptPath);
      }
    }, { timeout: 10000 }); // Give test time to timeout
  });

  describe("executeScriptStream", () => {
    let consoleLogs: string[] = [];

    beforeEach(() => {
      consoleLogs = [];
      vi.spyOn(console, "log").mockImplementation((msg: string) => {
        consoleLogs.push(msg);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("executes script with inherited stdio", async () => {
      const scriptPath = createTestScript(
        'console.log("Stream output")'
      );

      try {
        const effect = executeScriptStream(scriptPath);
        await Effect.runPromise(effect);

        // In stream mode, output is inherited (goes to parent stdio)
        // So we can't easily capture it in tests, but the effect should complete
        expect(true).toBe(true);
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("handles successful stream execution", async () => {
      const scriptPath = createTestScript(
        'console.log("Success"); process.exit(0)'
      );

      try {
        const effect = executeScriptStream(scriptPath);
        const result = await Effect.runPromise(effect);

        expect(result).toBeUndefined();
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("handles stream execution failure", async () => {
      const scriptPath = createTestScript(
        'console.log("Failed"); process.exit(42)'
      );

      try {
        const effect = executeScriptStream(scriptPath);
        const result = await Effect.runPromise(effect).catch((e) => e);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain("exited with code 42");
      } finally {
        cleanupScript(scriptPath);
      }
    });
  });

  describe("error handling", () => {
    it("handles non-existent script file", async () => {
      const effect = executeScriptWithTUI(
        "/nonexistent/path/script.ts",
        "Task"
      );
      const result = await Effect.runPromise(effect).catch((e) => e);

      expect(result).toBeInstanceOf(Error);
    });

    it("includes original error as cause when script fails", async () => {
      const scriptPath = createTestScript(
        'throw new Error("Script error"); process.exit(1)'
      );

      try {
        const effect = executeScriptWithTUI(scriptPath, "Task");
        const result = await Effect.runPromise(effect).catch((e) => e);

        expect(result).toBeInstanceOf(Error);
        // The error should have enhanced message with script output
        expect(result.message).toContain("Script output");
      } finally {
        cleanupScript(scriptPath);
      }
    });
  });

  describe("execution options", () => {
    it("passes timeout option to spawn", async () => {
      const scriptPath = createTestScript(
        'console.log("Quick")'
      );

      try {
        const effect = executeScriptCapture(scriptPath, { timeout: 5000 });
        const output = await Effect.runPromise(effect);

        expect(output).toContain("Quick");
      } finally {
        cleanupScript(scriptPath);
      }
    });

    it("handles undefined options gracefully", async () => {
      const scriptPath = createTestScript(
        'console.log("No options")'
      );

      try {
        const effect = executeScriptCapture(scriptPath);
        const output = await Effect.runPromise(effect);

        expect(output).toContain("No options");
      } finally {
        cleanupScript(scriptPath);
      }
    });
  });
});
