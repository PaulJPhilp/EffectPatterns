import { Effect, Schema as S } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	isAuthenticationError,
	validateApiKey,
} from "../../../src/auth/apiKey";
import {
	validateTierAccess,
	isTierAccessError
} from "../../../src/auth/tierAccess";
import { runWithRuntime } from "../../../src/server/init";
import { PatternGeneratorService } from "../../../src/services/pattern-generator";
import {
	GeneratePatternRequest,
	GeneratePatternResponse,
} from "../../../src/tools/schemas";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleGeneratePattern = Effect.fn("generate-pattern")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const generator = yield* PatternGeneratorService;

	yield* validateApiKey(request);
	yield* validateTierAccess(request);

	const body = yield* Effect.tryPromise({
		try: () => request.json(),
		catch: (error) => new Error(`Invalid JSON: ${error}`),
	});
	const decoded = yield* S.decode(GeneratePatternRequest)(body as any);

	const generated = yield* generator.generate({
		patternId: decoded.patternId,
		variables: decoded.variables,
	});

	const traceId = tracing.getTraceId() ?? "";

	return {
		patternId: generated.patternId,
		name: generated.name,
		imports: [...generated.imports],
		code: generated.code,
		traceId,
		timestamp: new Date().toISOString(),
	} satisfies typeof GeneratePatternResponse.Type;
});

export async function POST(request: NextRequest) {
	const result = await runWithRuntime(
		handleGeneratePattern(request).pipe(
			Effect.map((data) =>
				NextResponse.json(data, { status: 200 })
			),
			Effect.catchAll((error) => {
				if (isAuthenticationError(error)) {
					return Effect.succeed(
						NextResponse.json({ error: error.message }, { status: 401 })
					);
				}

				if (isTierAccessError(error)) {
					return Effect.succeed(
						NextResponse.json(
							{
								error: error.message,
								tier: error.tierMode,
								upgradeMessage: error.upgradeMessage,
							},
							{
								status: 402,
								headers: {
									"X-Tier-Error": "feature-gated",
								},
							}
						)
					);
				}

				return Effect.succeed(
					NextResponse.json(
						{ error: error instanceof Error ? error.message : String(error) },
						{ status: 400 }
					)
				);
			})
		)
	);

	return result;
}
