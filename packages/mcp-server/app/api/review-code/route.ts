import { Effect, Schema as S } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	validateApiKey,
} from "../../../src/auth/apiKey";
import { errorHandler } from "../../../src/server/errorHandler";
import { runWithRuntime } from "../../../src/server/init";
import {
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
	const result = await runWithRuntime(
		handleReviewCode(request).pipe(
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
