import { Effect, Schema as S } from "effect";
import { type NextRequest } from "next/server";
import { createSimpleHandler } from "../../../src/server/routeHandler";
import {
    ReviewCodeService,
} from "../../../src/services/review-code";
import {
    ReviewCodeRequest,
    ReviewCodeResponse,
} from "../../../src/tools/schemas";

const handleReviewCode = (request: NextRequest) => Effect.gen(function* () {
	const reviewCode = yield* ReviewCodeService;

	const body = yield* Effect.tryPromise(() => request.json());
	const decoded = yield* S.decode(ReviewCodeRequest)(body as any);

	const result = yield* reviewCode.reviewCode(
		decoded.code,
		decoded.filePath
	);

	return {
		recommendations: result.recommendations,
		enhancedRecommendations: result.enhancedRecommendations,
		summary: result.summary,
		meta: result.meta,
		markdown: result.markdown,
		traceId: "",
		timestamp: new Date().toISOString(),
	} satisfies typeof ReviewCodeResponse.Type;
});

export const POST = createSimpleHandler(handleReviewCode, {
	requireAuth: true,
});
