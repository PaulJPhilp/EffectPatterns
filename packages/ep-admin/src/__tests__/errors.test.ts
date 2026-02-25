/**
 * Unit tests for CLI tagged error types
 */

import { describe, expect, it } from "vitest";
import {
    ArgumentValidationError,
    DirectoryNotFoundError,
    FileNotFoundError,
    FileOperationError,
    OptionValidationError,
} from "../errors.js";

describe("CLI Error Types", () => {
    describe("OptionValidationError", () => {
        it("should create error with required fields", () => {
            const error = new OptionValidationError({
                option: "verbose",
                message: "Expected boolean value",
            });

            expect(error._tag).toBe("OptionValidationError");
            expect(error.option).toBe("verbose");
            expect(error.message).toBe("Expected boolean value");
        });

        it("should include optional fields", () => {
            const error = new OptionValidationError({
                option: "count",
                message: "Must be a positive integer",
                value: -5,
                expected: "positive integer",
            });

            expect(error.value).toBe(-5);
            expect(error.expected).toBe("positive integer");
        });

        it("should format message correctly", () => {
            const error = new OptionValidationError({
                option: "level",
                message: "Invalid level",
                expected: "debug|info|warn|error",
            });

            expect(error.formattedMessage).toContain("--level");
            expect(error.formattedMessage).toContain("Invalid level");
            expect(error.formattedMessage).toContain("debug|info|warn|error");
        });
    });

    describe("ArgumentValidationError", () => {
        it("should create error with required fields", () => {
            const error = new ArgumentValidationError({
                argument: "filepath",
                message: "File path is required",
            });

            expect(error._tag).toBe("ArgumentValidationError");
            expect(error.argument).toBe("filepath");
        });

        it("should format message correctly", () => {
            const error = new ArgumentValidationError({
                argument: "shell",
                message: "Unknown shell type",
                value: "powershell",
                expected: "bash|zsh|fish",
            });

            expect(error.formattedMessage).toContain("shell");
            expect(error.formattedMessage).toContain("Unknown shell type");
        });
    });

    describe("FileNotFoundError", () => {
        it("should create error for file operations", () => {
            const error = new FileNotFoundError({
                path: "/path/to/file.ts",
                operation: "read",
            });

            expect(error._tag).toBe("FileNotFoundError");
            expect(error.path).toBe("/path/to/file.ts");
            expect(error.operation).toBe("read");
        });

        it("should format message correctly", () => {
            const error = new FileNotFoundError({
                path: "config.json",
                operation: "load configuration",
            });

            expect(error.formattedMessage).toContain("config.json");
            expect(error.formattedMessage).toContain("load configuration");
        });
    });

    describe("FileOperationError", () => {
        it("should support all operation types", () => {
            const operations = ["read", "write", "delete", "copy", "move"] as const;

            for (const operation of operations) {
                const error = new FileOperationError({
                    path: "/test/path",
                    operation,
                });

                expect(error.operation).toBe(operation);
                expect(error.formattedMessage).toContain(operation);
            }
        });

        it("should include cause when provided", () => {
            const cause = new Error("EACCES: permission denied");
            const error = new FileOperationError({
                path: "/etc/passwd",
                operation: "write",
                cause,
            });

            expect(error.cause).toBe(cause);
        });
    });

    describe("DirectoryNotFoundError", () => {
        it("should create error for directory operations", () => {
            const error = new DirectoryNotFoundError({
                path: "/path/to/dir",
                operation: "list",
            });

            expect(error._tag).toBe("DirectoryNotFoundError");
            expect(error.path).toBe("/path/to/dir");
            expect(error.operation).toBe("list");
        });

        it("should format message correctly", () => {
            const error = new DirectoryNotFoundError({
                path: "/missing/dir",
                operation: "scan",
            });

            expect(error.formattedMessage).toContain("/missing/dir");
            expect(error.formattedMessage).toContain("scan");
        });
    });
});
