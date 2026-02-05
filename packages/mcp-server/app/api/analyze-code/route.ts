import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect, Schema as S } from "effect";
import { type NextRequest } from "next/server";
import { createSimpleHandler } from "../../../src/server/routeHandler";
import {
    AnalyzeCodeRequest,
    AnalyzeCodeResponse,
} from "../../../src/tools/schemas";

const handleAnalyzeCode = (request: NextRequest) => Effect.gen(function* () {
	const analysis = yield* AnalysisService;

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

	return {
		suggestions: result.suggestions,
		findings: result.findings,
		timestamp: result.analyzedAt,
		traceId: "",
	} satisfies typeof AnalyzeCodeResponse.Type;
});

export const POST = createSimpleHandler(handleAnalyzeCode, {
	requireAuth: true,
});
