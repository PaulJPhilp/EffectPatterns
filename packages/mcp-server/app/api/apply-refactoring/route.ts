import { Effect, Schema as S } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	isAuthenticationError,
	validateApiKey,
} from "../../../src/auth/apiKey";
import { runWithRuntime } from "../../../src/server/init";
import { RefactoringEngineService } from "../../../src/services/refactoring-engine";
import {
	ApplyRefactoringRequest,
	ApplyRefactoringResponse,
} from "../../../src/tools/schemas";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleApplyRefactoring = Effect.fn("apply-refactoring")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const engine = yield* RefactoringEngineService;

	yield* validateApiKey(request);

	const body = yield* Effect.tryPromise(() => request.json());
	const decoded = yield* S.decode(ApplyRefactoringRequest)(body as any);

	const output = yield* engine.apply({
		refactoringId: decoded.refactoringId,
		refactoringIds: decoded.refactoringIds,
		files: decoded.files,
		preview: true,
	});

	const traceId = tracing.getTraceId() ?? "";

	return {
		applied: output.applied,
		changes: output.changes,
		traceId,
		timestamp: new Date().toISOString(),
	} satisfies typeof ApplyRefactoringResponse.Type;
});

export async function POST(request: NextRequest) {
	try {
		const result = await runWithRuntime(handleApplyRefactoring(request));

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
