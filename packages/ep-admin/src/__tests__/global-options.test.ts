/**
 * Unit tests for global CLI options
 */

import { Effect, Layer } from "effect";
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
    describe("globalOptions object", () => {
        it("should export all expected options", () => {
            expect(globalOptions).toHaveProperty("logLevel");
            expect(globalOptions).toHaveProperty("noColor");
            expect(globalOptions).toHaveProperty("json");
            expect(globalOptions).toHaveProperty("verbose");
            expect(globalOptions).toHaveProperty("quiet");
            expect(globalOptions).toHaveProperty("debug");
        });
    });

    describe("resolveLogLevel", () => {
        it("should return debug when debug flag is set", () => {
            expect(resolveLogLevel({ debug: true })).toBe("debug");
            expect(resolveLogLevel({ debug: true, logLevel: "error" })).toBe("debug");
            expect(resolveLogLevel({ debug: true, quiet: true })).toBe("debug");
        });

        it("should return error when quiet flag is set", () => {
            expect(resolveLogLevel({ quiet: true })).toBe("error");
            expect(resolveLogLevel({ quiet: true, logLevel: "debug" })).toBe("error");
        });

        it("should respect priority: debug > quiet > logLevel", () => {
            // debug has highest priority
            expect(resolveLogLevel({ debug: true, quiet: true, logLevel: "warn" })).toBe("debug");

            // quiet has second priority
            expect(resolveLogLevel({ debug: false, quiet: true, logLevel: "debug" })).toBe("error");

            // logLevel is used when neither debug nor quiet
            expect(resolveLogLevel({ debug: false, quiet: false, logLevel: "warn" })).toBe("warn");
        });

        it("should default to info when no options provided", () => {
            expect(resolveLogLevel({})).toBe("info");
            expect(resolveLogLevel({ verbose: true })).toBe("info");
        });

        it("should handle all log levels", () => {
            expect(resolveLogLevel({ logLevel: "debug" })).toBe("debug");
            expect(resolveLogLevel({ logLevel: "info" })).toBe("info");
            expect(resolveLogLevel({ logLevel: "warn" })).toBe("warn");
            expect(resolveLogLevel({ logLevel: "error" })).toBe("error");
            expect(resolveLogLevel({ logLevel: "silent" })).toBe("silent");
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
        // Store original values
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
            delete process.env.NO_COLOR;
            process.env.CI = "true";
            expect(shouldUseColors({})).toBe(false);
        });

        it("should return false when TERM is dumb", () => {
            Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
            delete process.env.NO_COLOR;
            delete process.env.CI;
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

        it("should prioritize explicit noColor over environment", () => {
            delete process.env.NO_COLOR;
            delete process.env.CI;
            Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

            // Even with TTY, noColor flag should disable colors
            expect(shouldUseColors({ noColor: true })).toBe(false);
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
            expect(config.useColors).toBe(false); // json disables colors
        });

        it("should create config with verbose mode", () => {
            const config = loggerConfigFromOptions({ verbose: true });
            expect(config.verbose).toBe(true);
        });

        it("should create complete config from full options", () => {
            const options: GlobalOptions = {
                logLevel: "warn",
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

        it("should create default config when no options provided", () => {
            const config = loggerConfigFromOptions({});

            expect(config.logLevel).toBe("info");
            expect(config.outputFormat).toBe("text");
            expect(config.verbose).toBe(false);
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

                    // Initial config should be info
                    const initialConfig = yield* logger.getConfig();
                    expect(initialConfig.logLevel).toBe("info");

                    // Apply debug options
                    yield* configureLoggerFromOptions({ debug: true, verbose: true });

                    // Config should now be debug + verbose
                    const updatedConfig = yield* logger.getConfig();
                    return updatedConfig;
                }).pipe(Effect.provide(testLayer))
            );

            expect(result.logLevel).toBe("debug");
            expect(result.verbose).toBe(true);
        });

        it("should apply quiet mode", async () => {
            const testLayer = LoggerLive();

            const result = await Effect.runPromise(
                Effect.gen(function* () {
                    yield* configureLoggerFromOptions({ quiet: true });
                    const logger = yield* Logger;
                    return yield* logger.getConfig();
                }).pipe(Effect.provide(testLayer))
            );

            expect(result.logLevel).toBe("error");
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

        it("should apply noColor option", async () => {
            const testLayer = LoggerLive();

            const result = await Effect.runPromise(
                Effect.gen(function* () {
                    yield* configureLoggerFromOptions({ noColor: true });
                    const logger = yield* Logger;
                    return yield* logger.getConfig();
                }).pipe(Effect.provide(testLayer))
            );

            expect(result.useColors).toBe(false);
        });
    });

    describe("Option combinations", () => {
        it("should handle conflicting options correctly", () => {
            // debug takes precedence over quiet
            expect(
                resolveLogLevel({ debug: true, quiet: true, logLevel: "warn" })
            ).toBe("debug");

            // quiet takes precedence over explicit logLevel
            expect(
                resolveLogLevel({ debug: false, quiet: true, logLevel: "debug" })
            ).toBe("error");
        });

        it("should handle all flags disabled", () => {
            const options: GlobalOptions = {
                logLevel: "info",
                noColor: false,
                json: false,
                verbose: false,
                quiet: false,
                debug: false,
            };

            expect(resolveLogLevel(options)).toBe("info");
            expect(resolveOutputFormat(options)).toBe("text");
        });
    });
});
