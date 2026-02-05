import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect, Schema as S } from "effect";
import { type NextRequest } from "next/server";
import {
	AnalyzeConsistencyRequest,
	AnalyzeConsistencyResponse,
} from "../../../src/tools/schemas";
import { createRouteHandler } from "../../../src/server/routeHandler";

const handleAnalyzeConsistency = Effect.fn("analyze-consistency")(function* (
	request: NextRequest
) {
	const analysis = yield* AnalysisService;

	const body = yield* Effect.tryPromise(() => request.json());
	const decoded = yield* S.decode(AnalyzeConsistencyRequest)(body as any);

	const issues = yield* analysis.analyzeConsistency(decoded.files);

	return {
		issues,
	} satisfies typeof AnalyzeConsistencyResponse.Type;
});

export const POST = createRouteHandler(handleAnalyzeConsistency, {
	requireAuth: true,
});
