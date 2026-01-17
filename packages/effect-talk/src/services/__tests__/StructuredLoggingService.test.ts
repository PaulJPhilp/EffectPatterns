import { describe, it, expect, beforeEach, vi } from "vitest";
import { Effect } from "effect";
import { StructuredLoggingService } from "../StructuredLoggingService";
import { LoggerService } from "../LoggerService";

/**
 * Test suite for StructuredLoggingService
 * Tests structured logging, context tracking, and performance metrics
 */

describe("StructuredLoggingService", () => {
  const runStructuredLogging = async <A>(
    effect: Effect.Effect<A, never, any>
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(LoggerService.Default),
        Effect.provide(StructuredLoggingService)
      )
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Logging", () => {
    it("should log debug messages", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.debug("Debug message");
        })
      );

      // Should complete without error
      expect(true).toBe(true);
    });

    it("should log info messages", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.info("Info message");
        })
      );

      expect(true).toBe(true);
    });

    it("should log warn messages", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.warn("Warning message");
        })
      );

      expect(true).toBe(true);
    });

    it("should log error messages", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.error("Error message", new Error("Test error"));
        })
      );

      expect(true).toBe(true);
    });

    it("should log with metadata", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.info("Message with metadata", {
            userId: "user-123",
            action: "login",
          });
        })
      );

      expect(true).toBe(true);
    });
  });

  describe("Context Management", () => {
    it("should set and get context", async () => {
      const context = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.setContext({
            sessionId: "sess-123",
            userId: "user-456",
          });
          return yield* logger.getContext();
        })
      );

      expect(context.sessionId).toBe("sess-123");
      expect(context.userId).toBe("user-456");
    });

    it("should merge context with existing", async () => {
      const context = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.setContext({ sessionId: "sess-123" });
          yield* logger.setContext({ userId: "user-456" });
          return yield* logger.getContext();
        })
      );

      expect(context.sessionId).toBe("sess-123");
      expect(context.userId).toBe("user-456");
    });

    it("should clear context", async () => {
      const context = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.setContext({ sessionId: "sess-123" });
          yield* logger.clearContext();
          return yield* logger.getContext();
        })
      );

      expect(Object.keys(context).length).toBe(0);
    });

    it("should preserve context across operations", async () => {
      const context = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;

          yield* logger.setContext({ sessionId: "sess-123" });
          yield* logger.info("First log");

          yield* logger.setContext({ userId: "user-456" });
          yield* logger.info("Second log");

          return yield* logger.getContext();
        })
      );

      expect(context.sessionId).toBe("sess-123");
      expect(context.userId).toBe("user-456");
    });
  });

  describe("Request/Response Logging", () => {
    it("should log request with requestId", async () => {
      const requestId = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          return yield* logger.logRequest("GET", "/api/sessions");
        })
      );

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe("string");
      expect(requestId.startsWith("req-")).toBe(true);
    });

    it("should log response with timing", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          const requestId = yield* logger.logRequest("POST", "/api/blocks");

          // Simulate processing
          yield* Effect.sleep(10);

          yield* logger.logResponse(requestId, 201, 10, {
            blockId: "block-123",
          });
        })
      );

      expect(true).toBe(true);
    });

    it("should request logging set operation context", async () => {
      const context = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logRequest("PUT", "/api/sessions/sess-123");
          return yield* logger.getContext();
        })
      );

      expect(context.operation).toContain("PUT");
      expect(context.operation).toContain("/api/sessions/sess-123");
    });
  });

  describe("Block Execution Logging", () => {
    it("should log block execution start", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logBlockExecution(
            "block-123",
            "echo test",
            "running"
          );
        })
      );

      expect(true).toBe(true);
    });

    it("should log block execution success", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logBlockExecution("block-123", "echo test", "success", {
            exitCode: 0,
            duration: 150,
          });
        })
      );

      expect(true).toBe(true);
    });

    it("should log block execution failure", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logBlockExecution("block-123", "bad-cmd", "failure", {
            exitCode: 127,
            error: "command not found",
          });
        })
      );

      expect(true).toBe(true);
    });
  });

  describe("Process Event Logging", () => {
    it("should log process spawn", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logProcessEvent(12345, "spawn", {
            command: "npm install",
            cwd: "/project",
          });
        })
      );

      expect(true).toBe(true);
    });

    it("should log process exit", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logProcessEvent(12345, "exit", {
            exitCode: 0,
            duration: 5000,
          });
        })
      );

      expect(true).toBe(true);
    });

    it("should log process signal", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logProcessEvent(12345, "signal", {
            signal: "SIGTERM",
          });
        })
      );

      expect(true).toBe(true);
    });

    it("should log process error", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logProcessEvent(12345, "error", {
            error: "ENOENT: command not found",
          });
        })
      );

      expect(true).toBe(true);
    });
  });

  describe("Session Logging", () => {
    it("should log session creation", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logSessionChange("sess-123", "created", {
            userId: "user-456",
          });
        })
      );

      expect(true).toBe(true);
    });

    it("should log session save", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logSessionChange("sess-123", "saved", {
            blockCount: 5,
            fileSize: 2048,
          });
        })
      );

      expect(true).toBe(true);
    });

    it("should log session restore", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logSessionChange("sess-123", "restored", {
            blockCount: 3,
          });
        })
      );

      expect(true).toBe(true);
    });
  });

  describe("Performance Tracking", () => {
    it("should track operation performance", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.trackOperation(
            "fetchSessions",
            Effect.sleep(10).pipe(
              Effect.andThen(() => Effect.succeed("sessions"))
            )
          );
        })
      );

      expect(true).toBe(true);
    });

    it("should log operation duration", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          const result = yield* logger.trackOperation(
            "saveSession",
            Effect.sleep(20).pipe(Effect.andThen(() => Effect.succeed("saved")))
          );

          expect(result).toBe("saved");
        })
      );

      expect(true).toBe(true);
    });

    it("should handle operation with error", async () => {
      const result = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;

          return yield* logger
            .trackOperation(
              "failingOperation",
              Effect.fail(new Error("Operation failed"))
            )
            .pipe(
              Effect.catchAll(() => Effect.succeed("error caught"))
            );
        })
      );

      expect(result).toBe("error caught");
    });
  });

  describe("Metrics Logging", () => {
    it("should log performance metrics", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logMetrics("request_timing", {
            total: 150,
            parseJson: 10,
            database: 100,
            serialize: 40,
          });
        })
      );

      expect(true).toBe(true);
    });

    it("should log system metrics", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logMetrics("system_health", {
            memoryUsed: 125,
            cpuUsage: 45,
            activeConnections: 12,
          });
        })
      );

      expect(true).toBe(true);
    });
  });

  describe("Audit Logging", () => {
    it("should log successful audit event", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logAudit(
            "deleteSession",
            "sess-123",
            "success",
            {
              userId: "user-456",
              reason: "user request",
            }
          );
        })
      );

      expect(true).toBe(true);
    });

    it("should log failed audit event", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.logAudit(
            "deleteSession",
            "sess-123",
            "failure",
            {
              userId: "user-456",
              reason: "permission denied",
            }
          );
        })
      );

      expect(true).toBe(true);
    });
  });

  describe("Context Nesting", () => {
    it("should create child context", async () => {
      const childId = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.setContext({ operation: "parent" });
          return yield* logger.createChildContext("child");
        })
      );

      expect(childId).toBeDefined();
      expect(typeof childId).toBe("string");
    });

    it("should preserve parent context in child", async () => {
      const context = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;
          yield* logger.setContext({ sessionId: "sess-123" });
          yield* logger.createChildContext("child-op");
          return yield* logger.getContext();
        })
      );

      expect(context.sessionId).toBe("sess-123");
      expect(context.operation).toBe("child-op");
    });

    it("should restore parent context", async () => {
      const finalContext = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;

          yield* logger.setContext({
            sessionId: "sess-123",
            operation: "parent",
          });
          const parentContext = yield* logger.getContext();

          yield* logger.createChildContext("child");
          yield* logger.restoreContext(parentContext);

          return yield* logger.getContext();
        })
      );

      expect(finalContext.operation).toBe("parent");
    });
  });

  describe("Log Entry Formatting", () => {
    it("should format log entry as JSON", async () => {
      const formatted = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;

          return logger.formatLogEntry({
            timestamp: 1000000,
            level: "info",
            message: "Test message",
            context: { sessionId: "sess-123" },
            metadata: { key: "value" },
          });
        })
      );

      expect(formatted).toContain("info");
      expect(formatted).toContain("Test message");
      expect(formatted).toContain("sess-123");
    });

    it("should include error in formatted entry", async () => {
      const testError = new Error("Test error message");
      const formatted = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;

          return logger.formatLogEntry({
            timestamp: 1000000,
            level: "error",
            message: "Error occurred",
            error: testError,
          });
        })
      );

      expect(formatted).toContain("error");
      expect(formatted).toContain("Test error message");
    });

    it("should format with duration", async () => {
      const formatted = await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;

          return logger.formatLogEntry({
            timestamp: 1000000,
            level: "info",
            message: "Operation completed",
            duration: 250,
          });
        })
      );

      expect(formatted).toContain("250");
    });
  });

  describe("Complete Workflow", () => {
    it("should handle complete request-response logging", async () => {
      await runStructuredLogging(
        Effect.gen(function* () {
          const logger = yield* StructuredLoggingService;

          // Set session context
          yield* logger.setContext({ sessionId: "sess-123" });

          // Log request
          const requestId = yield* logger.logRequest(
            "POST",
            "/api/blocks"
          );

          // Simulate processing
          yield* logger.logBlockExecution(
            "block-456",
            "npm test",
            "running"
          );

          yield* Effect.sleep(20);

          // Log block completion
          yield* logger.logBlockExecution(
            "block-456",
            "npm test",
            "success",
            { exitCode: 0, duration: 20 }
          );

          // Log response
          yield* logger.logResponse(requestId, 200, 20, {
            blockId: "block-456",
          });

          // Audit log
          yield* logger.logAudit(
            "executeBlock",
            "block-456",
            "success"
          );
        })
      );

      expect(true).toBe(true);
    });
  });
});
