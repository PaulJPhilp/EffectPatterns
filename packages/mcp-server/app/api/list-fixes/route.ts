import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect } from "effect";
import { type NextRequest } from "next/server";
import { createSimpleHandler } from "../../../src/server/routeHandler";

const handleListFixes = (_request: NextRequest) => Effect.gen(function* () {
	const analysis = yield* AnalysisService;

	const fixes = yield* analysis.listFixes();

	return {
		fixes,
	};
});

export const POST = createSimpleHandler(handleListFixes, {
	requireAuth: true,
});
