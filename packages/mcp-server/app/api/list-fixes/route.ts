import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect } from "effect";
import { type NextRequest } from "next/server";
import { createRouteHandler } from "../../../src/server/routeHandler";

const handleListFixes = Effect.fn("list-fixes")(function* (
	request: NextRequest
) {
	const analysis = yield* AnalysisService;

	const fixes = yield* analysis.listFixes();

	return {
		fixes,
	};
});

export const POST = createRouteHandler(handleListFixes, {
	requireAuth: true,
});
