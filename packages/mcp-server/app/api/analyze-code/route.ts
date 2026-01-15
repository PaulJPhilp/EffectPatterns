import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect, Schema as S } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	validateApiKey,
} from "../../../src/auth/apiKey";
import { runWithRuntime } from "../../../src/server/init";
import { errorHandler } from "../../../src/server/errorHandler";
import {
	AnalyzeCodeRequest,
	AnalyzeCodeResponse,
} from "../../../src/tools/schemas";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleAnalyzeCode = Effect.fn("analyze-code")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const analysis = yield* AnalysisService;

	yield* validateApiKey(request);

	const body = yield* Effect.tryPromise(() => request.json());
	const decoded = yield* S.decode(AnalyzeCodeRequest)(body as any);

	const result = yield* analysis.analyzeFile(
		decoded.filename ?? "unknown.ts",
		decoded.source,
		{
			analysisType: decoded.analysisType,
			config: decoded.config,
		}
	);

	const traceId = tracing.getTraceId() ?? "";

	return {
		suggestions: result.suggestions,
		findings: result.findings,
		traceId,
		timestamp: result.analyzedAt,
	} satisfies typeof AnalyzeCodeResponse.Type;
});

export async function POST(request: NextRequest) {
	const result = await runWithRuntime(
		handleAnalyzeCode(request).pipe(
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
