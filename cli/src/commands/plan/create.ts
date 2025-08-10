import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import {
  PlanError_InvalidRetries,
  PlanError_InvalidRetryMs,
  PlanError_InvalidFallbackSpec,
} from "../errors.js";
import { ConfigService } from "../../services/config-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalJson, getGlobalCompact, getGlobalOutputOptions, printJson, printText } from "../_shared.js";
import type { Providers } from "../../services/llm-service/types.js";

const retriesOpt = Options.integer("retries").pipe(
  Options.withDescription("Number of retries for the primary provider"),
  Options.withAlias("r"),
  Options.optional
);

const retryMsOpt = Options.integer("retry-ms").pipe(
  Options.withDescription("Delay between retry attempts in milliseconds"),
  Options.withAlias("d"),
  Options.optional
);

const fallbacksOpt = Options.text("fallbacks").pipe(
  Options.withDescription(
    "Comma-separated fallbacks as provider:model pairs (e.g. openai:gpt-4o-mini,anthropic:claude-3-5-haiku)"
  ),
  Options.optional
);

export const planCreate = Command.make(
  "create",
  {
    retries: retriesOpt,
    retryMs: retryMsOpt,
    fallbacks: fallbacksOpt,
    output: Options.text("output").pipe(Options.optional, Options.withAlias("o")),
  },
  ({ retries, retryMs, fallbacks, output }) =>
    Effect.gen(function* () {
      const outOpt = output as Option.Option<string> | undefined;
      const globalOut = getGlobalOutputOptions()?.outputFile;
      const outputFile = outOpt && outOpt._tag === "Some" ? outOpt.value : globalOut;
      const asJson = (getGlobalJson() as boolean) || Boolean(outputFile);

      const config = yield* ConfigService;

      // Validation will fail with typed errors from ../errors

      if (Option.isNone(retries) && Option.isNone(retryMs) && Option.isNone(fallbacks)) {
        if (asJson) {
          yield* printJson({ updated: {} }, getGlobalCompact(), outputFile ? { outputFile } : undefined);
        } else {
          yield* printText(
            "No values provided. Use --retries, --retry-ms and/or --fallbacks to set the plan.",
            outputFile ? { outputFile } : undefined
          );
        }
        return;
      }

      const updated: { retries?: number; retryMs?: number; fallbacks?: ParsedFallback[] } = {};

      if (Option.isSome(retries)) {
        const n = retries.value;
        if (!Number.isFinite(n) || n < 0) {
          return yield* Effect.fail(
            new PlanError_InvalidRetries({ value: Number(n) })
          );
        }
        yield* config.set("planRetries", String(n));
        updated.retries = n;
        if (!asJson) {
          yield* printText(`Set planRetries=${n}`, outputFile ? { outputFile } : undefined);
        }
      }

      if (Option.isSome(retryMs)) {
        const ms = retryMs.value;
        if (!Number.isFinite(ms) || ms < 0) {
          return yield* Effect.fail(
            new PlanError_InvalidRetryMs({ value: Number(ms) })
          );
        }
        yield* config.set("planRetryMs", String(ms));
        updated.retryMs = ms;
        if (!asJson) {
          yield* printText(`Set planRetryMs=${ms}`, outputFile ? { outputFile } : undefined);
        }
      }

      if (Option.isSome(fallbacks)) {
        const parsed = parseFallbacks(fallbacks.value);
        if (parsed._tag === "Left") {
          return yield* Effect.fail(
            new PlanError_InvalidFallbackSpec({ reason: parsed.left })
          );
        }
        const fallbacksArray = parsed.right;
        yield* config.set("planFallbacks", JSON.stringify(fallbacksArray));
        updated.fallbacks = fallbacksArray;
        if (!asJson) {
          yield* printText(
            `Set planFallbacks=${JSON.stringify(fallbacksArray)}`,
            outputFile ? { outputFile } : undefined
          );
        }
      }

      if (asJson) {
        yield* printJson(
          { updated },
          getGlobalCompact(),
          outputFile ? { outputFile } : undefined
        );
      }
    })
);

interface ParsedFallback {
  provider: Providers;
  model: string;
}

// Very small parser for comma-separated provider:model list
function parseFallbacks(
  input: string
):
  | { _tag: "Left"; left: string }
  | { _tag: "Right"; right: ParsedFallback[] } {
  const allowed: Providers[] = ["google", "openai", "anthropic"];
  const items = input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (items.length === 0) {
    return { _tag: "Left", left: "--fallbacks provided but empty" };
  }
  const parsed: ParsedFallback[] = [];
  for (const item of items) {
    const [providerStr, model] = item.split(":");
    if (!providerStr || !model) {
      return {
        _tag: "Left",
        left:
          "Each fallback must be in the form provider:model (e.g. openai:gpt-4o-mini)",
      };
    }
    if (!allowed.includes(providerStr as Providers)) {
      return {
        _tag: "Left",
        left: `Unsupported provider in fallbacks: ${providerStr}`,
      };
    }
    parsed.push({ provider: providerStr as Providers, model });
  }
  return { _tag: "Right", right: parsed };
}
