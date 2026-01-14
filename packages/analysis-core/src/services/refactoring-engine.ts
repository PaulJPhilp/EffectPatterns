import { Effect } from "effect";
import { Node, SyntaxKind } from "ts-morph";
import ts from "typescript";
import { ASTUtils } from "../tools/ast-utils";
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
	after: string;
}

/**
 * Output of applying refactorings.
 */
export interface ApplyRefactoringOutput {
	readonly applied: boolean;
	readonly changes: readonly FileChange[];
}

const applyReplaceNodeFs = (file: RefactorFile): FileChange | null => {
	if (!/from\s+\"node:fs\"|from\s+\"node:fs\/promises\"/.test(file.source)) {
		return null;
	}

	const sourceFile = ASTUtils.createSourceFile(file.filename, file.source);
	let changed = false;

	sourceFile.getImportDeclarations().forEach((imp) => {
		const specifier = imp.getModuleSpecifierValue();
		if (specifier === "node:fs" || specifier === "node:fs/promises") {
			imp.setModuleSpecifier("@effect/platform");
			changed = true;
		}
	});

	if (!changed) return null;
	return { filename: file.filename, before: file.source, after: sourceFile.getFullText() };
};

const applyAddValidator = (file: RefactorFile): FileChange | null => {
	const sourceFile = ASTUtils.createSourceFile(file.filename, file.source);

	// Avoid adding a second validator if filterOrFail is already used
	const hasFilterOrFail = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
		.some(id => id.getText() === "filterOrFail");
	
	if (hasFilterOrFail) return null;

	let changed = false;

	// Ensure we have `Effect` imported from "effect"
	const effectImport = sourceFile.getImportDeclaration(decl => 
		decl.getModuleSpecifierValue() === "effect"
	);

	if (effectImport) {
		const namedImports = effectImport.getNamedImports();
		const hasEffect = namedImports.some(n => n.getName() === "Effect");
		const isNamespace = effectImport.getNamespaceImport() !== undefined;

		if (!hasEffect && !isNamespace) {
			effectImport.addNamedImport("Effect");
			changed = true;
		}
	} else {
		sourceFile.addImportDeclaration({
			moduleSpecifier: "effect",
			namedImports: ["Effect"]
		});
		changed = true;
	}

	// Append validator at end of file
	const validatorCode = `
const validateFilePath = (filePath: string) =>
  Effect.succeed(filePath).pipe(
    Effect.filterOrFail(
      (p) => p.length > 0 && !p.includes(".."),
      () => new Error(\`Invalid file path: \${filePath}\`)
    )
  );
`;

	sourceFile.addStatements(validatorCode);
	changed = true;

	if (!changed) return null;
	return { filename: file.filename, before: file.source, after: sourceFile.getFullText() };
};

const applyWrapEffectMapCallback = (file: RefactorFile): FileChange | null => {
	const sourceFile = ASTUtils.createSourceFile(file.filename, file.source);
	let changed = false;

	sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
		const expr = callExpr.getExpression();
		if (!Node.isPropertyAccessExpression(expr)) return;

		const obj = expr.getExpression();
		if (obj.getText() === "Effect" && expr.getName() === "map") {
			const args = callExpr.getArguments();
			if (args.length === 1 && Node.isIdentifier(args[0])) {
				changed = true;
				const argText = args[0].getText();
				args[0].replaceWithText(`(x) => ${argText}(x)`);
			}
		}
	});

	if (!changed) return null;
	return { filename: file.filename, before: file.source, after: sourceFile.getFullText() };
};

const applyReplaceContextTag = (file: RefactorFile): FileChange | null => {
	if (!/Context\.(Tag|GenericTag)/.test(file.source)) {
		return null;
	}

	const sourceFile = ASTUtils.createSourceFile(file.filename, file.source);
	let changed = false;

	// 1. Update imports
	const effectImport = sourceFile.getImportDeclaration((decl) =>
		decl.getModuleSpecifierValue() === "effect"
	);

	if (effectImport) {
		const namedImports = effectImport.getNamedImports();
		const hasContext = namedImports.some((n) => n.getName() === "Context");
		const hasEffect = namedImports.some((n) => n.getName() === "Effect");

		if (hasContext && !hasEffect) {
			effectImport.addNamedImport("Effect");
			changed = true;
		}
	}

	// 2. Replace Variable Statements
	const variables = sourceFile.getVariableDeclarations().filter((decl) => {
		const init = decl.getInitializer();
		if (!Node.isCallExpression(init)) return false;
		
		const expr = init.getExpression();
		if (!Node.isPropertyAccessExpression(expr)) return false;
		
		const obj = expr.getExpression();
		return Node.isIdentifier(obj) && obj.getText() === "Context" &&
			(expr.getName() === "Tag" || expr.getName() === "GenericTag");
	});

	for (const decl of variables) {
		const className = decl.getName();
		const statement = decl.getVariableStatement();
		if (!statement) continue;

		const newClassCode = `export class ${className} extends Effect.Service<${className}>()("${className}", {\n\tsync: () => ({})\n}) {}`;
		
		statement.replaceWithText(newClassCode);
		changed = true;
	}

	if (!changed) return null;
	return { filename: file.filename, before: file.source, after: sourceFile.getFullText() };
};

const applyReplacePromiseAll = (file: RefactorFile): FileChange | null => {
	if (!/Promise\.all/.test(file.source)) {
		return null;
	}

	const sourceFile = ASTUtils.createSourceFile(file.filename, file.source);
	let changed = false;

	sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
		const expr = callExpr.getExpression();
		if (!Node.isPropertyAccessExpression(expr)) return;

		const obj = expr.getExpression();
		if (Node.isIdentifier(obj) && obj.getText() === "Promise" && expr.getName() === "all") {
			changed = true;
			expr.replaceWithText("Effect.all");
		}
	});

	if (!changed) return null;
	return { filename: file.filename, before: file.source, after: sourceFile.getFullText() };
};

const applyReplaceConsoleLog = (file: RefactorFile): FileChange | null => {
	if (!/console\.(log|warn|error|info)/.test(file.source)) {
		return null;
	}

	const sourceFile = ASTUtils.createSourceFile(file.filename, file.source);
	let changed = false;

	sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
		const expr = callExpr.getExpression();
		if (!Node.isPropertyAccessExpression(expr)) return;
		
		const obj = expr.getExpression();
		if (!Node.isIdentifier(obj) || obj.getText() !== "console") return;

		const method = expr.getName();
		const mapped =
			method === "log" || method === "info"
				? "log"
				: method === "warn"
					? "logWarning"
					: method === "error"
						? "logError"
						: null;

		if (mapped !== null) {
			changed = true;
			expr.replaceWithText(`Effect.${mapped}`);
		}
	});

	if (!changed) return null;
	return { filename: file.filename, before: file.source, after: sourceFile.getFullText() };
};

const applyAddSchemaDecode = (file: RefactorFile): FileChange | null => {
	if (!/JSON\.parse/.test(file.source)) {
		return null;
	}

	const sourceFile = ASTUtils.createSourceFile(file.filename, file.source);
	let changed = false;

	sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
		const expr = callExpr.getExpression();
		if (!Node.isPropertyAccessExpression(expr)) return;

		const obj = expr.getExpression();
		if (Node.isIdentifier(obj) && obj.getText() === "JSON" && expr.getName() === "parse") {
			changed = true;
			callExpr.replaceWithText(`(/* TODO: Use Schema.decodeUnknown for type-safe parsing */ (${callExpr.getText()}))`);
		}
	});

	if (!changed) return null;
	return { filename: file.filename, before: file.source, after: sourceFile.getFullText() };
};

const applyOne = (id: RefactoringId, file: RefactorFile): FileChange | null => {
	switch (id) {
		case "replace-node-fs":
			return applyReplaceNodeFs(file);
		case "add-filter-or-fail-validator":
			return applyAddValidator(file);
		case "wrap-effect-map-callback":
			return applyWrapEffectMapCallback(file);
		case "replace-context-tag":
			return applyReplaceContextTag(file);
		case "replace-promise-all":
			return applyReplacePromiseAll(file);
		case "replace-console-log":
			return applyReplaceConsoleLog(file);
		case "add-schema-decode":
			return applyAddSchemaDecode(file);
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