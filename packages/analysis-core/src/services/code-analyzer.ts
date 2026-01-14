import { Effect } from "effect";
import ts from "typescript";
import type { FixId, RuleId } from "../tools/ids";
import { ASTUtils } from "../tools/ast-utils";
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
	if (ts.isAwaitExpression(node) || (ts.isFunctionLike(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword))) {
		// Heuristic: If it's a boundary file, async is often OK. 
		// If it's a service or core logic, prefer Effect.
		if (!isBoundary && looksLikeEffectCode(ctx.source)) {
			// We only flag if we are in an Effect context to avoid flagging generic TS code
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
			// Check for known pure functions like Path.dirname
			// This is weak without type checker, but we can match common patterns
			const expr = node.expression.expression;
			if (ts.isPropertyAccessExpression(expr)) {
				// e.g. Path.dirname, path.join
				if (expr.name.text === "dirname" || expr.name.text === "join" || expr.name.text === "basename") {
					createFinding(ctx, node, "yield-star-non-effect", rules);
				}
			}
		}
	}

	ts.forEachChild(node, (child) => visitNode(child, ctx, rules));
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
					const sourceFile = ASTUtils.createSourceFile(filename, input.source);
					
					const ctx: AnalysisContext = {
						sourceFile,
						filename,
						source: input.source,
						findings: [],
						suggestions: new Set(),
					};

					// Check for non-ts
					if (filename && !filename.endsWith(".ts") && !filename.endsWith(".tsx")) {
						createFinding(ctx, sourceFile, "non-typescript", ruleById);
					} else {
						// Traverse AST
						visitNode(sourceFile, ctx, ruleById);
					}

					// Map suggestions
					const suggestions = Array.from(ctx.suggestions).map(id => {
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
