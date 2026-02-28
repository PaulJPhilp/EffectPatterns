import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { MCPLoggerService } from "../MCPLoggerService.js";

describe("MCPLoggerService", () => {
  const originalEnv = process.env.MCP_DEBUG;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.MCP_DEBUG = originalEnv;
    vi.restoreAllMocks();
  });

  it("should log to stderr when debug is enabled", async () => {
    process.env.MCP_DEBUG = "true";
    await Effect.runPromise(
      Effect.gen(function* () {
        const logger = yield* MCPLoggerService;
        yield* logger.log("test message", { key: "value" });
      }).pipe(Effect.provide(MCPLoggerService.Default))
    );
    expect(console.error).toHaveBeenCalledWith(
      "[MCP] test message",
      expect.stringContaining('"key"')
    );
  });

  it("should not log when debug is disabled", async () => {
    process.env.MCP_DEBUG = "false";
    await Effect.runPromise(
      Effect.gen(function* () {
        const logger = yield* MCPLoggerService;
        yield* logger.log("test message");
      }).pipe(Effect.provide(MCPLoggerService.Default))
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it("should report debug status", async () => {
    process.env.MCP_DEBUG = "true";
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const logger = yield* MCPLoggerService;
        return yield* logger.isDebug();
      }).pipe(Effect.provide(MCPLoggerService.Default))
    );
    expect(result).toBe(true);
  });
});
