/**
 * Unit tests for CLI tagged error types
 */

import { describe, expect, it } from "vitest";
import {
    ApiError,
    ArgumentValidationError,
    ConfigMissingError,
    ExecutionError,
    FileNotFoundError,
    FileOperationError,
    InvalidInputError,
    OptionValidationError,
    PatternValidationError,
    PipelineStepError,
    SchemaValidationError,
    TimeoutError,
    UserCancelledError
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

    describe("SchemaValidationError", () => {
        it("should create error with path", () => {
            const error = new SchemaValidationError({
                field: "pattern.metadata.title",
                message: "Title must be at least 3 characters",
                path: ["pattern", "metadata", "title"],
            });

            expect(error._tag).toBe("SchemaValidationError");
            expect(error.path).toEqual(["pattern", "metadata", "title"]);
        });

        it("should format message with path", () => {
            const error = new SchemaValidationError({
                field: "config",
                message: "Invalid type",
                path: ["server", "port"],
            });

            expect(error.formattedMessage).toContain("server.port");
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

    describe("ConfigMissingError", () => {
        it("should create error with source", () => {
            const error = new ConfigMissingError({
                key: "API_KEY",
                source: ".env",
            });

            expect(error._tag).toBe("ConfigMissingError");
            expect(error.key).toBe("API_KEY");
            expect(error.source).toBe(".env");
        });

        it("should format message with source", () => {
            const error = new ConfigMissingError({
                key: "DATABASE_URL",
                source: "environment variables",
            });

            expect(error.formattedMessage).toContain("DATABASE_URL");
            expect(error.formattedMessage).toContain("environment variables");
        });
    });

    describe("ExecutionError", () => {
        it("should capture exit code and output", () => {
            const error = new ExecutionError({
                command: "npm test",
                exitCode: 1,
                stderr: "Test failed",
                stdout: "Running tests...",
            });

            expect(error._tag).toBe("ExecutionError");
            expect(error.exitCode).toBe(1);
            expect(error.stderr).toBe("Test failed");
        });

        it("should format message with exit code", () => {
            const error = new ExecutionError({
                command: "bun run build",
                exitCode: 127,
            });

            expect(error.formattedMessage).toContain("127");
            expect(error.formattedMessage).toContain("bun run build");
        });
    });

    describe("TimeoutError", () => {
        it("should capture timeout duration", () => {
            const error = new TimeoutError({
                command: "long-running-script",
                timeoutMs: 30000,
            });

            expect(error._tag).toBe("TimeoutError");
            expect(error.timeoutMs).toBe(30000);
        });

        it("should format message with timeout", () => {
            const error = new TimeoutError({
                command: "deploy",
                timeoutMs: 60000,
            });

            expect(error.formattedMessage).toContain("60000ms");
        });
    });

    describe("ApiError", () => {
        it("should capture API response details", () => {
            const error = new ApiError({
                endpoint: "/api/patterns",
                statusCode: 404,
                message: "Pattern not found",
                body: { error: "Not found" },
            });

            expect(error._tag).toBe("ApiError");
            expect(error.statusCode).toBe(404);
            expect(error.body).toEqual({ error: "Not found" });
        });

        it("should format message with status code", () => {
            const error = new ApiError({
                endpoint: "/api/auth",
                statusCode: 401,
                message: "Unauthorized",
            });

            expect(error.formattedMessage).toContain("401");
            expect(error.formattedMessage).toContain("/api/auth");
        });
    });

    describe("PipelineStepError", () => {
        it("should capture step and pipeline info", () => {
            const error = new PipelineStepError({
                step: "validate",
                pipeline: "publish",
                message: "Validation failed",
            });

            expect(error._tag).toBe("PipelineStepError");
            expect(error.step).toBe("validate");
            expect(error.pipeline).toBe("publish");
        });

        it("should format message with step name", () => {
            const error = new PipelineStepError({
                step: "test",
                pipeline: "ingest",
                message: "Tests failed",
            });

            expect(error.formattedMessage).toContain("test");
            expect(error.formattedMessage).toContain("ingest");
        });
    });

    describe("PatternValidationError", () => {
        it("should capture multiple issues", () => {
            const error = new PatternValidationError({
                patternId: "error-handling-basics",
                issues: [
                    "Missing ## Good Example section",
                    "No TypeScript code blocks found",
                    "Rationale section is empty",
                ],
            });

            expect(error._tag).toBe("PatternValidationError");
            expect(error.issues).toHaveLength(3);
        });

        it("should format message with all issues", () => {
            const error = new PatternValidationError({
                patternId: "test-pattern",
                issues: ["Issue 1", "Issue 2"],
            });

            expect(error.formattedMessage).toContain("test-pattern");
            expect(error.formattedMessage).toContain("Issue 1");
            expect(error.formattedMessage).toContain("Issue 2");
        });
    });

    describe("UserCancelledError", () => {
        it("should capture cancelled operation", () => {
            const error = new UserCancelledError({
                operation: "release creation",
            });

            expect(error._tag).toBe("UserCancelledError");
            expect(error.operation).toBe("release creation");
        });
    });

    describe("InvalidInputError", () => {
        it("should capture prompt and invalid value", () => {
            const error = new InvalidInputError({
                prompt: "Enter version number",
                message: "Invalid semver format",
                value: "not-a-version",
            });

            expect(error._tag).toBe("InvalidInputError");
            expect(error.prompt).toBe("Enter version number");
            expect(error.value).toBe("not-a-version");
        });
    });
});
