import { AnalysisService } from "@effect-patterns/analysis-core";
import { FileSystem } from "@effect/platform";
import { Effect, Schema as S } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
	validateApiKey,
} from "../../../src/auth/apiKey";
import { errorHandler } from "../../../src/server/errorHandler";
import { runWithRuntime } from "../../../src/server/init";
import {
	ApplyRefactoringRequest,
	ApplyRefactoringResponse,
} from "../../../src/tools/schemas";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleApplyRefactoring = Effect.fn("apply-refactoring")(function* (
	request: NextRequest
) {
	const tracing = yield* TracingService;
	const analysis = yield* AnalysisService;
	const fs = yield* FileSystem.FileSystem;

	yield* validateApiKey(request);

	const body = yield* Effect.tryPromise(() => request.json());
	const decoded = yield* S.decode(ApplyRefactoringRequest)(body as any);

	const refactoringIds =
		decoded.refactoringIds && decoded.refactoringIds.length > 0
			? decoded.refactoringIds
			: decoded.refactoringId
				? [decoded.refactoringId]
				: [];

	const changes = yield* analysis.applyRefactorings(
		refactoringIds,
		decoded.files
	);

	const traceId = tracing.getTraceId() ?? "";

	// If preview mode (default), just return the changes
	if (decoded.preview !== false) {
		return {
			applied: false,
			changes,
			traceId,
			timestamp: new Date().toISOString(),
		} satisfies typeof ApplyRefactoringResponse.Type;
	}

	// Write mode: apply changes to files
	// Only write if we have actual changes
	if (changes.length > 0) {
		yield* Effect.forEach(
			changes,
			(change) =>
				fs.writeFileString(change.filename, change.after).pipe(
					Effect.catchAll((err) =>
						Effect.logError(`Failed to write ${change.filename}: ${err}`)
					)
				),
			{ concurrency: 1 }
		);
	}

	return {
		applied: true,
		changes,
		traceId,
		timestamp: new Date().toISOString(),
	} satisfies typeof ApplyRefactoringResponse.Type;
});

export async function POST(request: NextRequest) {
	const result = await runWithRuntime(
		handleApplyRefactoring(request).pipe(
			Effect.catchAll((error) => errorHandler(error))
		)
	);

	if (result instanceof Response) {
		return result;
	}

	return NextResponse.json(result, {
		status: 200,
		headers: { "x-trace-id": result.traceId || "" },
	});
}
