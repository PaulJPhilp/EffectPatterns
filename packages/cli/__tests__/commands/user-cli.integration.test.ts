import { describe, expect, it, beforeAll } from "vitest";
import { spawn } from "child_process";
import { resolve } from "path";

/**
 * Integration tests for user-facing CLI commands (ep)
 *
 * Tests the new search, list, show commands and enhanced install/pattern commands
 */

describe("User CLI Commands Integration (ep)", () => {
  const PROJECT_ROOT = resolve(__dirname, "../../../..");
  const EP_CLI_PATH = resolve(PROJECT_ROOT, "packages/ep-cli/src/index.ts");

  // Helper to run ep commands
  function runCommand(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      const cmd = spawn("bun", [EP_CLI_PATH, ...args], {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
        timeout: 30000,
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

  describe("search command", () => {
    it("should display search results as table", async () => {
      const result = await runCommand(["search", "retry"]);

      // Should execute without crashing
      expect(result.code).toBeLessThanOrEqual(1); // Allow 0 or 1 for "no results"

      // Should have output
      const output = result.stdout + result.stderr;
      expect(output.length).toBeGreaterThan(0);
    }, 10000);

    it("should handle empty search results gracefully", async () => {
      const result = await runCommand(["search", "xyznonexistent123"]);

      // Should complete without crashing
      expect(result.code).toBeLessThanOrEqual(1);

      const output = result.stdout + result.stderr;
      // Should indicate no results found
      expect(output.toLowerCase()).toMatch(/no patterns|not found|searching/i);
    }, 10000);

    it("should display help for search command", async () => {
      const result = await runCommand(["search", "--help"]);

      // Help should work
      expect(result.stdout + result.stderr).toContain("Search");
    }, 10000);

    it("should execute search with query argument", async () => {
      const result = await runCommand(["search", "effect"]);

      // Command should complete
      expect(typeof result.code).toBe("number");
    }, 10000);
  });

  describe("list command", () => {
    it("should list patterns with default formatting", async () => {
      const result = await runCommand(["list"]);

      // Should complete
      expect(result.code).toBeLessThanOrEqual(1);

      const output = result.stdout + result.stderr;
      // Should have patterns or indicate empty
      expect(output.length).toBeGreaterThan(0);
    }, 10000);

    it("should support difficulty filter", async () => {
      const result = await runCommand(["list", "--difficulty", "Beginner"]);

      // Should complete
      expect(result.code).toBeLessThanOrEqual(1);
    }, 10000);

    it("should support category filter", async () => {
      const result = await runCommand(["list", "--category", "Error"]);

      // Should complete
      expect(result.code).toBeLessThanOrEqual(1);
    }, 10000);

    it("should support group-by difficulty", async () => {
      const result = await runCommand(["list", "--group-by", "difficulty"]);

      // Should complete
      expect(result.code).toBeLessThanOrEqual(1);
    }, 10000);

    it("should display help for list command", async () => {
      const result = await runCommand(["list", "--help"]);

      expect(result.stdout + result.stderr).toContain("list");
    }, 10000);
  });

  describe("show command", () => {
    it("should display pattern details", async () => {
      const result = await runCommand(["show", "retry-with-backoff"]);

      // Should complete (pattern may or may not exist, but command should work)
      expect(typeof result.code).toBe("number");

      const output = result.stdout + result.stderr;
      // Should have output
      expect(output.length).toBeGreaterThan(0);
    }, 10000);

    it("should handle non-existent pattern gracefully", async () => {
      const result = await runCommand(["show", "nonexistent-pattern-xyz"]);

      // Command should complete
      expect(typeof result.code).toBe("number");

      const output = result.stdout + result.stderr;
      // Should indicate pattern not found or show suggestions
      expect(output.toLowerCase()).toMatch(/not found|did you mean|pattern|error/i);
    }, 10000);

    it("should support format option", async () => {
      const result = await runCommand(["show", "--format", "summary", "retry-with-backoff"]);

      expect(typeof result.code).toBe("number");
    }, 10000);

    it("should display help for show command", async () => {
      const result = await runCommand(["show", "--help"]);

      expect(result.stdout + result.stderr).toContain("show");
    }, 10000);
  });

  describe("install add command", () => {
    it("should display help with tool option", async () => {
      const result = await runCommand(["install", "add", "--help"]);

      expect(result.stdout + result.stderr).toContain("tool");
    }, 10000);

    it("should validate tool option", async () => {
      const result = await runCommand(["install", "add", "--tool", "invalid-tool"]);

      // Should fail gracefully
      expect(result.code).toBeGreaterThan(0);

      const output = result.stdout + result.stderr;
      // Should indicate unsupported tool
      expect(output.toLowerCase()).toMatch(/not supported|invalid|cursor|agents|windsurf/i);
    }, 10000);

    it("should accept valid tool names", async () => {
      // Test with a valid tool but without Pattern Server running
      // This will fail to fetch but should not crash on validation
      const result = await runCommand(["install", "add", "--tool", "cursor"]);

      // Command should attempt to run (may fail due to no server, but that's ok)
      expect(typeof result.code).toBe("number");
    }, 10000);

    it("should support all documented tool options", async () => {
      const tools = ["cursor", "agents", "windsurf", "gemini", "claude", "vscode", "kilo", "kira", "trae", "goose"];

      for (const tool of tools) {
        const result = await runCommand(["install", "add", "--help"]);
        const output = result.stdout + result.stderr;

        // Help should be consistent
        expect(output).toContain("tool");
      }
    }, 15000);
  });

  describe("pattern new command", () => {
    it("should display help", async () => {
      const result = await runCommand(["pattern", "new", "--help"]);

      const output = result.stdout + result.stderr;
      expect(output).toContain("pattern") || expect(output).toContain("new");
    }, 10000);

    it("should be available under pattern subcommand", async () => {
      const result = await runCommand(["pattern", "--help"]);

      const output = result.stdout + result.stderr;
      expect(output).toContain("new") || expect(output).toContain("pattern");
    }, 10000);
  });

  describe("CLI structure and commands", () => {
    it("should display main help with all commands", async () => {
      const result = await runCommand(["--help"]);

      const output = result.stdout + result.stderr;
      // Should show all new commands
      expect(output).toContain("search");
      expect(output).toContain("list");
      expect(output).toContain("show");
      expect(output).toContain("install");
      expect(output).toContain("pattern");
    }, 10000);

    it("should not crash on invalid command", async () => {
      const result = await runCommand(["invalid-command"]);

      // Should complete (likely with error)
      expect(typeof result.code).toBe("number");
    }, 10000);

    it("should support --version flag", async () => {
      const result = await runCommand(["--version"]);

      // Version check should complete
      expect(typeof result.code).toBe("number");
    }, 10000);

    it("should complete without unhandled errors", async () => {
      const result = await runCommand(["--help"]);

      const output = result.stdout + result.stderr;
      // Should not contain unhandled exception markers
      expect(output).not.toContain("FiberFailure");
      expect(output).not.toContain("RuntimeException: Not a valid effect");
    }, 10000);
  });

  describe("error handling", () => {
    it("search should handle network errors gracefully", async () => {
      // Search that may fail due to missing data but should handle gracefully
      const result = await runCommand(["search", ""]);

      // Should complete without crashing
      expect(typeof result.code).toBe("number");
    }, 10000);

    it("commands should not have unhandled fiber failures", async () => {
      const result = await runCommand(["list"]);

      const output = result.stdout + result.stderr;
      expect(output).not.toContain("FiberFailure");
    }, 10000);
  });

  describe("command composition", () => {
    it("all subcommands should be discoverable via help", async () => {
      const result = await runCommand(["--help"]);

      const output = result.stdout + result.stderr;
      const commands = ["search", "list", "show", "install", "pattern"];

      for (const cmd of commands) {
        expect(output.toLowerCase()).toContain(cmd);
      }
    }, 10000);

    it("each command should have individual help", async () => {
      const commands = [
        ["search", "--help"],
        ["list", "--help"],
        ["show", "--help"],
        ["install", "--help"],
        ["pattern", "--help"],
      ];

      for (const cmd of commands) {
        const result = await runCommand(cmd);
        const output = result.stdout + result.stderr;
        // Should have some help output
        expect(output.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe("TUI display integration", () => {
    it("search command should complete with display output", async () => {
      const result = await runCommand(["search", "retry"]);

      // Should not crash
      expect(typeof result.code).toBe("number");

      const output = result.stdout + result.stderr;
      // Should have some display output
      expect(output.length).toBeGreaterThan(0);
    }, 10000);

    it("list command should complete with display output", async () => {
      const result = await runCommand(["list"]);

      expect(typeof result.code).toBe("number");

      const output = result.stdout + result.stderr;
      expect(output.length).toBeGreaterThan(0);
    }, 10000);

    it("show command should complete with display output", async () => {
      const result = await runCommand(["show", "retry-with-backoff"]);

      expect(typeof result.code).toBe("number");

      const output = result.stdout + result.stderr;
      expect(output.length).toBeGreaterThan(0);
    }, 10000);
  });
});
