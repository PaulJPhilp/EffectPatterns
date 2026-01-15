import { Effect, Schema as S } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	isAuthenticationError,
	validateApiKey,
} from "../../../src/auth/apiKey";
import { runWithRuntime } from "../../../src/server/init";
import {
	FileSizeError,
	NonTypeScriptError,
	ReviewCodeService,
} from "../../../src/services/review-code";
import {
	ReviewCodeRequest,
	ReviewCodeResponse,
} from "../../../src/tools/schemas";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleReviewCode = Effect.fn("review-code")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const reviewCode = yield* ReviewCodeService;

	yield* validateApiKey(request);

	const body = yield* Effect.tryPromise(() => request.json());
	const decoded = yield* S.decode(ReviewCodeRequest)(body as any);

	const result = yield* reviewCode.reviewCode(
		decoded.code,
		decoded.filePath
	);

	const traceId = tracing.getTraceId() ?? "";

	return {
		recommendations: result.recommendations,
		meta: result.meta,
		markdown: result.markdown,
		traceId,
		timestamp: new Date().toISOString(),
	} satisfies typeof ReviewCodeResponse.Type;
});

export async function POST(request: NextRequest) {
	try {
		const result = await runWithRuntime(handleReviewCode(request));

		return NextResponse.json(result, {
			status: 200,
			headers: { "x-trace-id": result.traceId || "" },
		});
	} catch (error) {
		if (isAuthenticationError(error)) {
			return NextResponse.json({ error: error.message }, { status: 401 });
		}

		if (error instanceof FileSizeError) {
			return NextResponse.json(
				{
					error: error.message,
					maxSize: error.maxSize,
					actualSize: error.size,
				},
				{ status: 413 }
			);
		}

		if (error instanceof NonTypeScriptError) {
			return NextResponse.json(
				{
					error: error.message,
					filePath: error.filePath,
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 400 }
		);
	}
}
