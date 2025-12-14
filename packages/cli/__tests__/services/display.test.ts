import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer, Context } from "effect";
import {
  showSuccess,
  showError,
  showInfo,
  showWarning,
  showPanel,
  showTable,
  showHighlight,
  showSeparator,
} from "../../src/services/display";

// Mock DisplayService that we can control in tests
const MockDisplayService = Context.Tag<{ isMocked: true }>();

describe("Display Service", () => {
  describe("when DisplayService is not available (console fallback)", () => {
    let consoleLogs: string[] = [];
    let consoleErrors: string[] = [];

    beforeEach(() => {
      consoleLogs = [];
      consoleErrors = [];

      // Mock console.log and console.error
      vi.spyOn(console, "log").mockImplementation((msg: string) => {
        consoleLogs.push(msg);
      });
      vi.spyOn(console, "error").mockImplementation((msg: string) => {
        consoleErrors.push(msg);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      consoleLogs = [];
      consoleErrors = [];
    });

    it("showSuccess displays message with ✓ prefix", async () => {
      const effect = showSuccess("Operation successful");
      const result = await Effect.runPromise(effect);

      expect(result).toBeUndefined();
      expect(consoleLogs.some((log) => log.includes("✓"))).toBe(true);
      expect(consoleLogs.some((log) => log.includes("Operation successful"))).toBe(true);
    });

    it("showError displays message with ✖ prefix", async () => {
      const effect = showError("Operation failed");
      const result = await Effect.runPromise(effect);

      expect(result).toBeUndefined();
      expect(consoleErrors.some((log) => log.includes("✖"))).toBe(true);
      expect(consoleErrors.some((log) => log.includes("Operation failed"))).toBe(true);
    });

    it("showInfo displays message with ℹ prefix", async () => {
      const effect = showInfo("Information message");
      const result = await Effect.runPromise(effect);

      expect(result).toBeUndefined();
      expect(consoleLogs.some((log) => log.includes("ℹ"))).toBe(true);
      expect(consoleLogs.some((log) => log.includes("Information message"))).toBe(true);
    });

    it("showWarning displays message with ⚠ prefix", async () => {
      const effect = showWarning("Warning message");
      const result = await Effect.runPromise(effect);

      expect(result).toBeUndefined();
      expect(consoleLogs.some((log) => log.includes("⚠"))).toBe(true);
      expect(consoleLogs.some((log) => log.includes("Warning message"))).toBe(true);
    });

    it("showPanel displays content in a bordered box", async () => {
      const effect = showPanel("Test content", "Test Title");
      const result = await Effect.runPromise(effect);

      expect(result).toBeUndefined();
      expect(consoleLogs.some((log) => log.includes("─"))).toBe(true);
      expect(consoleLogs.some((log) => log.includes("Test Title"))).toBe(true);
      expect(consoleLogs.some((log) => log.includes("Test content"))).toBe(true);
    });

    it("showPanel respects panel type option", async () => {
      const effect = showPanel("Error details", "Error", { type: "error" });
      const result = await Effect.runPromise(effect);

      expect(result).toBeUndefined();
      expect(consoleLogs.some((log) => log.includes("Error"))).toBe(true);
    });

    it("showTable displays using console.table", async () => {
      const tableData = [
        { name: "Pattern 1", status: "published" },
        { name: "Pattern 2", status: "draft" },
      ];

      const mockTable = vi.spyOn(console, "table");
      const effect = showTable(tableData, {
        columns: [
          { key: "name", header: "Name" },
          { key: "status", header: "Status" },
        ],
      });

      const result = await Effect.runPromise(effect);

      expect(result).toBeUndefined();
      expect(mockTable).toHaveBeenCalled();

      mockTable.mockRestore();
    });

    it("showHighlight displays message with 📌 prefix", async () => {
      const effect = showHighlight("Important note");
      const result = await Effect.runPromise(effect);

      expect(result).toBeUndefined();
      expect(consoleLogs.some((log) => log.includes("📌"))).toBe(true);
      expect(consoleLogs.some((log) => log.includes("Important note"))).toBe(true);
    });

    it("showSeparator displays a line of dashes", async () => {
      const effect = showSeparator();
      const result = await Effect.runPromise(effect);

      expect(result).toBeUndefined();
      expect(consoleLogs.some((log) => log.includes("─"))).toBe(true);
    });
  });

  describe("multiple display calls", () => {
    let consoleLogs: string[] = [];

    beforeEach(() => {
      consoleLogs = [];
      vi.spyOn(console, "log").mockImplementation((msg: string) => {
        consoleLogs.push(msg);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      consoleLogs = [];
    });

    it("chains multiple display calls correctly", async () => {
      const effect = Effect.gen(function* () {
        yield* showInfo("Starting");
        yield* showSuccess("Completed");
        yield* showSeparator();
      });

      await Effect.runPromise(effect);

      expect(consoleLogs.length).toBeGreaterThanOrEqual(3);
      expect(consoleLogs.some((log) => log.includes("ℹ"))).toBe(true);
      expect(consoleLogs.some((log) => log.includes("✓"))).toBe(true);
      expect(consoleLogs.some((log) => log.includes("─"))).toBe(true);
    });
  });

  describe("edge cases", () => {
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

    it("handles empty strings gracefully", async () => {
      const effect = showSuccess("");
      await Effect.runPromise(effect);

      expect(consoleLogs.length).toBeGreaterThan(0);
    });

    it("handles very long messages", async () => {
      const longMessage = "a".repeat(500);
      const effect = showSuccess(longMessage);
      await Effect.runPromise(effect);

      expect(consoleLogs.some((log) => log.includes("a"))).toBe(true);
    });

    it("handles special characters in messages", async () => {
      const specialMessage = "Message with special chars: !@#$%^&*()";
      const effect = showSuccess(specialMessage);
      await Effect.runPromise(effect);

      expect(consoleLogs.some((log) => log.includes(specialMessage))).toBe(true);
    });

    it("handles newlines in panel content", async () => {
      const multilineContent = "Line 1\nLine 2\nLine 3";
      const effect = showPanel(multilineContent, "Multiline");
      await Effect.runPromise(effect);

      expect(consoleLogs.some((log) => log.includes("Line 1"))).toBe(true);
    });

    it("handles empty table data", async () => {
      const mockTable = vi.spyOn(console, "table");
      const effect = showTable([], {
        columns: [{ key: "name" as const, header: "Name" }],
      });

      await Effect.runPromise(effect);

      expect(mockTable).toHaveBeenCalled();
      mockTable.mockRestore();
    });
  });
});
