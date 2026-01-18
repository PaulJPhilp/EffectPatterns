/**
 * Database Utilities Tests
 */

import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { closeDatabaseSafely } from "../database.js";

describe("Database Utils", () => {
  describe("closeDatabaseSafely", () => {
    it("should close database when close method exists", async () => {
      const mockDb = {
        close: vi.fn(),
      };

      const effect = closeDatabaseSafely(mockDb);
      const result = await Effect.runPromise(effect);

      expect(mockDb.close).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("should handle null database", async () => {
      const effect = closeDatabaseSafely(null);
      const result = await Effect.runPromise(effect);
      expect(result).toBeUndefined();
    });

    it("should handle undefined database", async () => {
      const effect = closeDatabaseSafely(undefined);
      const result = await Effect.runPromise(effect);
      expect(result).toBeUndefined();
    });

    it("should not throw when database has no close method", async () => {
      const mockDb = {};
      const effect = closeDatabaseSafely(mockDb);
      const result = await Effect.runPromise(effect);
      expect(result).toBeUndefined();
    });

    it("should handle database close errors", async () => {
      const closeError = new Error("Close failed");
      const mockDb = {
        close: vi.fn(() => {
          throw closeError;
        }),
      };

      const effect = closeDatabaseSafely(mockDb);

      try {
        await Effect.runPromise(effect);
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        expect(error.message).toContain("Failed to close database");
      }
    });

    it("should call close method without arguments", async () => {
      const mockDb = {
        close: vi.fn(),
      };

      const effect = closeDatabaseSafely(mockDb);
      await Effect.runPromise(effect);

      expect(mockDb.close).toHaveBeenCalledWith();
    });

    it("should handle multiple database objects independently", async () => {
      const mockDb1 = { close: vi.fn() };
      const mockDb2 = { close: vi.fn() };

      await Effect.runPromise(closeDatabaseSafely(mockDb1));
      await Effect.runPromise(closeDatabaseSafely(mockDb2));

      expect(mockDb1.close).toHaveBeenCalledTimes(1);
      expect(mockDb2.close).toHaveBeenCalledTimes(1);
    });

    it("should handle object with non-function close property", async () => {
      const mockDb = {
        close: "not a function",
      };

      const effect = closeDatabaseSafely(mockDb);
      const result = await Effect.runPromise(effect);
      expect(result).toBeUndefined();
    });
  });
});
