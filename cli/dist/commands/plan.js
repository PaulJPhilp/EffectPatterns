import { Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { PlanError_InvalidRetries, PlanError_InvalidRetryMs, PlanError_InvalidFallbackSpec, } from "./errors.js";
import { ConfigService } from "../services/config-service/service.js";
const retriesOpt = Options.integer("retries").pipe(Options.withDescription("Number of retries for the primary provider"), Options.withAlias("r"), Options.optional);
const retryMsOpt = Options.integer("retry-ms").pipe(Options.withDescription("Delay between retry attempts in milliseconds"), Options.withAlias("d"), Options.optional);
const fallbacksOpt = Options.text("fallbacks").pipe(Options.withDescription("Comma-separated fallbacks as provider:model pairs (e.g. openai:gpt-4o-mini,anthropic:claude-3-5-haiku)"), Options.optional);
const planCreate = Command.make("create", { retries: retriesOpt, retryMs: retryMsOpt, fallbacks: fallbacksOpt }, ({ retries, retryMs, fallbacks }) => Effect.gen(function* () {
    const config = yield* ConfigService;
    // Validation will fail with typed errors from ./errors
    if (Option.isNone(retries) &&
        Option.isNone(retryMs) &&
        Option.isNone(fallbacks)) {
        yield* Console.log("No values provided. Use --retries, --retry-ms and/or --fallbacks to set the plan.");
        return;
    }
    if (Option.isSome(retries)) {
        const n = retries.value;
        if (!Number.isFinite(n) || n < 0) {
            return yield* Effect.fail(new PlanError_InvalidRetries({ value: Number(n) }));
        }
        yield* config.set("planRetries", String(n));
        yield* Console.log(`Set planRetries=${n}`);
    }
    if (Option.isSome(retryMs)) {
        const ms = retryMs.value;
        if (!Number.isFinite(ms) || ms < 0) {
            return yield* Effect.fail(new PlanError_InvalidRetryMs({ value: Number(ms) }));
        }
        yield* config.set("planRetryMs", String(ms));
        yield* Console.log(`Set planRetryMs=${ms}`);
    }
    if (Option.isSome(fallbacks)) {
        const parsed = parseFallbacks(fallbacks.value);
        if (parsed._tag === "Left") {
            return yield* Effect.fail(new PlanError_InvalidFallbackSpec({ reason: parsed.left }));
        }
        const fallbacksArray = parsed.right;
        yield* config.set("planFallbacks", JSON.stringify(fallbacksArray));
        yield* Console.log(`Set planFallbacks=${JSON.stringify(fallbacksArray)}`);
    }
}));
const planList = Command.make("list", {}, () => Effect.gen(function* () {
    const config = yield* ConfigService;
    const retries = yield* config.get("planRetries");
    const retryMs = yield* config.get("planRetryMs");
    const fallbacks = yield* config.get("planFallbacks");
    const retriesDisplay = Option.match(retries, {
        onNone: () => "(default) 1",
        onSome: (v) => String(v),
    });
    const retryMsDisplay = Option.match(retryMs, {
        onNone: () => "(default) 1000",
        onSome: (v) => String(v),
    });
    const fallbackDisplay = Option.match(fallbacks, {
        onNone: () => [
            {
                provider: "openai",
                model: "gpt-4o-mini",
                attempts: 1,
                retryMs: 1500,
            },
            {
                provider: "anthropic",
                model: "claude-3-5-haiku",
                attempts: 1,
                retryMs: 1500,
            },
        ],
        onSome: (v) => {
            try {
                const arr = JSON.parse(String(v));
                return arr.map((x) => ({ ...x, attempts: 1, retryMs: 1500 }));
            }
            catch {
                return [
                    {
                        provider: "openai",
                        model: "gpt-4o-mini",
                        attempts: 1,
                        retryMs: 1500,
                    },
                    {
                        provider: "anthropic",
                        model: "claude-3-5-haiku",
                        attempts: 1,
                        retryMs: 1500,
                    },
                ];
            }
        },
    });
    yield* Console.log(JSON.stringify({
        primary: {
            retries: retriesDisplay,
            attempts: Option.match(retries, {
                onNone: () => 2,
                onSome: (v) => {
                    const n = Number.parseInt(String(v), 10);
                    return (Number.isFinite(n) && n >= 0 ? n : 1) + 1;
                },
            }),
            retryMs: retryMsDisplay,
        },
        fallbacks: fallbackDisplay,
    }, null, 2));
}));
const planClear = Command.make("clear", {}, () => Effect.gen(function* () {
    const config = yield* ConfigService;
    yield* config.remove("planRetries");
    yield* config.remove("planRetryMs");
    yield* config.remove("planFallbacks");
    yield* Console.log("Cleared execution plan overrides");
}));
const planReset = Command.make("reset", {}, () => Effect.gen(function* () {
    const config = yield* ConfigService;
    yield* config.remove("planRetries");
    yield* config.remove("planRetryMs");
    yield* config.remove("planFallbacks");
    yield* Console.log("Reset to default execution plan (retries=1, retryMs=1000)");
}));
export const planCommand = Command.make("plan").pipe(Command.withSubcommands([planCreate, planList, planClear, planReset]));
// Very small parser for comma-separated provider:model list
function parseFallbacks(input) {
    const allowed = ["google", "openai", "anthropic"];
    const items = input
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    if (items.length === 0) {
        return { _tag: "Left", left: "--fallbacks provided but empty" };
    }
    const parsed = [];
    for (const item of items) {
        const [providerStr, model] = item.split(":");
        if (!providerStr || !model) {
            return {
                _tag: "Left",
                left: "Each fallback must be in the form provider:model (e.g. openai:gpt-4o-mini)",
            };
        }
        if (!allowed.includes(providerStr)) {
            return {
                _tag: "Left",
                left: `Unsupported provider in fallbacks: ${providerStr}`,
            };
        }
        parsed.push({ provider: providerStr, model });
    }
    return { _tag: "Right", right: parsed };
}
