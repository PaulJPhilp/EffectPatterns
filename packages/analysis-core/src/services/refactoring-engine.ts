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
	readonly applied: boolean;
	readonly changes: readonly FileChange[];
}

const applyReplaceNodeFs = (file: RefactorFile): FileChange | null => {
	if (!/from\s+"node:fs"|from\s+"node:fs\/promises"/.test(file.source)) {
		return null;
	}

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
			if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
				const text = node.moduleSpecifier.text;
				if (text === "node:fs" || text === "node:fs/promises") {
					changed = true;
					return ts.factory.updateImportDeclaration(
						node,
						node.modifiers,
						node.importClause,
						ts.factory.createStringLiteral("@effect/platform"),
						node.assertClause
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

const applyAddValidator = (file: RefactorFile): FileChange | null => {
	const before = file.source;
	const sourceFile = ts.createSourceFile(
		file.filename,
		before,
		ts.ScriptTarget.Latest,
		true,
		file.filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
	);

	// Avoid adding a second validator if filterOrFail is already used
	let hasFilterOrFail = false;
	const scan: (n: ts.Node) => void = (n) => {
		if (hasFilterOrFail) return;
		if (
			ts.isPropertyAccessExpression(n) &&
			ts.isIdentifier(n.expression) &&
			n.expression.text === "Effect" &&
			n.name.text === "filterOrFail"
		) {
			hasFilterOrFail = true;
			return;
		}
		if (ts.isIdentifier(n) && n.text === "filterOrFail") {
			hasFilterOrFail = true;
			return;
		}
		ts.forEachChild(n, scan);
	};
	ts.forEachChild(sourceFile, scan);
	if (hasFilterOrFail) return null;

	let changed = false;

	const transformer: ts.TransformerFactory<ts.SourceFile> = (_context) => {
		return (sf) => {
			const nextStatements: ts.Statement[] = [];

			// Ensure we have `Effect` imported from "effect"
			let effectImportHandled = false;
			for (const stmt of sf.statements) {
				if (
					ts.isImportDeclaration(stmt) &&
					ts.isStringLiteral(stmt.moduleSpecifier) &&
					stmt.moduleSpecifier.text === "effect"
				) {
					effectImportHandled = true;
					const clause = stmt.importClause;
					const namedBindings = clause?.namedBindings;

					// `import * as Effect from "effect";`
					if (namedBindings && ts.isNamespaceImport(namedBindings)) {
						nextStatements.push(stmt);
						continue;
					}

					// `import { ... } from "effect";`
					if (namedBindings && ts.isNamedImports(namedBindings)) {
						const hasEffect = namedBindings.elements.some(
							(e) => e.name.text === "Effect"
						);
						if (hasEffect) {
							nextStatements.push(stmt);
							continue;
						}

						changed = true;
						const nextNamed = ts.factory.updateNamedImports(namedBindings, [
							...namedBindings.elements,
							ts.factory.createImportSpecifier(
								false,
								undefined,
								ts.factory.createIdentifier("Effect")
							),
						]);
						const nextClause = ts.factory.updateImportClause(
							clause!,
							clause!.isTypeOnly,
							clause!.name,
							nextNamed
						);
						nextStatements.push(
							ts.factory.updateImportDeclaration(
								stmt,
								stmt.modifiers,
								nextClause,
								stmt.moduleSpecifier,
								stmt.assertClause
							)
						);
						continue;
					}

					// No named bindings (e.g. `import "effect";`) -> add named import
					changed = true;
					nextStatements.push(
						ts.factory.updateImportDeclaration(
							stmt,
							stmt.modifiers,
							ts.factory.createImportClause(
								false,
								undefined,
								ts.factory.createNamedImports([
									ts.factory.createImportSpecifier(
										false,
										undefined,
										ts.factory.createIdentifier("Effect")
									),
								])
							),
							stmt.moduleSpecifier,
							stmt.assertClause
						)
					);
					continue;
				}

				nextStatements.push(stmt);
			}

			if (!effectImportHandled) {
				changed = true;
				nextStatements.unshift(
					ts.factory.createImportDeclaration(
						undefined,
						ts.factory.createImportClause(
							false,
							undefined,
							ts.factory.createNamedImports([
								ts.factory.createImportSpecifier(
									false,
									undefined,
									ts.factory.createIdentifier("Effect")
								),
							])
						),
						ts.factory.createStringLiteral("effect"),
						undefined
					)
				);
			}

			// Append validator at end of file
			changed = true;
			const filePathId = ts.factory.createIdentifier("filePath");
			const pId = ts.factory.createIdentifier("p");
			const condition = ts.factory.createBinaryExpression(
				ts.factory.createBinaryExpression(
					ts.factory.createPropertyAccessExpression(
						pId,
						ts.factory.createIdentifier("length")
					),
					ts.factory.createToken(ts.SyntaxKind.GreaterThanToken),
					ts.factory.createNumericLiteral("0")
				),
				ts.factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
				ts.factory.createPrefixUnaryExpression(
					ts.SyntaxKind.ExclamationToken,
					ts.factory.createCallExpression(
						ts.factory.createPropertyAccessExpression(
							pId,
							ts.factory.createIdentifier("includes")
						),
						undefined,
						[ts.factory.createStringLiteral("..")]
					)
				)
			);

			const predFn = ts.factory.createArrowFunction(
				undefined,
				undefined,
				[
					ts.factory.createParameterDeclaration(
						undefined,
						undefined,
						pId,
						undefined,
						undefined,
						undefined
					),
				],
				undefined,
				ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
				condition
			);

			const errMsg = ts.factory.createTemplateExpression(
				ts.factory.createTemplateHead("Invalid file path: "),
				[
					ts.factory.createTemplateSpan(
						filePathId,
						ts.factory.createTemplateTail("")
					),
				]
			);

			const errFn = ts.factory.createArrowFunction(
				undefined,
				undefined,
				[],
				undefined,
				ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
				ts.factory.createNewExpression(
					ts.factory.createIdentifier("Error"),
					undefined,
					[errMsg]
				)
			);

			const filterOrFailCall = ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createIdentifier("Effect"),
					ts.factory.createIdentifier("filterOrFail")
				),
				undefined,
				[predFn, errFn]
			);

			const pipeCall = ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createCallExpression(
						ts.factory.createPropertyAccessExpression(
							ts.factory.createIdentifier("Effect"),
							ts.factory.createIdentifier("succeed")
						),
						undefined,
						[filePathId]
					),
					ts.factory.createIdentifier("pipe")
				),
				undefined,
				[filterOrFailCall]
			);

			const validatorDecl = ts.factory.createVariableStatement(
				undefined,
				ts.factory.createVariableDeclarationList(
					[
						ts.factory.createVariableDeclaration(
							ts.factory.createIdentifier("validateFilePath"),
							undefined,
							undefined,
							ts.factory.createArrowFunction(
								undefined,
								undefined,
								[
									ts.factory.createParameterDeclaration(
										undefined,
										undefined,
										filePathId,
										undefined,
										ts.factory.createKeywordTypeNode(
											ts.SyntaxKind.StringKeyword
										),
										undefined
									),
								],
								undefined,
								ts.factory.createToken(
									ts.SyntaxKind.EqualsGreaterThanToken
								),
								pipeCall
							)
						)
					],
					ts.NodeFlags.Const
				)
			);

			nextStatements.push(validatorDecl);
			return ts.factory.updateSourceFile(sf, nextStatements);
		};
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

const applyReplaceContextTag = (file: RefactorFile): FileChange | null => {
	if (!/Context\.(Tag|GenericTag)/.test(file.source)) {
		return null;
	}

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
		const visitStatement = (stmt: ts.Statement): ts.Statement => {
			// Update `import { Context } from "effect"` -> add `Effect`
			if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
				if (stmt.moduleSpecifier.text === "effect" && stmt.importClause?.namedBindings) {
					if (ts.isNamedImports(stmt.importClause.namedBindings)) {
						const hasContext = stmt.importClause.namedBindings.elements.some(
							(e) => e.name.text === "Context"
						);
						const hasEffect = stmt.importClause.namedBindings.elements.some(
							(e) => e.name.text === "Effect"
						);

						if (hasContext && !hasEffect) {
							changed = true;
							const nextNamed = ts.factory.updateNamedImports(
								stmt.importClause.namedBindings,
								[
									...stmt.importClause.namedBindings.elements,
									ts.factory.createImportSpecifier(
										false,
										undefined,
										ts.factory.createIdentifier("Effect")
									),
								],
							);
							const nextClause = ts.factory.updateImportClause(
								stmt.importClause,
								stmt.importClause.isTypeOnly,
								stmt.importClause.name,
								nextNamed
							);
							return ts.factory.updateImportDeclaration(
								stmt,
								stmt.modifiers,
								nextClause,
								stmt.moduleSpecifier,
								stmt.assertClause
							);
						}
					}
				}
			}

			// Replace `const X = Context.Tag<...>(...)` with `export class X ...`
			if (ts.isVariableStatement(stmt)) {
				if (stmt.declarationList.declarations.length !== 1) {
					return stmt;
				}

				const decl = stmt.declarationList.declarations[0];
				if (!ts.isIdentifier(decl.name) || !decl.initializer) {
					return stmt;
				}

				const className = decl.name.text;
				if (!ts.isCallExpression(decl.initializer)) {
					return stmt;
				}

				const call = decl.initializer;
				if (!ts.isPropertyAccessExpression(call.expression)) {
					return stmt;
				}
				const prop = call.expression;
				if (!ts.isIdentifier(prop.expression) || prop.expression.text !== "Context") {
					return stmt;
				}
				const method = prop.name.text;
				if (method !== "Tag" && method !== "GenericTag") {
					return stmt;
				}

				changed = true;

				const serviceBase = ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier("Effect"),
						ts.factory.createIdentifier("Service")
					),
					[ts.factory.createTypeReferenceNode(className, undefined)],
					[]
				);

				const serviceCtor = ts.factory.createCallExpression(
					serviceBase,
					undefined,
					[]
				);

				const tagArg = ts.factory.createStringLiteral(className);
				const syncImpl = ts.factory.createPropertyAssignment(
					ts.factory.createIdentifier("sync"),
					ts.factory.createArrowFunction(
						undefined,
						undefined,
						[],
						undefined,
						ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
						ts.factory.createParenthesizedExpression(
							ts.factory.createObjectLiteralExpression([], false)
						)
					)
				);

				const configObj = ts.factory.createObjectLiteralExpression(
					[syncImpl],
					true
				);

				const extendsExpr = ts.factory.createCallExpression(
					serviceCtor,
					undefined,
					[tagArg, configObj]
				);

				const heritage = ts.factory.createHeritageClause(
					ts.SyntaxKind.ExtendsKeyword,
					[
						ts.factory.createExpressionWithTypeArguments(
							extendsExpr,
							undefined
						),
					]
				);

				return ts.factory.createClassDeclaration(
					[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
					ts.factory.createIdentifier(className),
					undefined,
					[heritage],
					[]
				);
			}

			return stmt;
		};

		return (sf) => {
			const nextStatements = sf.statements.map(visitStatement);
			return ts.factory.updateSourceFile(sf, nextStatements);
		};
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

const applyReplacePromiseAll = (file: RefactorFile): FileChange | null => {
	if (!/Promise\.all/.test(file.source)) {
		return null;
	}

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
			if (
				ts.isCallExpression(node) &&
				ts.isPropertyAccessExpression(node.expression) &&
				ts.isIdentifier(node.expression.expression) &&
				node.expression.expression.text === "Promise" &&
				node.expression.name.text === "all"
			) {
				changed = true;
				const nextExpr = ts.factory.createPropertyAccessExpression(
					ts.factory.createIdentifier("Effect"),
					ts.factory.createIdentifier("all")
				);
				return ts.factory.updateCallExpression(
					node,
					nextExpr,
					node.typeArguments,
					node.arguments
				);
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

const applyReplaceConsoleLog = (file: RefactorFile): FileChange | null => {
	if (!/console\.(log|warn|error|info)/.test(file.source)) {
		return null;
	}

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
			if (
				ts.isCallExpression(node) &&
				ts.isPropertyAccessExpression(node.expression) &&
				ts.isIdentifier(node.expression.expression) &&
				node.expression.expression.text === "console"
			) {
				const method = node.expression.name.text;
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
					const nextExpr = ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier("Effect"),
						ts.factory.createIdentifier(mapped)
					);
					return ts.factory.updateCallExpression(
						node,
						nextExpr,
						node.typeArguments,
						node.arguments
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

const applyAddSchemaDecode = (file: RefactorFile): FileChange | null => {
	if (!/JSON\.parse/.test(file.source)) {
		return null;
	}

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
			if (
				ts.isCallExpression(node) &&
				ts.isPropertyAccessExpression(node.expression) &&
				ts.isIdentifier(node.expression.expression) &&
				node.expression.expression.text === "JSON" &&
				node.expression.name.text === "parse"
			) {
				changed = true;
				const updated = ts.factory.updateCallExpression(
					node,
					node.expression,
					node.typeArguments,
					node.arguments
				);
				const wrapped = ts.factory.createParenthesizedExpression(updated);
				return ts.addSyntheticLeadingComment(
					wrapped,
					ts.SyntaxKind.MultiLineCommentTrivia,
					" TODO: Use Schema.decodeUnknown for type-safe parsing ",
					false
				);
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
		case "replace-context-tag":
			return applyReplaceContextTag(file);
		case "replace-promise-all":
			return applyReplacePromiseAll(file);
		case "replace-console-log":
			return applyReplaceConsoleLog(file);
		case "add-schema-decode":
			return applyAddSchemaDecode(file);
	}
	return null;
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
