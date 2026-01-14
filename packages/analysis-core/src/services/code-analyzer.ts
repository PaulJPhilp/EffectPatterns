import { Effect } from "effect";
import ts from "typescript";
import { ASTUtils } from "../tools/ast-utils";
import type { FixId, RuleId } from "../tools/ids";
import { RuleRegistryService } from "./rule-registry";

/**
 * A summary-level suggestion derived from governed rules.
 */
export interface CodeSuggestion {
	readonly id: RuleId;
	readonly title: string;
	readonly message: string;
	readonly severity: "low" | "medium" | "high";
}

/**
 * 1-based line/column range for a finding in a source file.
 */
export interface SourceRange {
	readonly startLine: number;
	readonly startCol: number;
	readonly endLine: number;
	readonly endCol: number;
}

/**
 * A concrete rule violation or guidance item detected in a source file.
 */
export interface CodeFinding {
	readonly id: string;
	readonly ruleId: RuleId;
	readonly title: string;
	readonly message: string;
	readonly severity: "low" | "medium" | "high";
	readonly filename?: string;
	readonly range: SourceRange;
	readonly refactoringIds: readonly FixId[];
}

/**
 * Input to the code analyzer.
 */
export interface AnalyzeCodeInput {
	readonly source: string;
	readonly filename?: string;
	readonly analysisType?: "validation" | "patterns" | "errors" | "all";
}

/**
 * Output of the code analyzer.
 */
export interface AnalyzeCodeOutput {
	readonly suggestions: readonly CodeSuggestion[];
	readonly findings: readonly CodeFinding[];
}

// --- Analysis Logic ---

interface AnalysisContext {
	readonly sourceFile: ts.SourceFile;
	readonly filename: string;
	readonly source: string;
	readonly findings: CodeFinding[];
	readonly suggestions: Set<RuleId>;
}

const createFinding = (
	ctx: AnalysisContext,
	node: ts.Node,
	ruleId: RuleId,
	rules: Map<RuleId, any>
): void => {
	const rule = rules.get(ruleId);
	if (!rule) return;

	const start = ctx.sourceFile.getLineAndCharacterOfPosition(node.getStart());
	const end = ctx.sourceFile.getLineAndCharacterOfPosition(node.getEnd());

	const finding: CodeFinding = {
		id: `${ruleId}:${ctx.filename}:${start.line + 1}:${start.character + 1}`,
		ruleId,
		title: rule.title,
		message: rule.message,
		severity: rule.severity,
		filename: ctx.filename,
		range: {
			startLine: start.line + 1,
			startCol: start.character + 1,
			endLine: end.line + 1,
			endCol: end.character + 1,
		},
		refactoringIds: rule.fixIds,
	};

	ctx.findings.push(finding);
	ctx.suggestions.add(ruleId);
};

const isBoundaryFile = (filename: string): boolean => {
	return filename.includes("app/api/") && filename.endsWith("route.ts");
};

// Check if file looks like it uses Effect (imports or usage)
const looksLikeEffectCode = (source: string): boolean =>
	/\bEffect\.gen\b/.test(source) ||
	/\byield\*\b/.test(source) ||
	/from\s+"effect"/.test(source);

const visitNode = (node: ts.Node, ctx: AnalysisContext, rules: Map<RuleId, any>) => {
	const isBoundary = isBoundaryFile(ctx.filename);

	// 1. async/await checks
	const isAsyncFunction =
		ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isMethodDeclaration(node);
	const hasAsyncModifier =
		isAsyncFunction &&
		ts.canHaveModifiers(node) &&
		ts.getModifiers(node)?.some(
			(m: ts.Modifier) => m.kind === ts.SyntaxKind.AsyncKeyword
		);
	if (ts.isAwaitExpression(node) || hasAsyncModifier) {
		// Heuristic: If it's a boundary file, async is often OK.
		// If it's a service or core logic, prefer Effect.
		if (!isBoundary && looksLikeEffectCode(ctx.source)) {
			// We only flag if we are in an Effect context
			createFinding(ctx, node, "async-await", rules);
		}
	}

	// 2. node:fs imports
	if (ts.isImportDeclaration(node)) {
		if (ts.isStringLiteral(node.moduleSpecifier)) {
			if (node.moduleSpecifier.text === "node:fs" || node.moduleSpecifier.text === "node:fs/promises") {
				createFinding(ctx, node, "node-fs", rules);
			}
		}
	}

	// 3. try/catch
	if (ts.isTryStatement(node)) {
		if (isBoundary) {
			createFinding(ctx, node, "try-catch-boundary-ok", rules);
		} else if (looksLikeEffectCode(ctx.source)) {
			createFinding(ctx, node, "try-catch-in-effect", rules);
		}

		// Check for catch log and swallow
		if (node.catchClause && node.catchClause.block.statements.length > 0) {
			const stmts = node.catchClause.block.statements;
			const hasLog = stmts.some(s => {
				if (ts.isExpressionStatement(s) && ts.isCallExpression(s.expression)) {
					const expr = s.expression.expression;
					if (ts.isPropertyAccessExpression(expr) && (expr.name.text === "log" || expr.name.text === "error")) {
						return true; // console.log or logger.error
					}
				}
				return false;
			});

			const hasReturn = stmts.some(s => ts.isReturnStatement(s));
			const hasThrow = stmts.some(s => ts.isThrowStatement(s));
			const hasEffectFail = stmts.some(s => {
				if (ts.isExpressionStatement(s) && ts.isCallExpression(s.expression)) {
					return ASTUtils.isMethodCall(s.expression, "Effect", "fail");
				}
				// Also check return Effect.fail(...)
				if (ts.isReturnStatement(s) && s.expression && ts.isCallExpression(s.expression)) {
					return ASTUtils.isMethodCall(s.expression, "Effect", "fail");
				}
				return false;
			});

			if (hasLog && hasReturn && !hasThrow && !hasEffectFail && looksLikeEffectCode(ctx.source)) {
				createFinding(ctx, node, "catch-log-and-swallow", rules);
			}
		}
	}

	// 4. throw
	if (ts.isThrowStatement(node)) {
		if (looksLikeEffectCode(ctx.source)) {
			createFinding(ctx, node, "throw-in-effect-code", rules);
		}
	}

	// 5. any type
	if (node.kind === ts.SyntaxKind.AnyKeyword) {
		createFinding(ctx, node, "any-type", rules);
	}

	// 6. Effect.map(fn)
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "map")) {
			if (node.arguments.length === 1 && ts.isIdentifier(node.arguments[0])) {
				createFinding(ctx, node, "effect-map-fn-reference", rules);
			}
		}
	}

	// 7. yield* on pure values (heuristic)
	if (ts.isYieldExpression(node) && node.asteriskToken) {
		if (node.expression && ts.isCallExpression(node.expression)) {
			const expr = node.expression.expression;
			if (ts.isPropertyAccessExpression(expr)) {
				const methodName = expr.name.text;
				if (
					methodName === "dirname" ||
					methodName === "join" ||
					methodName === "basename"
				) {
					createFinding(ctx, node, "yield-star-non-effect", rules);
				}
			}
		}
	}

	// 8. Context.Tag / Context.GenericTag anti-pattern
	if (ts.isCallExpression(node)) {
		if (
			ASTUtils.isMethodCall(node, "Context", "Tag") ||
			ASTUtils.isMethodCall(node, "Context", "GenericTag")
		) {
			createFinding(ctx, node, "context-tag-anti-pattern", rules);
		}
	}

	// 9. Promise.all in Effect code
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Promise", "all")) {
			if (looksLikeEffectCode(ctx.source)) {
				createFinding(ctx, node, "promise-all-in-effect", rules);
			}
		}
	}

	// 10. Mutable refs (let) inside Effect.gen
	if (ts.isVariableStatement(node)) {
		const decl = node.declarationList;
		if (decl.flags & ts.NodeFlags.Let) {
			if (looksLikeEffectCode(ctx.source) && isInsideEffectGen(node)) {
				createFinding(ctx, node, "mutable-ref-in-effect", rules);
			}
		}
	}

	// 11. console.log/warn/error in Effect code
	if (ts.isCallExpression(node)) {
		const expr = node.expression;
		if (ts.isPropertyAccessExpression(expr)) {
			if (
				ts.isIdentifier(expr.expression) &&
				expr.expression.text === "console"
			) {
				const method = expr.name.text;
				if (
					method === "log" ||
					method === "warn" ||
					method === "error" ||
					method === "info"
				) {
					if (looksLikeEffectCode(ctx.source)) {
						createFinding(ctx, node, "console-log-in-effect", rules);
					}
				}
			}
		}
	}

	// 12. Effect.runSync usage
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "runSync")) {
			if (!isBoundary) {
				createFinding(ctx, node, "effect-runSync-unsafe", rules);
			}
		}
	}

	// 13. Layer.provide inside service (anti-pattern)
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Layer", "provide")) {
			if (isInsideServiceDefinition(node, ctx.sourceFile)) {
				createFinding(ctx, node, "layer-provide-anti-pattern", rules);
			}
		}
	}

	// 14. Effect.gen without yield*
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "gen")) {
			if (node.arguments.length > 0) {
				const arg = node.arguments[0];
				if (
					ts.isFunctionExpression(arg) ||
					ts.isArrowFunction(arg)
				) {
					const body = arg.body;
					if (ts.isBlock(body)) {
						const hasYieldStar = containsYieldStar(body);
						if (!hasYieldStar) {
							createFinding(ctx, node, "effect-gen-no-yield", rules);
						}
					}
				}
			}
		}
	}

	// 15. JSON.parse without Schema validation
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "JSON", "parse")) {
			if (looksLikeEffectCode(ctx.source) && !hasSchemaImport(ctx.sourceFile)) {
				createFinding(ctx, node, "schema-decode-unknown", rules);
			}
		}
	}

	ts.forEachChild(node, (child) => visitNode(child, ctx, rules));
};

// Helper: Check if node is inside Effect.gen
const isInsideEffectGen = (node: ts.Node): boolean => {
	let parent = node.parent;
	while (parent) {
		if (ts.isCallExpression(parent)) {
			if (ASTUtils.isMethodCall(parent, "Effect", "gen")) {
				return true;
			}
		}
		parent = parent.parent;
	}
	return false;
};

// Helper: Check if node is inside a service definition (Effect.Service or class)
const isInsideServiceDefinition = (
	node: ts.Node,
	_sourceFile: ts.SourceFile
): boolean => {
	let parent = node.parent;
	while (parent) {
		if (ts.isClassDeclaration(parent)) {
			return true;
		}
		if (ts.isCallExpression(parent)) {
			if (ASTUtils.isMethodCall(parent, "Effect", "Service")) {
				return true;
			}
		}
		parent = parent.parent;
	}
	return false;
};

// Helper: Check if block contains yield*
const containsYieldStar = (block: ts.Block): boolean => {
	let found = false;
	const visit = (n: ts.Node) => {
		if (found) return;
		if (ts.isYieldExpression(n) && n.asteriskToken) {
			found = true;
			return;
		}
		ts.forEachChild(n, visit);
	};
	ts.forEachChild(block, visit);
	return found;
};

// Helper: Check if file imports Schema (from @effect/schema or named from effect)
const hasSchemaImport = (sourceFile: ts.SourceFile): boolean => {
	let found = false;
	ts.forEachChild(sourceFile, (node) => {
		if (ts.isImportDeclaration(node) && node.importClause) {
			const specifier = node.moduleSpecifier;
			if (ts.isStringLiteral(specifier)) {
				// Check for @effect/schema import
				if (specifier.text === "@effect/schema") {
					found = true;
					return;
				}
				// Check for named Schema import from "effect"
				if (specifier.text === "effect" && node.importClause.namedBindings) {
					if (ts.isNamedImports(node.importClause.namedBindings)) {
						for (const el of node.importClause.namedBindings.elements) {
							if (el.name.text === "Schema") {
								found = true;
								return;
							}
						}
					}
				}
			}
		}
	});
	return found;
};

/**
 * Service for analyzing code and detecting potential issues.
 */
export class CodeAnalyzerService extends Effect.Service<CodeAnalyzerService>()(
	"CodeAnalyzerService",
	{
		effect: Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			const rulesList = yield* registry.listRules();
			const ruleById = new Map(rulesList.map((r) => [r.id, r] as const));

			const analyze = (
				input: AnalyzeCodeInput
			): Effect.Effect<AnalyzeCodeOutput, never> =>
				Effect.gen(function* () {
					const filename = input.filename ?? "anonymous.ts";
					const sourceFile = ASTUtils.createSourceFile(
						filename,
						input.source
					).compilerNode;

					const ctx: AnalysisContext = {
						sourceFile,
						filename,
						source: input.source,
						findings: [],
						suggestions: new Set(),
					};

					// Check for non-ts
					if (
						filename &&
						!filename.endsWith(".ts") &&
						!filename.endsWith(".tsx")
					) {
						createFinding(ctx, sourceFile, "non-typescript", ruleById);
					} else {
						// Traverse AST
						visitNode(sourceFile, ctx, ruleById);
					}

					// Map suggestions
					const suggestions = Array.from(ctx.suggestions).map((id) => {
						const rule = ruleById.get(id);
						return {
							id,
							title: rule?.title ?? "",
							message: rule?.message ?? "",
							severity: rule?.severity ?? "low",
						} satisfies CodeSuggestion;
					});

					return { suggestions, findings: ctx.findings };
				});

			return { analyze };
		}),
		dependencies: [RuleRegistryService.Default],
	}
) { }

/**
 * Default live layer for `CodeAnalyzerService`.
 */
export const CodeAnalyzerServiceLive = CodeAnalyzerService.Default;
