import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	isAuthenticationError,
	validateApiKey,
} from "../../../src/auth/apiKey";
import { runWithRuntime } from "../../../src/server/init";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleListFixes = Effect.fn("list-fixes")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const analysis = yield* AnalysisService;

	yield* validateApiKey(request);

	const fixes = yield* analysis.listFixes();
	const traceId = tracing.getTraceId() ?? "";

	return {
		fixes,
		traceId,
		timestamp: new Date().toISOString(),
	};
});

export async function POST(request: NextRequest) {
	try {
		const result = await runWithRuntime(handleListFixes(request));

		return NextResponse.json(result, {
			status: 200,
			headers: { "x-trace-id": result.traceId || "" },
		});
	} catch (error) {
		if (isAuthenticationError(error)) {
			return NextResponse.json({ error: error.message }, { status: 401 });
		}

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 400 }
		);
	}
}
