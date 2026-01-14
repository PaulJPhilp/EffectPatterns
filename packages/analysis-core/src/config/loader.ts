import { Effect, Schema } from "effect";
import { ConfigParseError } from "./errors";
import { AnalysisConfigSchema } from "./schema";
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
		Effect.flatMap((raw) =>
			Schema.decodeUnknown(AnalysisConfigSchema)(raw).pipe(
				Effect.mapError((cause) =>
					new ConfigParseError({
						message: "Invalid analysis config schema",
						cause,
					})
				)
			)
		)
	);
