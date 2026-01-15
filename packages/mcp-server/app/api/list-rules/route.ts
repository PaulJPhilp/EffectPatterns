import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect, Schema as S } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	validateApiKey,
} from "../../../src/auth/apiKey";
import { errorHandler } from "../../../src/server/errorHandler";
import { runWithRuntime } from "../../../src/server/init";
import { ListRulesRequest } from "../../../src/tools/schemas";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleListRules = Effect.fn("list-rules")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const analysis = yield* AnalysisService;

	yield* validateApiKey(request);

	const body = yield* Effect.tryPromise(() => request.json()).pipe(
		Effect.catchAll(() => Effect.succeed({}))
	);
	const decoded = yield* S.decode(ListRulesRequest)(body as any);

	const rules = yield* analysis.listRules(decoded.config);
	const traceId = tracing.getTraceId() ?? "";

	return {
		rules,
		traceId,
		timestamp: new Date().toISOString(),
	};
});

export async function POST(request: NextRequest) {
	const result = await runWithRuntime(
		handleListRules(request).pipe(
			Effect.catchAll((error) => errorHandler(error))
		)
	);

	if (result instanceof Response) {
		return result;
	}

	return NextResponse.json(result, {
		status: 200,
		headers: { "x-trace-id": result.traceId || "" },
	});
}
