import { describe, it, expect, vi } from "vitest";
import { Effect, Layer } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { OutputHandlerService } from "../service.js";
describe("OutputHandlerService", () => {
    it("should output text to console", async () => {
        const testContent = "Hello, World!";
        const options = { quiet: false };
        const consoleSpy = vi.spyOn(console, "log");
        const program = Effect.gen(function* () {
            const outputHandler = yield* OutputHandlerService;
            yield* outputHandler.outputText(testContent, options);
        });
        await Effect.runPromise(Effect.provide(program, Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, OutputHandlerService.Default)));
        expect(consoleSpy).toHaveBeenCalledWith(testContent);
        consoleSpy.mockRestore();
    });
    it("should output JSON to console", async () => {
        const testData = { message: "Hello, World!", count: 42 };
        const options = { quiet: false };
        const consoleSpy = vi.spyOn(console, "log");
        const program = Effect.gen(function* () {
            const outputHandler = yield* OutputHandlerService;
            yield* outputHandler.outputJson(testData, options);
        });
        await Effect.runPromise(Effect.provide(program, Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, OutputHandlerService.Default)));
        expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(testData, null, 2));
        consoleSpy.mockRestore();
    });
    it("should not output when quiet mode is enabled", async () => {
        const testContent = "Hello, World!";
        const options = { quiet: true };
        const consoleSpy = vi.spyOn(console, "log");
        const program = Effect.gen(function* () {
            const outputHandler = yield* OutputHandlerService;
            yield* outputHandler.outputText(testContent, options);
        });
        await Effect.runPromise(Effect.provide(program, Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, OutputHandlerService.Default)));
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
    // TODO: Add tests for file output functionality
    // TODO: Add tests for force option functionality
});
