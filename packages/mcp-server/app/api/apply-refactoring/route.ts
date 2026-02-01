import { AnalysisService } from "@effect-patterns/analysis-core";
import { FileSystem } from "@effect/platform";
import { Effect, Schema as S } from "effect";
import { type NextRequest } from "next/server";
import {
	ApplyRefactoringRequest,
	ApplyRefactoringResponse,
} from "../../../src/tools/schemas";
import { createRouteHandler } from "../../../src/server/routeHandler";

const handleApplyRefactoring = Effect.fn("apply-refactoring")(function* (
	request: NextRequest
) {
	const analysis = yield* AnalysisService;
	const fs = yield* FileSystem.FileSystem;

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

	// If preview mode (default), just return the changes
	if (decoded.preview !== false) {
		return {
			applied: false,
			changes,
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
	} satisfies typeof ApplyRefactoringResponse.Type;
});

export const POST = createRouteHandler(handleApplyRefactoring, {
	requireAuth: true,
});
