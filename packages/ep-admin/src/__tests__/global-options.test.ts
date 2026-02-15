/**
 * Unit tests for global CLI options
 */

import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configureLoggerFromOptions,
  globalOptions,
  loggerConfigFromOptions,
  resolveLogLevel,
  resolveOutputFormat,
  shouldUseColors,
  type GlobalOptions,
} from "../global-options.js";
import { Logger, LoggerLive } from "../services/logger/index.js";

describe("Global CLI Options", () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = [...process.argv];
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  describe("globalOptions object", () => {
    it("should export all expected options", () => {
      expect(globalOptions).toHaveProperty("noColor");
      expect(globalOptions).toHaveProperty("json");
      expect(globalOptions).toHaveProperty("verbose");
      expect(globalOptions).toHaveProperty("quiet");
      expect(globalOptions).toHaveProperty("debug");
    });
  });

  describe("resolveLogLevel", () => {
    it("should return debug when debug flag is set", () => {
      process.argv = ["node", "ep-admin", "--log-level", "error"];
      expect(resolveLogLevel({ debug: true })).toBe("debug");
      expect(resolveLogLevel({ debug: true, quiet: true })).toBe("debug");
    });

    it("should return error when quiet flag is set", () => {
      process.argv = ["node", "ep-admin", "--log-level", "debug"];
      expect(resolveLogLevel({ quiet: true })).toBe("error");
    });

    it("should use CLI --log-level when debug/quiet are not set", () => {
      process.argv = ["node", "ep-admin", "--log-level", "warning"];
      expect(resolveLogLevel({})).toBe("warn");

      process.argv = ["node", "ep-admin", "--log-level=trace"];
      expect(resolveLogLevel({})).toBe("debug");

      process.argv = ["node", "ep-admin", "--log-level", "none"];
      expect(resolveLogLevel({})).toBe("silent");
    });

    it("should fallback to LOG_LEVEL env when CLI level is absent", () => {
      process.argv = ["node", "ep-admin"];
      const original = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = "warn";
      expect(resolveLogLevel({})).toBe("warn");
      process.env.LOG_LEVEL = original;
    });

    it("should default to info when no options are provided", () => {
      process.argv = ["node", "ep-admin"];
      delete process.env.LOG_LEVEL;
      expect(resolveLogLevel({})).toBe("info");
      expect(resolveLogLevel({ verbose: true })).toBe("info");
    });
  });

  describe("resolveOutputFormat", () => {
    it("should return json when json flag is true", () => {
      expect(resolveOutputFormat({ json: true })).toBe("json");
    });

    it("should return text when json flag is false", () => {
      expect(resolveOutputFormat({ json: false })).toBe("text");
    });

    it("should default to text when json flag is not provided", () => {
      expect(resolveOutputFormat({})).toBe("text");
    });
  });

  describe("shouldUseColors", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      originalEnv = { ...process.env };
      originalIsTTY = process.stdout.isTTY;
    });

    afterEach(() => {
      process.env = originalEnv;
      Object.defineProperty(process.stdout, "isTTY", {
        value: originalIsTTY,
        writable: true,
      });
    });

    it("should return false when noColor is true", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      expect(shouldUseColors({ noColor: true })).toBe(false);
    });

    it("should return false when json is true", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      expect(shouldUseColors({ json: true })).toBe(false);
    });

    it("should return false when NO_COLOR env is set", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      process.env.NO_COLOR = "1";
      expect(shouldUseColors({})).toBe(false);
    });

    it("should return false when CI env is set", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      process.env.CI = "true";
      expect(shouldUseColors({})).toBe(false);
    });

    it("should return false when TERM is dumb", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      process.env.TERM = "dumb";
      expect(shouldUseColors({})).toBe(false);
    });

    it("should return false when stdout is not a TTY", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      expect(shouldUseColors({})).toBe(false);
    });

    it("should return true when all conditions are met for color", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      process.env.TERM = "xterm-256color";
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      expect(shouldUseColors({})).toBe(true);
    });
  });

  describe("loggerConfigFromOptions", () => {
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      delete process.env.NO_COLOR;
      delete process.env.CI;
    });

    afterEach(() => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: originalIsTTY,
        writable: true,
      });
    });

    it("should create config with debug level when debug flag is set", () => {
      const config = loggerConfigFromOptions({ debug: true });
      expect(config.logLevel).toBe("debug");
    });

    it("should create config with error level when quiet flag is set", () => {
      const config = loggerConfigFromOptions({ quiet: true });
      expect(config.logLevel).toBe("error");
    });

    it("should create config with json output format", () => {
      const config = loggerConfigFromOptions({ json: true });
      expect(config.outputFormat).toBe("json");
      expect(config.useColors).toBe(false);
    });

    it("should create complete config from options + CLI level", () => {
      process.argv = ["node", "ep-admin", "--log-level", "warning"];
      const options: GlobalOptions = {
        noColor: false,
        json: false,
        verbose: true,
        quiet: false,
        debug: false,
      };

      const config = loggerConfigFromOptions(options);
      expect(config.logLevel).toBe("warn");
      expect(config.outputFormat).toBe("text");
      expect(config.verbose).toBe(true);
    });
  });

  describe("configureLoggerFromOptions", () => {
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      delete process.env.NO_COLOR;
      delete process.env.CI;
    });

    afterEach(() => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: originalIsTTY,
        writable: true,
      });
    });

    it("should update logger configuration", async () => {
      const testLayer = LoggerLive({ logLevel: "info" });
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const logger = yield* Logger;
          const initialConfig = yield* logger.getConfig();
          expect(initialConfig.logLevel).toBe("info");
          yield* configureLoggerFromOptions({ debug: true, verbose: true });
          return yield* logger.getConfig();
        }).pipe(Effect.provide(testLayer))
      );

      expect(result.logLevel).toBe("debug");
      expect(result.verbose).toBe(true);
    });

    it("should apply json output format", async () => {
      const testLayer = LoggerLive();
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          yield* configureLoggerFromOptions({ json: true });
          const logger = yield* Logger;
          return yield* logger.getConfig();
        }).pipe(Effect.provide(testLayer))
      );

      expect(result.outputFormat).toBe("json");
      expect(result.useColors).toBe(false);
    });
  });
});
