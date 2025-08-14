import { describe, expect, it } from "vitest";
import { Effect, Option } from "effect";
import { runTestEffect } from "../runtime/testing-runtime.js";
import { ConfigService } from "../services/config-service/service.js";
describe("system-prompt command", () => {
    it("should set system prompt file path in config", async () => {
        const testFilePath = "/test/system-prompt.mdx";
        const program = Effect.gen(function* () {
            const config = yield* ConfigService;
            yield* config.setSystemPromptFile(testFilePath);
            const result = yield* config.getSystemPromptFile();
            return result;
        });
        const result = await runTestEffect(program.pipe(Effect.provide(ConfigService.Default)));
        expect(result).toEqual(Option.some(testFilePath));
    });
    it("should clear system prompt file path from config", async () => {
        const program = Effect.gen(function* () {
            const config = yield* ConfigService;
            yield* config.clearSystemPromptFile();
            const result = yield* config.getSystemPromptFile();
            return result;
        });
        const result = await runTestEffect(program.pipe(Effect.provide(ConfigService.Default)));
        expect(result).toEqual(Option.none());
    });
});
