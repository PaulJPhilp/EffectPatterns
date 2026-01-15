import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	validateApiKey,
} from "../../../src/auth/apiKey";
import { errorHandler } from "../../../src/server/errorHandler";
import { runWithRuntime } from "../../../src/server/init";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleListFixes = Effect.fn("list-fixes")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const analysis = yield* AnalysisService;

	yield* validateApiKey(request);

	const fixes = yield* analysis.listFixes();
	const traceId = tracing.getTraceId() ?? "";

	return {
		fixes,
		traceId,
		timestamp: new Date().toISOString(),
	};
});

export async function POST(request: NextRequest) {
	const result = await runWithRuntime(
		handleListFixes(request).pipe(
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
