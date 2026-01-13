import { Effect, Schema as S } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	isAuthenticationError,
	validateApiKey,
} from "../../../src/auth/apiKey";
import { runWithRuntime } from "../../../src/server/init";
import { CodeAnalyzerService } from "../../../src/services/code-analyzer";
import {
	AnalyzeCodeRequest,
	AnalyzeCodeResponse,
} from "../../../src/tools/schemas";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleAnalyzeCode = Effect.fn("analyze-code")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const analyzer = yield* CodeAnalyzerService;

	yield* validateApiKey(request);

	const body = yield* Effect.tryPromise(() => request.json());
	const decoded = yield* S.decode(AnalyzeCodeRequest)(body as any);

	const result = yield* analyzer.analyze({
		source: decoded.source,
		filename: decoded.filename,
		analysisType: decoded.analysisType ?? "all",
	});

	const traceId = tracing.getTraceId() ?? "";

	return {
		suggestions: result.suggestions,
		traceId,
		timestamp: new Date().toISOString(),
	} satisfies typeof AnalyzeCodeResponse.Type;
});

export async function POST(request: NextRequest) {
	try {
		const result = await runWithRuntime(handleAnalyzeCode(request));

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
