import { Effect } from "effect";
import { ConfigParseError } from "./errors";
import { isRuleConfig } from "./schema";
import type { AnalysisConfig } from "./types";

export const parseConfigJson = (
	json: string
): Effect.Effect<AnalysisConfig, ConfigParseError> =>
	Effect.try({
		try: () => JSON.parse(json) as unknown,
		catch: (cause) =>
			new ConfigParseError({
				message: "Invalid JSON in analysis config",
				cause,
			}),
	}).pipe(
		Effect.flatMap((raw) => {
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
				return Effect.fail(
					new ConfigParseError({
						message: "Analysis config must be a JSON object",
					})
				);
			}

			const obj = raw as Record<string, unknown>;
			let config: AnalysisConfig = {};

			if (obj.ignore !== undefined) {
				if (!Array.isArray(obj.ignore) || obj.ignore.some((x) => typeof x !== "string")) {
					return Effect.fail(
						new ConfigParseError({
							message: "analysis config: ignore must be an array of strings",
						})
					);
				}
				config = { ...config, ignore: obj.ignore as string[] };
			}

			if (obj.include !== undefined) {
				if (!Array.isArray(obj.include) || obj.include.some((x) => typeof x !== "string")) {
					return Effect.fail(
						new ConfigParseError({
							message: "analysis config: include must be an array of strings",
						})
					);
				}
				config = { ...config, include: obj.include as string[] };
			}

			if (obj.rules !== undefined) {
				if (typeof obj.rules !== "object" || obj.rules === null || Array.isArray(obj.rules)) {
					return Effect.fail(
						new ConfigParseError({
							message: "analysis config: rules must be an object",
						})
					);
				}

				const rulesObj = obj.rules as Record<string, unknown>;
				const out: Record<string, unknown> = {};
				for (const [key, value] of Object.entries(rulesObj)) {
					if (!isRuleConfig(value)) {
						return Effect.fail(
							new ConfigParseError({
								message: `analysis config: invalid rule config for ${key}`,
							})
						);
					}
					out[key] = value;
				}

				config = { ...config, rules: out as any };
			}

			return Effect.succeed(config);
		})
	);
