import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect, Schema as S } from "effect";
import { type NextRequest } from "next/server";
import { createRouteHandler } from "../../../src/server/routeHandler";
import { ListRulesRequest } from "../../../src/tools/schemas";

const handleListRules = (request: NextRequest) => Effect.gen(function* () {
	const analysis = yield* AnalysisService;

	const body = yield* Effect.tryPromise(() => request.json()).pipe(
		Effect.catchAll(() => Effect.succeed({}))
	);
	const decoded = yield* S.decode(ListRulesRequest)(body as any);

	const rules = yield* analysis.listRules(decoded.config);

	return {
		rules,
	};
});

export const POST = createRouteHandler(handleListRules, {
	requireAuth: true,
});
