import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect, Schema as S } from "effect";
import { type NextRequest } from "next/server";
import { createSimpleHandler } from "../../../src/server/routeHandler";
import {
    AnalyzeConsistencyRequest,
    AnalyzeConsistencyResponse,
} from "../../../src/tools/schemas";

const handleAnalyzeConsistency = (request: NextRequest) => Effect.gen(function* () {
	const analysis = yield* AnalysisService;

	const body = yield* Effect.tryPromise(() => request.json());
	const decoded = yield* S.decode(AnalyzeConsistencyRequest)(body as any);

	const issues = yield* analysis.analyzeConsistency(decoded.files);

	return {
		issues,
		traceId: "",
		timestamp: new Date().toISOString(),
	} satisfies typeof AnalyzeConsistencyResponse.Type;
});

export const POST = createSimpleHandler(handleAnalyzeConsistency, {
	requireAuth: true,
});
