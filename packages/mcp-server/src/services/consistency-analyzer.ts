import { Effect } from "effect";

export interface SourceFile {
	readonly filename: string;
	readonly source: string;
}

export interface ConsistencyIssue {
	readonly id: string;
	readonly title: string;
	readonly message: string;
	readonly severity: "low" | "medium" | "high";
	readonly filenames: readonly string[];
}

export interface AnalyzeConsistencyInput {
	readonly files: readonly SourceFile[];
}

export interface AnalyzeConsistencyOutput {
	readonly issues: readonly ConsistencyIssue[];
}

const hasNodeFs = (source: string): boolean =>
	/from\s+"node:fs"|from\s+"node:fs\/promises"/.test(source);

const hasPlatformFs = (source: string): boolean =>
	/from\s+"@effect\/platform"/.test(source) && /FileSystem/.test(source);

const hasFilterOrFail = (source: string): boolean =>
	/filterOrFail\(/.test(source);

const detectInconsistencies = (
	files: readonly SourceFile[]
): readonly ConsistencyIssue[] => {
	const issues: Array<ConsistencyIssue> = [];

	const nodeFsFiles = files.filter((f) => hasNodeFs(f.source));
	const platformFsFiles = files.filter((f) => hasPlatformFs(f.source));

	if (nodeFsFiles.length > 0 && platformFsFiles.length > 0) {
		issues.push({
			id: "mixed-fs",
			title: "Mixed filesystem abstractions",
			message:
				"Some files use node:fs while others use @effect/platform FileSystem. " +
				"Consider standardizing on @effect/platform.",
			severity: "medium",
			filenames: files
				.filter((f) => hasNodeFs(f.source) || hasPlatformFs(f.source))
				.map((f) => f.filename),
		});
	}

	const validationFiles = files.filter((f) => hasFilterOrFail(f.source));
	if (validationFiles.length > 0 && validationFiles.length < files.length) {
		issues.push({
			id: "mixed-validation",
			title: "Inconsistent validation approach",
			message:
				"Some files use Effect.filterOrFail validation but others do not. " +
				"Consider adding boundary validation consistently.",
			severity: "low",
			filenames: files
				.filter((f) => !hasFilterOrFail(f.source))
				.map((f) => f.filename),
		});
	}

	return issues;
};

export class ConsistencyAnalyzerService extends Effect.Service<
	ConsistencyAnalyzerService
>()("ConsistencyAnalyzerService", {
	effect: Effect.gen(function* () {
		const analyze = (
			input: AnalyzeConsistencyInput
		): Effect.Effect<AnalyzeConsistencyOutput, never> =>
			Effect.succeed({
				issues: detectInconsistencies(input.files),
			});

		return { analyze };
	}),
}) { }

export const ConsistencyAnalyzerServiceLive =
	ConsistencyAnalyzerService.Default;
