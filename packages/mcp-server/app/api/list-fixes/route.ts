import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	isAuthenticationError,
	validateApiKey,
} from "../../../src/auth/apiKey";
import { runWithRuntime } from "../../../src/server/init";
import { RuleRegistryService } from "../../../src/services/rule-registry";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleListFixes = Effect.fn("list-fixes")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const registry = yield* RuleRegistryService;

	yield* validateApiKey(request);

	const fixes = yield* registry.listFixes();
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
