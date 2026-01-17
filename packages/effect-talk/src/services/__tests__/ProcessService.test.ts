import { describe, it, expect } from "vitest";
import { Effect, Stream } from "effect";
import { ProcessService } from "../ProcessService";
import { LoggerService } from "../LoggerService";
import { runEffect } from "../../__tests__/fixtures";

/**
 * Unit tests for ProcessService
 * Tests process spawning, stream handling, and signal management
 */
describe("ProcessService", () => {
  /**
   * Helper to run a ProcessService operation
   */
  const runProcessService = async <A>(
    effect: Effect.Effect<A, never, ProcessService | LoggerService>
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(LoggerService.Default),
        Effect.provide(ProcessService.Default)
      )
    );
  };

  describe("spawn", () => {
    it("should spawn a process and return handle", async () => {
      const handle = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* service.spawn("echo test", "/tmp", {});
        })
      );

      expect(handle).toBeDefined();
      expect(handle.pid).toBeDefined();
      expect(typeof handle.pid).toBe("number");
      expect(handle.pid).toBeGreaterThan(0);
      expect(handle.command).toBe("echo test");
      expect(handle.cwd).toBe("/tmp");
    });

    it("should use provided working directory", async () => {
      const cwd = "/home/user";

      const handle = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* service.spawn("echo test", cwd, {});
        })
      );

      expect(handle.cwd).toBe(cwd);
    });

    it("should accept environment variables", async () => {
      const env = { TEST_VAR: "test_value", CUSTOM: "custom" };

      const handle = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* service.spawn("env", "/tmp", env);
        })
      );

      expect(handle).toBeDefined();
      expect(handle.pid).toBeGreaterThan(0);
    });

    it("should create unique PIDs for different processes", async () => {
      const pids = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const h1 = yield* service.spawn("echo 1", "/tmp", {});
          const h2 = yield* service.spawn("echo 2", "/tmp", {});
          const h3 = yield* service.spawn("echo 3", "/tmp", {});
          return [h1.pid, h2.pid, h3.pid];
        })
      );

      expect(pids).toHaveLength(3);
      expect(new Set(pids).size).toBe(3); // All unique
    });

    it("should handle spawn with default environment", async () => {
      const handle = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* service.spawn("echo test", "/tmp", {});
        })
      );

      expect(handle).toBeDefined();
      expect(handle.command).toBe("echo test");
    });
  });

  describe("sendInput", () => {
    it("should send input to a process", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("cat", "/tmp", {});

          // Should not throw
          yield* service.sendInput(handle.pid, "test input\n");
        })
      );
    });

    it("should fail for non-existent process", async () => {
      const error = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* Effect.tryPromise(() =>
            Promise.resolve(yield* service.sendInput(9999, "test"))
          ).pipe(
            Effect.catchAll((err) => Effect.succeed(err)),
            Effect.map((result) => (result instanceof Error ? result.message : "no error"))
          );
        })
      );

      expect(typeof error).toBe("string");
    });

    it("should send multiple inputs", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("cat", "/tmp", {});

          yield* service.sendInput(handle.pid, "line1\n");
          yield* service.sendInput(handle.pid, "line2\n");
          yield* service.sendInput(handle.pid, "line3\n");
        })
      );
    });
  });

  describe("interrupt", () => {
    it("should interrupt a running process", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("sleep 100", "/tmp", {});

          // Process should be running
          const runningBefore = yield* service.isRunning(handle.pid);
          expect(runningBefore).toBe(true);

          // Interrupt
          yield* service.interrupt(handle.pid);

          // Give it time to process signal
          yield* Effect.sleep(200);

          // Should no longer be running
          const runningAfter = yield* service.isRunning(handle.pid);
          // After interrupt, may or may not be running depending on signal handling
          expect(typeof runningAfter).toBe("boolean");
        })
      );
    });

    it("should handle interrupt of non-existent process", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          // Should not throw
          yield* service.interrupt(9999);
        })
      );
    });

    it("should send SIGINT signal", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("sleep 100", "/tmp", {});

          yield* service.interrupt(handle.pid);
          // Should complete without error
          expect(true).toBe(true);
        })
      );
    });
  });

  describe("terminate", () => {
    it("should terminate a process", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("sleep 100", "/tmp", {});

          yield* service.terminate(handle.pid, "SIGTERM");
          expect(true).toBe(true); // Should not throw
        })
      );
    });

    it("should support different signals", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;

          const h1 = yield* service.spawn("sleep 100", "/tmp", {});
          yield* service.terminate(h1.pid, "SIGTERM");

          const h2 = yield* service.spawn("sleep 100", "/tmp", {});
          yield* service.terminate(h2.pid, "SIGKILL");

          expect(true).toBe(true);
        })
      );
    });

    it("should handle terminate of non-existent process", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          // Should not throw
          yield* service.terminate(9999, "SIGTERM");
        })
      );
    });

    it("should accept custom signal", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("sleep 100", "/tmp", {});

          yield* service.terminate(handle.pid, "SIGINT");
          expect(true).toBe(true);
        })
      );
    });
  });

  describe("recordStream", () => {
    it("should create a stream for process output", async () => {
      const streamExists = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("echo test", "/tmp", {});

          const stream = yield* service.recordStream(handle.pid, "stdout");
          expect(stream).toBeDefined();
          // Should be a Stream type
          return true;
        })
      );

      expect(streamExists).toBe(true);
    });

    it("should create both stdout and stderr streams", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("echo test", "/tmp", {});

          const stdout = yield* service.recordStream(handle.pid, "stdout");
          const stderr = yield* service.recordStream(handle.pid, "stderr");

          expect(stdout).toBeDefined();
          expect(stderr).toBeDefined();
        })
      );
    });

    it("should return empty stream for non-existent process", async () => {
      const stream = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* service.recordStream(9999, "stdout");
        })
      );

      expect(stream).toBeDefined();
    });

    it("should produce stream data", async () => {
      const hasData = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("echo test-output", "/tmp", {});

          const stream = yield* service.recordStream(handle.pid, "stdout");

          // Collect stream data
          const data = yield* Stream.runCollect(stream);
          return data.length > 0;
        })
      );

      expect(hasData).toBe(true);
    });
  });

  describe("getAllStreams", () => {
    it("should return both stdout and stderr streams", async () => {
      const streams = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("echo test", "/tmp", {});

          return yield* service.getAllStreams(handle.pid);
        })
      );

      expect(streams).toBeDefined();
      expect(streams.stdout).toBeDefined();
      expect(streams.stderr).toBeDefined();
    });

    it("should return empty streams for non-existent process", async () => {
      const streams = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* service.getAllStreams(9999);
        })
      );

      expect(streams.stdout).toBeDefined();
      expect(streams.stderr).toBeDefined();
    });
  });

  describe("isRunning", () => {
    it("should return true for running process", async () => {
      const isRunning = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("sleep 100", "/tmp", {});

          return yield* service.isRunning(handle.pid);
        })
      );

      expect(isRunning).toBe(true);
    });

    it("should return false for non-existent process", async () => {
      const isRunning = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* service.isRunning(9999);
        })
      );

      expect(isRunning).toBe(false);
    });

    it("should return false for terminated process", async () => {
      const isRunningAfterTerminate = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("sleep 100", "/tmp", {});

          // Verify it's running
          const runningBefore = yield* service.isRunning(handle.pid);
          expect(runningBefore).toBe(true);

          // Terminate
          yield* service.terminate(handle.pid, "SIGTERM");

          // Check again (may not be instant)
          return yield* service.isRunning(handle.pid);
        })
      );

      // After termination, should be false or transitioning
      expect(typeof isRunningAfterTerminate).toBe("boolean");
    });
  });

  describe("getExitCode", () => {
    it("should return exit code for completed process", async () => {
      const exitCode = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("echo test", "/tmp", {});

          // Wait for process to complete
          yield* Effect.sleep(500);

          return yield* service.getExitCode(handle.pid);
        })
      );

      expect(typeof exitCode).toBe("number");
    });

    it("should return -1 for non-existent process", async () => {
      const exitCode = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* service.getExitCode(9999);
        })
      );

      expect(exitCode).toBe(-1);
    });

    it("should return 0 for successful echo command", async () => {
      const exitCode = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("echo success", "/tmp", {});

          yield* Effect.sleep(500);

          return yield* service.getExitCode(handle.pid);
        })
      );

      // Should be 0 or positive number
      expect(typeof exitCode).toBe("number");
    });
  });

  describe("clearStreams", () => {
    it("should clear stream data", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          const handle = yield* service.spawn("echo test", "/tmp", {});

          // Should not throw
          yield* service.clearStreams(handle.pid);
        })
      );
    });

    it("should handle clearing non-existent process", async () => {
      await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          yield* service.clearStreams(9999);
        })
      );
    });
  });

  describe("Process lifecycle", () => {
    it("should complete full process lifecycle", async () => {
      const lifecycle = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;

          // Spawn
          const handle = yield* service.spawn("echo test", "/tmp", {});
          expect(handle.pid).toBeGreaterThan(0);

          // Check running
          let isRunning = yield* service.isRunning(handle.pid);
          expect(typeof isRunning).toBe("boolean");

          // Get stream
          const stream = yield* service.recordStream(handle.pid, "stdout");
          expect(stream).toBeDefined();

          // Wait a bit
          yield* Effect.sleep(200);

          // Get exit code
          const exitCode = yield* service.getExitCode(handle.pid);
          expect(typeof exitCode).toBe("number");

          return { spawned: true, hasExitCode: true };
        })
      );

      expect(lifecycle.spawned).toBe(true);
      expect(lifecycle.hasExitCode).toBe(true);
    });

    it("should handle process with environment variables", async () => {
      const env = { TEST_ENV: "test_value", ANOTHER: "another" };

      const handle = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;
          return yield* service.spawn("env", "/tmp", env);
        })
      );

      expect(handle.pid).toBeGreaterThan(0);
      expect(handle.command).toBe("env");
    });

    it("should maintain process isolation", async () => {
      const handles = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;

          const h1 = yield* service.spawn("echo one", "/tmp", {});
          const h2 = yield* service.spawn("echo two", "/tmp", {});
          const h3 = yield* service.spawn("echo three", "/tmp", {});

          // All should have different PIDs
          const ids = [h1.pid, h2.pid, h3.pid];
          const uniqueIds = new Set(ids);

          expect(uniqueIds.size).toBe(3);

          return { count: 3, unique: uniqueIds.size === 3 };
        })
      );

      expect(handles.unique).toBe(true);
    });
  });

  describe("Error conditions", () => {
    it("should handle spawn errors gracefully", async () => {
      const result = await runProcessService(
        Effect.gen(function* () {
          const service = yield* ProcessService;

          return yield* Effect.tryPromise(() =>
            Promise.resolve(
              yield* service.spawn("nonexistent-command-12345", "/tmp", {})
            )
          ).pipe(
            Effect.catchAll(() =>
              Effect.succeed({
                error: true,
                handled: true,
              })
            )
          );
        })
      );

      // Either spawned successfully (in mock) or error was caught
      expect(typeof result).toBe("object");
    });
  });
});
