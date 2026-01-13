import { Effect, Schema as S } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	isAuthenticationError,
	validateApiKey,
} from "../../../src/auth/apiKey";
import { runWithRuntime } from "../../../src/server/init";
import { ConsistencyAnalyzerService } from "../../../src/services/consistency-analyzer";
import {
	AnalyzeConsistencyRequest,
	AnalyzeConsistencyResponse,
} from "../../../src/tools/schemas";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleAnalyzeConsistency = Effect.fn("analyze-consistency")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const analyzer = yield* ConsistencyAnalyzerService;

	yield* validateApiKey(request);

	const body = yield* Effect.tryPromise(() => request.json());
	const decoded = yield* S.decode(AnalyzeConsistencyRequest)(body as any);

	const analysis = yield* analyzer.analyze({ files: decoded.files });

	const traceId = tracing.getTraceId() ?? "";

	return {
		issues: analysis.issues,
		traceId,
		timestamp: new Date().toISOString(),
	} satisfies typeof AnalyzeConsistencyResponse.Type;
});

export async function POST(request: NextRequest) {
	try {
		const result = await runWithRuntime(handleAnalyzeConsistency(request));

		return NextResponse.json(result, {
			status: 200,
			headers: { "x-trace-id": result.traceId || "" },
		});
	} catch (error) {
		if (isAuthenticationError(error)) {
			return NextResponse.json({ error: error.message }, { status: 401 });
		}

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 400 }
		);
	}
}
