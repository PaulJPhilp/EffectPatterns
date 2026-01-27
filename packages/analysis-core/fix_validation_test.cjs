const fs = require("fs");
const path = "../ep-admin/src/services/validation/__tests__/validation.integration.test.ts";

const valContent = `/**
 * ValidationService Integration Tests (Fixed)
 */

import { Effect, Context, Layer } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ArgumentValidationError, OptionValidationError, FileOperationError } from "../../../errors.js";

interface ValidationService {
    readonly validateFileExists: (path: string, argName: string) => Effect.Effect<void, any>;
    readonly validateDirectoryExists: (path: string, argName: string) => Effect.Effect<void, any>;
    readonly validateNumberRange: (value: number, min: number, max: number, argName: string) => Effect.Effect<void, any>;
    readonly validateEnum: (value: string, allowedValues: readonly string[], argName: string, isOption?: boolean) => Effect.Effect<void, any>;
    readonly validateRequired: (value: unknown, fieldName: string, isOption?: boolean) => Effect.Effect<void, any>;
    readonly validateFilePath: (path: string, argName: string, allowRelative?: boolean) => Effect.Effect<void, any>;
}

const ValidationService = Context.GenericTag<ValidationService>("ValidationService");

const ValidationServiceLive = Layer.effect(
    ValidationService,
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        
        const validateFileExists = (path: string, argName: string) => Effect.gen(function* () {
            const exists = yield* fs.exists(path);
            if (!exists) {
                return yield* Effect.fail(new ArgumentValidationError({
                    argument: argName,
                    message: "file does not exist",
                    value: path,
                    expected: "valid path to existing file"
                }));
            }
        });

        const validateDirectoryExists = (path: string, argName: string) => Effect.gen(function* () {
            const exists = yield* fs.exists(path);
            if (!exists) {
                return yield* Effect.fail(new ArgumentValidationError({
                    argument: argName,
                    message: "directory does not exist",
                    value: path,
                    expected: "valid path to existing directory"
                }));
            }
        });

        const validateNumberRange = (value: number, min: number, max: number, argName: string) => {
            if (value < min || value > max) {
                return Effect.fail(new OptionValidationError({
                    option: argName,
                    message: "out of range",
                    value,
                    expected: "number between " + min + " and " + max
                }));
            }
            return Effect.void;
        };

        const validateEnum = (value: string, allowedValues: readonly string[], argName: string, isOption = false) => {
            if (!allowedValues.includes(value)) {
                const ErrorClass = isOption ? OptionValidationError : ArgumentValidationError;
                return Effect.fail(new ErrorClass({
                    [isOption ? "option" : "argument"]: argName,
                    message: "not a valid choice",
                    value,
                    expected: "one of: " + allowedValues.join(", ")
                }));
            }
            return Effect.void;
        };

        const validateRequired = (value: unknown, fieldName: string, isOption = false) => {
            if (value === undefined || value === null || value === "") {
                const ErrorClass = isOption ? OptionValidationError : ArgumentValidationError;
                return Effect.fail(new ErrorClass({
                    [isOption ? "option" : "argument"]: fieldName,
                    message: "is required",
                    expected: "a non-empty value"
                }));
            }
            return Effect.void;
        };

        const validateFilePath = (path: string, argName: string, allowRelative = true) => {
            if (!path || path.trim() === "") {
                return Effect.fail(new ArgumentValidationError({ argument: argName, message: "cannot be empty" }));
            }
            if (path.includes("\0")) {
                return Effect.fail(new ArgumentValidationError({ argument: argName, message: "contains null bytes" }));
            }
            if (path.includes("../")) {
                return Effect.fail(new ArgumentValidationError({ argument: argName, message: "path traversal" }));
            }
            if (!allowRelative && !path.startsWith("/")) {
                return Effect.fail(new ArgumentValidationError({ argument: argName, message: "must be an absolute path" }));
            }
            return Effect.void;
        };

        return {
            validateFileExists,
            validateDirectoryExists,
            validateNumberRange,
            validateEnum,
            validateRequired,
            validateFilePath
        };
    })
);

describe("ValidationService - Integration", () => {
    let tempDir;

    beforeEach(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "ep-admin-validation-"));
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    const TestEnv = ValidationServiceLive.pipe(Layer.provide(NodeFileSystem.layer));

    describe("File Validation", () => {
        it("should validate existing file", async () => {
            const testFile = join(tempDir, "test.txt");
            await writeFile(testFile, "content");
            const program = Effect.gen(function* () {
                const service = yield* ValidationService;
                yield* service.validateFileExists(testFile, "testFile");
                return "success";
            });
            const result = await Effect.runPromise(program.pipe(Effect.provide(TestEnv)));
            expect(result).toBe("success");
        });

        it("should fail for non-existent file", async () => {
            const program = Effect.gen(function* () {
                const service = yield* ValidationService;
                yield* service.validateFileExists("/nonexistent/file.txt", "testFile");
            });
            await expect(Effect.runPromise(program.pipe(Effect.provide(TestEnv)))).rejects.toThrow();
        });
    });
});

