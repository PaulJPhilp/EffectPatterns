import { Effect } from "effect";
import type { FixId } from "../tools/ids";

export interface RefactorFile {
	readonly filename: string;
	readonly source: string;
}

export type RefactoringId = FixId;

export interface ApplyRefactoringInput {
	readonly refactoringId: RefactoringId;
	readonly files: readonly RefactorFile[];
	readonly preview?: boolean;
}

export interface FileChange {
	readonly filename: string;
	readonly before: string;
	readonly after: string;
}

export interface ApplyRefactoringOutput {
	readonly applied: false;
	readonly changes: readonly FileChange[];
}

const applyReplaceNodeFs = (file: RefactorFile): FileChange | null => {
	if (!/from\s+"node:fs"|from\s+"node:fs\/promises"/.test(file.source)) {
		return null;
	}

	const before = file.source;
	const after = before
		.split("from \"node:fs/promises\"")
		.join("from \"@effect/platform\"")
		.split("from \"node:fs\"")
		.join("from \"@effect/platform\"");

	return { filename: file.filename, before, after };
};

const applyAddValidator = (file: RefactorFile): FileChange | null => {
	if (/filterOrFail\(/.test(file.source)) {
		return null;
	}

	const before = file.source;
	const insert =
		"\nconst validateFilePath = (filePath: string): " +
		"Effect.Effect<string, Error> =>\n" +
		"  Effect.succeed(filePath).pipe(\n" +
		"    Effect.filterOrFail(\n" +
		"      (p) => p.length > 0 && !p.includes(\"..\"),\n" +
		"      () => new Error(`Invalid file path: ${filePath}`)\n" +
		"    )\n" +
		"  );\n";

	const after = before + insert;
	return { filename: file.filename, before, after };
};

const applyOne = (
	id: RefactoringId,
	file: RefactorFile
): FileChange | null => {
	switch (id) {
		case "replace-node-fs":
			return applyReplaceNodeFs(file);
		case "add-filter-or-fail-validator":
			return applyAddValidator(file);
	}
};

export class RefactoringEngineService extends Effect.Service<
	RefactoringEngineService
>()("RefactoringEngineService", {
	effect: Effect.gen(function* () {
		const apply = (
			input: ApplyRefactoringInput
		): Effect.Effect<ApplyRefactoringOutput, never> => {
			const changes = input.files
				.map((f) => applyOne(input.refactoringId, f))
				.filter((c): c is FileChange => c !== null);

			return Effect.succeed({
				applied: false,
				changes,
			});
		};

		return { apply };
	}),
}) { }

export const RefactoringEngineServiceLive =
	RefactoringEngineService.Default;
