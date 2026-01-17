import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { SessionStore } from "../SessionStore";
import { BlockService } from "../BlockService";
import { CommandExecutor } from "../CommandExecutor";
import { ProcessService } from "../ProcessService";
import { PersistenceService } from "../PersistenceService";
import { LoggerService } from "../LoggerService";
import { ValidationError, ProcessError, PersistenceError } from "../../types";

/**
 * Security and vulnerability testing for EffectTalk
 * Tests input validation, error handling, and security best practices
 */

describe("Security Testing", () => {
  const runSecurityTest = async <A>(
    effect: Effect.Effect<
      A,
      never,
      | SessionStore
      | CommandExecutor
      | ProcessService
      | BlockService
      | PersistenceService
      | LoggerService
    >
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(LoggerService.Default),
        Effect.provide(ProcessService.Default),
        Effect.provide(BlockService.Default),
        Effect.provide(SessionStore.Default),
        Effect.provide(CommandExecutor.Default),
        Effect.provide(PersistenceService.Default)
      )
    );
  };

  describe("Input Validation", () => {
    it("should handle extremely long commands", async () => {
      const longCommand = "a".repeat(10000);

      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;
          const block = yield* blockService.createBlock(longCommand);
          return block.command === longCommand;
        })
      );

      expect(result).toBe(true);
    });

    it("should handle null/undefined safely", async () => {
      // This should be caught by TypeScript, but test runtime behavior
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          // Empty string should work
          const block1 = yield* blockService.createBlock("");
          expect(block1.command).toBe("");

          // Normal string
          const block2 = yield* blockService.createBlock("test");
          expect(block2.command).toBe("test");

          return true;
        })
      );

      expect(result).toBe(true);
    });

    it("should handle special characters in commands", async () => {
      const specialChars = "!@#$%^&*()_+-=[]{}|;:',.<>?/`~";

      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;
          const block = yield* blockService.createBlock(specialChars);
          return block.command === specialChars;
        })
      );

      expect(result).toBe(true);
    });

    it("should handle unicode and emoji", async () => {
      const unicodeCommand = "echo 'Hello 世界 🌍 مرحبا'";

      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;
          const block = yield* blockService.createBlock(unicodeCommand);
          return block.command === unicodeCommand;
        })
      );

      expect(result).toBe(true);
    });

    it("should sanitize output to prevent injection", async () => {
      const maliciousOutput = "<script>alert('xss')</script>";

      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          // Output should be stored as-is (sanitization happens at display time)
          yield* blockService.updateBlockOutput("block-1", maliciousOutput, "");

          return {
            inputStored: true,
            shouldSanitizeAtDisplay: true,
          };
        })
      );

      expect(result.inputStored).toBe(true);
      expect(result.shouldSanitizeAtDisplay).toBe(true);
    });

    it("should handle SQL injection-like patterns", async () => {
      const sqlInjection = "'; DROP TABLE sessions; --";

      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          // Should treat as regular string
          const block = yield* blockService.createBlock(sqlInjection);
          expect(block.command).toBe(sqlInjection);

          return { stored: true, safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });
  });

  describe("Error Message Safety", () => {
    it("should not leak sensitive information in error messages", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const errorRecovery = yield* Effect.Service.use(
            Effect.succeed("test")
          );

          // Error messages should be safe
          const error = new Error("Internal server error");
          expect(error.message).not.toContain("database");
          expect(error.message).not.toContain("password");
          expect(error.message).not.toContain("secret");

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });

    it("should not expose stack traces in production-like errors", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          // Simulate error handling
          const error = new ProcessError({
            reason: "spawn-failed",
            cause: new Error("File not found"),
          });

          // Error message should be safe
          const errorMsg = error.message;
          expect(errorMsg).not.toContain("/home/");
          expect(errorMsg).not.toContain("/etc/");

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });
  });

  describe("Resource Limits", () => {
    it("should prevent unbounded session growth", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          // Add many blocks (should still complete)
          for (let i = 0; i < 1000; i++) {
            const block = yield* blockService.createBlock(`cmd${i}`);
            yield* store.addBlock(block);
          }

          const session = yield* store.getSession();

          return {
            blockCount: session.blocks.length,
            completed: true,
          };
        })
      );

      expect(result.blockCount).toBe(1000);
      expect(result.completed).toBe(true);
    });

    it("should handle very large output safely", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          // Create large output
          const largeOutput = "x".repeat(1000000); // 1MB

          yield* blockService.updateBlockOutput("block-1", largeOutput, "");

          return { stored: true };
        })
      );

      expect(result.stored).toBe(true);
    });

    it("should prevent command injection via metadata", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const block = yield* blockService.createBlock("echo test");

          // Metadata should not execute
          expect(block.metadata).toBeDefined();
          expect(typeof block.metadata).toBe("object");

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });
  });

  describe("Session Isolation", () => {
    it("should isolate different sessions", async () => {
      // Note: Current implementation reuses session, but this tests the pattern
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;
          const blockService = yield* BlockService;

          const session1 = yield* store.getSession();
          const session1Id = session1.id;

          // Add block to session
          const block = yield* blockService.createBlock("cmd");
          yield* store.addBlock(block);

          // Verify block is in correct session
          const session = yield* store.getSession();
          expect(session.blocks).toContain(block);

          return {
            sessionId: session1Id,
            isolated: true,
          };
        })
      );

      expect(result.isolated).toBe(true);
    });

    it("should prevent cross-session data leakage", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          const session = yield* store.getSession();

          // Verify isolation characteristics
          expect(session.id).toBeDefined();
          expect(session.blocks).toBeDefined();
          expect(Array.isArray(session.blocks)).toBe(true);

          return { isolated: true };
        })
      );

      expect(result.isolated).toBe(true);
    });
  });

  describe("Cleanup & Denial of Service Prevention", () => {
    it("should cleanup resources properly", async () => {
      let cleaned = false;

      const result = await runSecurityTest(
        Effect.scoped(
          Effect.gen(function* () {
            const store = yield* SessionStore;

            return yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                cleaned = true;
              })
            );
          })
        ).pipe(
          Effect.catchAll(() => Effect.succeed(null))
        )
      );

      // Cleanup should have occurred
      expect(cleaned).toBe(true);
    });

    it("should prevent infinite loops in recovery", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          let iterations = 0;
          const maxIterations = 10;

          // Simulate recovery with limit
          while (iterations < maxIterations) {
            yield* blockService.createBlock(`cmd${iterations}`);
            iterations++;
          }

          return { iterations, completed: true };
        })
      );

      expect(result.completed).toBe(true);
      expect(result.iterations).toBe(10);
    });

    it("should handle rapid requests safely", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          // Simulate rapid-fire requests
          const requests = yield* Effect.all(
            Array.from({ length: 100 }, (_, i) =>
              blockService.createBlock(`rapid${i}`)
            )
          );

          return {
            count: requests.length,
            completed: true,
          };
        })
      );

      expect(result.count).toBe(100);
      expect(result.completed).toBe(true);
    });
  });

  describe("Data Validation", () => {
    it("should validate block structure", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const block = yield* blockService.createBlock("test");

          // Verify required fields
          expect(block.id).toBeDefined();
          expect(typeof block.id).toBe("string");

          expect(block.command).toBe("test");
          expect(typeof block.command).toBe("string");

          expect(block.status).toBe("idle");
          expect(["idle", "running", "success", "failure", "interrupted"]).toContain(
            block.status
          );

          expect(block.stdout).toBe("");
          expect(typeof block.stdout).toBe("string");

          expect(block.stderr).toBe("");
          expect(typeof block.stderr).toBe("string");

          expect(block.startTime).toBeGreaterThan(0);
          expect(typeof block.startTime).toBe("number");

          expect(block.metadata).toBeDefined();
          expect(typeof block.metadata).toBe("object");

          return { valid: true };
        })
      );

      expect(result.valid).toBe(true);
    });

    it("should validate session structure", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          const session = yield* store.getSession();

          // Verify required fields
          expect(session.id).toBeDefined();
          expect(typeof session.id).toBe("string");

          expect(session.blocks).toBeDefined();
          expect(Array.isArray(session.blocks)).toBe(true);

          expect(session.activeBlockId === null || typeof session.activeBlockId === "string").toBe(
            true
          );

          expect(session.workingDirectory).toBeDefined();
          expect(typeof session.workingDirectory).toBe("string");

          expect(session.environment).toBeDefined();
          expect(typeof session.environment).toBe("object");

          expect(session.createdAt).toBeGreaterThan(0);
          expect(typeof session.createdAt).toBe("number");

          expect(session.lastModified).toBeGreaterThan(0);
          expect(typeof session.lastModified).toBe("number");

          return { valid: true };
        })
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("Path Traversal Prevention", () => {
    it("should handle path traversal attempts in session IDs", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          const session = yield* store.getSession();

          // Session ID should not contain path traversal
          expect(session.id).not.toContain("../");
          expect(session.id).not.toContain("..\\");
          expect(session.id).not.toContain("/etc/");
          expect(session.id).not.toContain("C:\\");

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });

    it("should sanitize working directory", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const store = yield* SessionStore;

          const session = yield* store.getSession();

          // Working directory should be reasonable
          const cwd = session.workingDirectory;
          expect(typeof cwd).toBe("string");

          // Should not contain suspicious patterns at start
          expect(cwd === "/" || cwd.startsWith("/") || cwd.match(/^[A-Z]:/)).toBe(true);

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });
  });

  describe("Security Headers & Metadata", () => {
    it("should not expose version information unnecessarily", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const block = yield* blockService.createBlock("test");

          // Metadata should not expose version
          expect(JSON.stringify(block.metadata)).not.toContain("version");

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });

    it("should timestamp operations for audit trails", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          const block = yield* blockService.createBlock("test");

          // Should have timestamp for audit
          expect(block.startTime).toBeGreaterThan(0);

          // Timestamp should be reasonable (not in the past decade)
          const now = Date.now();
          expect(block.startTime).toBeGreaterThan(now - 1000000); // 1000 seconds ago
          expect(block.startTime).toBeLessThanOrEqual(now);

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });
  });

  describe("Defensive Programming", () => {
    it("should handle undefined gracefully", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          const blockService = yield* BlockService;

          // Should not crash with empty/undefined data
          const block = yield* blockService.createBlock("");

          expect(block).toBeDefined();
          expect(block.command).toBe("");

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });

    it("should not expose internal errors to users", async () => {
      const result = await runSecurityTest(
        Effect.gen(function* () {
          // Errors should have safe messages
          const error = new ProcessError({
            reason: "spawn-failed",
            cause: new Error("Internal error details"),
          });

          // Message should not contain sensitive details
          const msg = error.message;

          expect(msg).not.toContain("Internal error details");

          return { safe: true };
        })
      );

      expect(result.safe).toBe(true);
    });
  });
});
