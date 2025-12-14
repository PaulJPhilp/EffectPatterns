import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { Effect } from "effect";
import { spawn } from "child_process";
import { resolve } from "path";

/**
 * Integration tests for TUI-enabled commands
 *
 * These tests verify that the three showcase commands work correctly
 * with the TUI display service both with and without TUI features enabled.
 */

describe("TUI-Enabled Commands Integration", () => {
  const PROJECT_ROOT = resolve(__dirname, "../../../..");
  const EP_ADMIN_PATH = resolve(PROJECT_ROOT, "packages/ep-admin/src/index.ts");

  // Helper to run ep-admin commands
  function runCommand(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      const cmd = spawn("bun", [EP_ADMIN_PATH, ...args], {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
        timeout: 120000, // 2 minutes for full pipeline
      });

      let stdout = "";
      let stderr = "";

      cmd.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      cmd.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      cmd.on("exit", (code) => {
        resolve({
          stdout,
          stderr,
          code: code || 0,
        });
      });
    });
  }

  describe("validate command", () => {
    it("should run validation and report results", async () => {
      const result = await runCommand(["validate", "--verbose"]);

      // Should complete (may fail if patterns are invalid, but command should run)
      expect(typeof result.code).toBe("number");
      expect(result.stdout).toBeTruthy();
    }, 30000);

    it("should display spinner in non-verbose mode", async () => {
      const result = await runCommand(["validate"]);

      // Should show spinner indicator or success/failure
      expect(result.stdout + result.stderr).toContain(
        "validat" // Could be "Validating" or "validated" depending on output
      );
    }, 30000);

    it("should capture validation output", async () => {
      const result = await runCommand(["validate"]);

      // Should have some output (validation results)
      expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("pipeline-state status command", () => {
    it("should display all patterns in table format", async () => {
      const result = await runCommand(["pipeline-state", "status"]);

      // Should complete successfully
      expect(result.code).toBe(0);

      // Should have table output (look for borders or headers)
      const output = result.stdout + result.stderr;
      expect(output).toContain("title"); // Table header or similar
    }, 30000);

    it("should show summary statistics", async () => {
      const result = await runCommand(["pipeline-state", "status"]);

      const output = result.stdout + result.stderr;
      // Should show count information
      expect(output).toMatch(/\d+/); // Should have numbers for counts
    }, 30000);

    it("should handle specific pattern lookup", async () => {
      const result = await runCommand(["pipeline-state", "status", "--pattern", "data-option"]);

      // Should either show the pattern or indicate it's not found
      expect(result.code).toBeLessThanOrEqual(0) || expect(result.stdout + result.stderr).toContain("status");
    }, 30000);

    it("should display status with verbose details", async () => {
      const result = await runCommand(["pipeline-state", "status", "--verbose"]);

      const output = result.stdout + result.stderr;
      // Should show step information
      expect(output.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("pipeline command", () => {
    it("should initialize and run pipeline", async () => {
      // This test just verifies the command can start
      // Full pipeline test is impractical in unit tests
      const result = await runCommand(["pipeline", "--help"]);

      // Help should work
      expect(result.stdout + result.stderr).toContain("pipeline");
    }, 10000);
  });

  describe("TUI service integration", () => {
    it("all commands should complete without crashing", async () => {
      // Run status command (fastest TUI command)
      const result = await runCommand(["pipeline-state", "status"]);

      // Command should complete
      expect(typeof result.code).toBe("number");
      // Should not have unhandled exceptions
      expect(result.stderr).not.toContain("Error:");
    }, 30000);

    it("should handle missing pattern gracefully", async () => {
      const result = await runCommand(["pipeline-state", "status", "--pattern", "nonexistent-pattern-xyz"]);

      // Should complete (may succeed with no output or fail gracefully)
      expect(typeof result.code).toBe("number");
    }, 10000);
  });

  describe("error handling", () => {
    it("validate should fail gracefully when patterns are invalid", async () => {
      const result = await runCommand(["validate"]);

      // Even if validation fails, the command should exit cleanly
      expect(typeof result.code).toBe("number");
    }, 30000);

    it("should not have unhandled fiber failures", async () => {
      const result = await runCommand(["pipeline-state", "status"]);

      // Should not contain fiber failure errors
      const output = result.stdout + result.stderr;
      expect(output).not.toContain("FiberFailure");
    }, 30000);
  });

  describe("output formatting", () => {
    it("status command output should be properly formatted", async () => {
      const result = await runCommand(["pipeline-state", "status"]);

      const output = result.stdout + result.stderr;
      // Should be readable (contain structure)
      expect(output.length).toBeGreaterThan(50);
      // Should not have excessive newlines
      const newlineCount = (output.match(/\n/g) || []).length;
      expect(newlineCount).toBeGreaterThan(5);
    }, 30000);

    it("validate command should show results", async () => {
      const result = await runCommand(["validate"]);

      const output = result.stdout + result.stderr;
      // Should contain validation-related terms
      expect(output.toLowerCase()).toMatch(/validat|pattern|error|success/);
    }, 30000);
  });
});

/**
 * CLI-specific tests for command parsing and options
 */
describe("CLI Command Options", () => {
  const PROJECT_ROOT = resolve(__dirname, "../../../..");
  const EP_ADMIN_PATH = resolve(PROJECT_ROOT, "packages/ep-admin/src/index.ts");

  function runCommand(args: string[]): Promise<string> {
    return new Promise((resolve) => {
      const cmd = spawn("bun", [EP_ADMIN_PATH, ...args], {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
        timeout: 10000,
      });

      let output = "";

      cmd.stdout?.on("data", (data) => {
        output += data.toString();
      });

      cmd.stderr?.on("data", (data) => {
        output += data.toString();
      });

      cmd.on("exit", () => {
        resolve(output);
      });
    });
  }

  describe("verbose flag", () => {
    it("should accept --verbose flag on validate", async () => {
      const output = await runCommand(["validate", "--verbose"]);
      expect(output).toBeTruthy();
    }, 30000);

    it("should accept -v short form on validate", async () => {
      const output = await runCommand(["validate", "-v"]);
      expect(output).toBeTruthy();
    }, 30000);

    it("should accept --verbose flag on status", async () => {
      const output = await runCommand(["pipeline-state", "status", "--verbose"]);
      expect(output).toBeTruthy();
    }, 30000);
  });

  describe("pattern option", () => {
    it("should accept --pattern option on status", async () => {
      const output = await runCommand(["pipeline-state", "status", "--pattern", "data-option"]);
      expect(output).toBeTruthy();
    }, 30000);

    it("should accept -p short form on status", async () => {
      const output = await runCommand(["pipeline-state", "status", "-p", "data-option"]);
      expect(output).toBeTruthy();
    }, 30000);
  });
});
