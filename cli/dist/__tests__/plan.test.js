import { Command } from "@effect/cli";
import { Effect, Exit, Option } from "effect";
import { describe, expect, it } from "vitest";
import { planCommand } from "../commands/plan.js";
import { TestRuntime, runTestEffect, runTestExit, } from "../runtime/testing-runtime.js";
import { ConfigService } from "../services/config-service/service.js";
import { buildLlmExecutionPlanEffect } from "../services/llm-service/service.js";
function runCli(command, args) {
    const runner = Command.run(command, { name: "test", version: "0.0.0" });
    return TestRuntime.runPromise(runner(["node", "test", ...args]));
}
describe("plan command", () => {
    it("should be defined", () => {
        expect(planCommand).toBeDefined();
    });
    it("plan list shows defaults when no overrides", async () => {
        await runTestEffect(Effect.gen(function* () {
            const cfg = yield* ConfigService;
            yield* cfg.remove("planRetries");
            yield* cfg.remove("planRetryMs");
            yield* cfg.remove("planFallbacks");
        }));
        await runCli(planCommand, ["plan", "list"]);
        const plan = await runTestEffect(buildLlmExecutionPlanEffect("google", "gemini-2.5-flash"));
        expect(plan).toBeDefined();
    });
    it("plan create sets retries and retry-ms", async () => {
        await runCli(planCommand, [
            "plan",
            "create",
            "--retries",
            "2",
            "--retry-ms",
            "1200",
        ]);
        const result = await runTestEffect(Effect.gen(function* () {
            const cfg = yield* ConfigService;
            const retries = yield* cfg.get("planRetries");
            const retryMs = yield* cfg.get("planRetryMs");
            return { retries, retryMs };
        }));
        expect(Option.getOrElse(result.retries, () => "")).toBe("2");
        expect(Option.getOrElse(result.retryMs, () => "")).toBe("1200");
        const plan = await runTestEffect(buildLlmExecutionPlanEffect("google", "gemini-2.5-flash"));
        expect(plan).toBeDefined();
    });
    it("plan create sets fallbacks", async () => {
        await runCli(planCommand, [
            "plan",
            "create",
            "--fallbacks",
            "openai:gpt-4o-mini,anthropic:claude-3-5-haiku",
        ]);
        const fallbacks = await runTestEffect(Effect.gen(function* () {
            const cfg = yield* ConfigService;
            return yield* cfg.get("planFallbacks");
        }));
        expect(Option.isSome(fallbacks)).toBe(true);
    });
    it("plan clear removes overrides", async () => {
        await runCli(planCommand, [
            "plan",
            "create",
            "--retries",
            "3",
            "--retry-ms",
            "2000",
        ]);
        await runCli(planCommand, ["plan", "clear"]);
        const result = await runTestEffect(Effect.gen(function* () {
            const cfg = yield* ConfigService;
            const retries = yield* cfg.get("planRetries");
            const retryMs = yield* cfg.get("planRetryMs");
            const fallbacks = yield* cfg.get("planFallbacks");
            return { retries, retryMs, fallbacks };
        }));
        expect(result.retries._tag).toBe("None");
        expect(result.retryMs._tag).toBe("None");
        expect(result.fallbacks._tag).toBe("None");
    });
    it("plan reset behaves like clear and uses defaults", async () => {
        await runCli(planCommand, ["plan", "create", "--retries", "1"]);
        await runCli(planCommand, ["plan", "reset"]);
        const plan = await runTestEffect(buildLlmExecutionPlanEffect("openai", "gpt-4o-mini"));
        expect(plan).toBeDefined();
    });
    it("plan create errors on invalid retries", async () => {
        const exit = await runTestExit(Command.run(planCommand, { name: "test", version: "0.0.0" })([
            "node",
            "test",
            "plan",
            "create",
            "--retries",
            "-1",
        ]));
        expect(Exit.isFailure(exit)).toBe(true);
    });
    it("plan create errors on invalid retry-ms", async () => {
        const exit = await runTestExit(Command.run(planCommand, { name: "test", version: "0.0.0" })([
            "node",
            "test",
            "plan",
            "create",
            "--retry-ms",
            "-5",
        ]));
        expect(Exit.isFailure(exit)).toBe(true);
    });
    it("plan create errors on invalid fallbacks string", async () => {
        const exit = await runTestExit(Command.run(planCommand, { name: "test", version: "0.0.0" })([
            "node",
            "test",
            "plan",
            "create",
            "--fallbacks",
            "openai|gpt-4o-mini",
        ]));
        expect(Exit.isFailure(exit)).toBe(true);
    });
});
