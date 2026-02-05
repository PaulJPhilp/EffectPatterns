import { Effect, Schema as S } from "effect";
import { type NextRequest } from "next/server";
import {
	ReviewCodeService,
} from "../../../src/services/review-code";
import {
	ReviewCodeRequest,
	ReviewCodeResponse,
} from "../../../src/tools/schemas";
import { createRouteHandler } from "../../../src/server/routeHandler";

const handleReviewCode = Effect.fn("review-code")(function* (
	request: NextRequest
) {
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
	} satisfies typeof ReviewCodeResponse.Type;
});

export const POST = createRouteHandler(handleReviewCode, {
	requireAuth: true,
});
