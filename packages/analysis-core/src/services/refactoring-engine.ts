import { Effect } from "effect";
import ts from "typescript";
import type { FixId } from "../tools/ids";

/**
 * In-memory representation of a file to refactor.
 */
export interface RefactorFile {
	readonly filename: string;
	readonly source: string;
}

/**
 * Alias for fix IDs, used when applying one or more refactorings.
 */
export type RefactoringId = FixId;

/**
 * Input to apply refactorings.
 *
 * Note: this engine is preview-only and always returns `applied: false`.
 */
export interface ApplyRefactoringInput {
	readonly refactoringId?: RefactoringId;
	readonly refactoringIds?: readonly RefactoringId[];
	readonly files: readonly RefactorFile[];
	readonly preview?: boolean;
}

/**
 * A preview change for a single file.
 */
export interface FileChange {
	readonly filename: string;
	readonly before: string;
	readonly after: string;
}

/**
 * Output of applying refactorings.
 */
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

const applyWrapEffectMapCallback = (file: RefactorFile): FileChange | null => {
	const before = file.source;
	const sourceFile = ts.createSourceFile(
		file.filename,
		before,
		ts.ScriptTarget.Latest,
		true,
		file.filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
	);

	let changed = false;
	const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
		const visit: ts.Visitor = (node) => {
			if (ts.isCallExpression(node) && node.arguments.length === 1) {
				const [arg] = node.arguments;
				if (
					ts.isPropertyAccessExpression(node.expression) &&
					ts.isIdentifier(node.expression.expression) &&
					node.expression.expression.text === "Effect" &&
					node.expression.name.text === "map" &&
					ts.isIdentifier(arg)
				) {
					changed = true;
					const param = ts.factory.createParameterDeclaration(
						undefined,
						undefined,
						"x",
						undefined,
						undefined,
						undefined
					);
					const body = ts.factory.createCallExpression(arg, undefined, [
						ts.factory.createIdentifier("x"),
					]);
					const arrow = ts.factory.createArrowFunction(
						undefined,
						undefined,
						[param],
						undefined,
						ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
						body
					);
					return ts.factory.updateCallExpression(
						node,
						node.expression,
						node.typeArguments,
						[arrow]
					);
				}
			}
			return ts.visitEachChild(node, visit, context);
		};
		return (sf) => ts.visitNode(sf, visit) as ts.SourceFile;
	};

	const result = ts.transform(sourceFile, [transformer]);
	const transformed = result.transformed[0];
	result.dispose();

	if (!changed) return null;

	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
	const after = printer.printFile(transformed);
	if (after === before) return null;
	return { filename: file.filename, before, after };
};

const applyOne = (id: RefactoringId, file: RefactorFile): FileChange | null => {
	switch (id) {
		case "replace-node-fs":
			return applyReplaceNodeFs(file);
		case "add-filter-or-fail-validator":
			return applyAddValidator(file);
		case "wrap-effect-map-callback":
			return applyWrapEffectMapCallback(file);
	}
};

const normalizeIds = (input: ApplyRefactoringInput): readonly RefactoringId[] => {
	if (input.refactoringIds && input.refactoringIds.length > 0) {
		return input.refactoringIds;
	}
	if (input.refactoringId) {
		return [input.refactoringId];
	}
	return [];
};

const applyManyToFile = (
	ids: readonly RefactoringId[],
	file: RefactorFile
): FileChange | null => {
	const before = file.source;
	let current = before;

	for (const id of ids) {
		const change = applyOne(id, { filename: file.filename, source: current });
		if (change) {
			current = change.after;
		}
	}

	if (current === before) return null;
	return { filename: file.filename, before, after: current };
};

/**
 * Service for applying refactorings to files.
 *
 * Note: this engine is preview-only and always returns `applied: false`.
 */
export class RefactoringEngineService extends Effect.Service<
	RefactoringEngineService
>()("RefactoringEngineService", {
	effect: Effect.gen(function* () {
		const apply = (
			input: ApplyRefactoringInput
		): Effect.Effect<ApplyRefactoringOutput, never> => {
			const ids = normalizeIds(input);
			const changes = input.files
				.map((f) => applyManyToFile(ids, f))
				.filter((c): c is FileChange => c !== null);

			return Effect.succeed({
				applied: false,
				changes,
			});
		};

		return { apply };
	}),
}) { }

/**
 * Default live layer for `RefactoringEngineService`.
 */
export const RefactoringEngineServiceLive =
	RefactoringEngineService.Default;
