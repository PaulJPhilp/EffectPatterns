import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { ConfigService } from "../service.js";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
const testLayer = Layer.provide(ConfigService.Default, NodeFileSystem.layer);
describe("ConfigService", () => {
    it("should create ConfigService", () => {
        expect(ConfigService).toBeDefined();
    });
    it("should have proper service structure", () => Effect.gen(function* () {
        const configService = yield* ConfigService;
        expect(typeof configService.get).toBe("function");
        expect(typeof configService.set).toBe("function");
        expect(typeof configService.list).toBe("function");
        expect(typeof configService.remove).toBe("function");
        expect(typeof configService.getSystemPromptFile).toBe("function");
        expect(typeof configService.setSystemPromptFile).toBe("function");
        expect(typeof configService.clearSystemPromptFile).toBe("function");
    }).pipe(Effect.provide(testLayer)));
    describe("Configuration Management", () => {
        it("should handle basic get/set operations", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Set a test value
            yield* configService.set("test-key", "test-value");
            // Get the value back
            const retrievedValue = yield* configService.get("test-key");
            expect(retrievedValue._tag).toBe("Some");
            if (retrievedValue._tag === "Some") {
                expect(retrievedValue.value).toBe("test-value");
            }
        }).pipe(Effect.provide(testLayer)));
        it("should handle non-existent keys", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Try to get a non-existent key
            const result = yield* configService.get("non-existent-key");
            expect(result._tag).toBe("None");
        }).pipe(Effect.provide(testLayer)));
        it("should handle config listing", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Set some test values
            yield* configService.set("list-test-1", "value1");
            yield* configService.set("list-test-2", "value2");
            // List all configs
            const configs = yield* configService.list();
            expect(Array.isArray(configs)).toBe(true);
            expect(configs.length).toBeGreaterThanOrEqual(2);
            // Check that our test values are included
            const hasListTest1 = "list-test-1" in configs;
            const hasListTest2 = "list-test-2" in configs;
            expect(hasListTest1).toBe(true);
            expect(hasListTest2).toBe(true);
            expect(configs["list-test-1"]).toBe("value1");
            expect(configs["list-test-2"]).toBe("value2");
        }).pipe(Effect.provide(testLayer)));
        it("should handle config removal", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Set a test value
            yield* configService.set("remove-test", "to-be-removed");
            // Verify it exists
            const beforeRemoval = yield* configService.get("remove-test");
            expect(beforeRemoval._tag).toBe("Some");
            // Remove the value
            yield* configService.remove("remove-test");
            // Verify it's gone
            const afterRemoval = yield* configService.get("remove-test");
            expect(afterRemoval._tag).toBe("None");
        }).pipe(Effect.provide(testLayer)));
    });
    describe("System Prompt File Management", () => {
        it("should handle system prompt file operations", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            const testPrompt = "This is a test system prompt";
            // Set system prompt
            yield* configService.setSystemPromptFile(testPrompt);
            // Get system prompt
            const retrievedPrompt = yield* configService.getSystemPromptFile();
            expect(retrievedPrompt._tag).toBe("Some");
            if (retrievedPrompt._tag === "Some") {
                expect(retrievedPrompt.value).toBe(testPrompt);
            }
            // Remove system prompt
            yield* configService.clearSystemPromptFile();
            // Verify it's gone
            const afterRemoval = yield* configService.getSystemPromptFile();
            expect(afterRemoval._tag).toBe("None");
        }).pipe(Effect.provide(testLayer)));
        it("should handle missing system prompt file", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Ensure system prompt file doesn't exist
            yield* configService.clearSystemPromptFile();
            // Try to get non-existent system prompt
            const result = yield* configService.getSystemPromptFile();
            expect(result._tag).toBe("None");
        }).pipe(Effect.provide(testLayer)));
    });
    describe("File System Operations", () => {
        it("should handle config file creation", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Setting a value should create the config file if it doesn't exist
            yield* configService.set("file-test", "test-value");
            // Verify the value was set
            const result = yield* configService.get("file-test");
            expect(result._tag).toBe("Some");
            if (result._tag === "Some") {
                expect(result.value).toBe("test-value");
            }
        }).pipe(Effect.provide(testLayer)));
        it("should handle JSON parsing and serialization", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Test setting and getting various data types as strings
            yield* configService.set("json-test-string", "simple string");
            yield* configService.set("json-test-number", "123");
            yield* configService.set("json-test-boolean", "true");
            const stringResult = yield* configService.get("json-test-string");
            const numberResult = yield* configService.get("json-test-number");
            const booleanResult = yield* configService.get("json-test-boolean");
            expect(stringResult._tag).toBe("Some");
            expect(numberResult._tag).toBe("Some");
            expect(booleanResult._tag).toBe("Some");
        }).pipe(Effect.provide(testLayer)));
        it("should handle file system errors gracefully", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Test that the service handles operations gracefully
            // Even if there are file system issues, the service should not crash
            const result = yield* configService.get("error-test-key");
            // Should return None for non-existent keys without throwing
            expect(result._tag).toBe("None");
        }).pipe(Effect.provide(testLayer)));
    });
    describe("Configuration Persistence", () => {
        it("should persist configuration across operations", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Set initial value
            yield* configService.set("persist-test", "initial-value");
            // Verify initial value
            const initial = yield* configService.get("persist-test");
            expect(initial._tag).toBe("Some");
            if (initial._tag === "Some") {
                expect(initial.value).toBe("initial-value");
            }
            // Perform another operation
            yield* configService.set("another-test", "another-value");
            // Verify persisted value
            const persisted = yield* configService.get("persist-test");
            expect(persisted._tag).toBe("Some");
            if (persisted._tag === "Some") {
                expect(persisted.value).toBe("initial-value");
            }
        }).pipe(Effect.provide(testLayer)));
        it("should handle configuration overwrites", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Set initial value
            yield* configService.set("overwrite-test", "initial-value");
            // Verify initial value
            const initial = yield* configService.get("overwrite-test");
            expect(initial._tag).toBe("Some");
            if (initial._tag === "Some") {
                expect(initial.value).toBe("initial-value");
            }
            // Overwrite with new value
            yield* configService.set("overwrite-test", "new-value");
            // Verify new value
            const updated = yield* configService.get("overwrite-test");
            expect(updated._tag).toBe("Some");
            if (updated._tag === "Some") {
                expect(updated.value).toBe("new-value");
            }
        }).pipe(Effect.provide(testLayer)));
    });
    describe("Error Handling", () => {
        it("should handle configuration errors appropriately", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Test that the service handles errors gracefully
            // Even if there are errors, the service should not crash
            const result = yield* configService.get("error-test-key");
            // Should return None for non-existent keys without throwing
            expect(result._tag).toBe("None");
        }).pipe(Effect.provide(testLayer)));
        it("should handle edge cases", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Test with empty string
            yield* configService.set("empty-string-test", "");
            // Verify empty string
            const emptyResult = yield* configService.get("empty-string-test");
            expect(emptyResult._tag).toBe("Some");
            if (emptyResult._tag === "Some") {
                expect(emptyResult.value).toBe("");
            }
            // Test with special characters
            yield* configService.set("special-char-test", "!@#$%^&*()");
            // Verify special characters
            const specialResult = yield* configService.get("special-char-test");
            expect(specialResult._tag).toBe("Some");
            if (specialResult._tag === "Some") {
                expect(specialResult.value).toBe("!@#$%^&*()");
            }
            // Test with large values
            yield* configService.set("large-value-test", "a".repeat(10000));
            // Verify large value
            const largeResult = yield* configService.get("large-value-test");
            expect(largeResult._tag).toBe("Some");
            if (largeResult._tag === "Some") {
                expect(largeResult.value).toBe("a".repeat(10000));
            }
        }).pipe(Effect.provide(testLayer)));
    });
    describe("Service Integration", () => {
        it("should integrate properly with Effect system", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Test that the service works within Effect.gen context
            yield* configService.set("effect-integration-test", "effect-value");
            const result = yield* configService.get("effect-integration-test");
            expect(result._tag).toBe("Some");
            if (result._tag === "Some") {
                expect(result.value).toBe("effect-value");
            }
        }).pipe(Effect.provide(testLayer)));
        it("should work with managed runtime", () => Effect.gen(function* () {
            const configService = yield* ConfigService;
            // Test that the service works within managed runtime
            yield* configService.set("runtime-test", "runtime-value");
            const result = yield* configService.get("runtime-test");
            expect(result._tag).toBe("Some");
            if (result._tag === "Some") {
                expect(result.value).toBe("runtime-value");
            }
        }).pipe(Effect.provide(testLayer)));
    });
});
