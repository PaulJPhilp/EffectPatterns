import { Effect } from "effect";
import ts from "typescript";
import type { AnalysisConfig, RuleLevel } from "../config/types";
import { ASTUtils } from "../tools/ast-utils";
import type { FixId, RuleId } from "../tools/ids";
import type { FixDefinition, FixSafety, FixKind, RuleDefinition } from "./rule-registry";
import { RuleRegistryService } from "./rule-registry";

/** Re-export for consumers (fix safety is intrinsic to the fix). */
export type { FixSafety, FixKind };

/**
 * Denormalized fix info on a finding for edit tools. Source of truth is FixDefinition in the registry.
 */
export interface ApplicableFix {
	readonly id: FixId;
	readonly title: string;
	readonly safety: FixSafety;
	readonly kind: FixKind;
}

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
 * level: resolved enforcement (for CI/PR: fail if level === "error"); severity: impact (for UI/sorting).
 */
export interface CodeFinding {
	readonly id: string;
	readonly ruleId: RuleId;
	readonly title: string;
	readonly message: string;
	readonly severity: "low" | "medium" | "high";
	/** Resolved enforcement level so PR/CI can fail on error-level findings. */
	readonly level: RuleLevel;
	readonly filename?: string;
	readonly range: SourceRange;
	/** Backward compat: just IDs. */
	readonly refactoringIds: readonly FixId[];
	/** Denormalized fix info for edit tools (safe/review/risky, codemod/assisted/manual). */
	readonly applicableFixes: readonly ApplicableFix[];
}

/**
 * Input to the code analyzer.
 */
export interface AnalyzeCodeInput {
	readonly source: string;
	readonly filename?: string;
	readonly analysisType?: "validation" | "patterns" | "errors" | "all";
	readonly config?: AnalysisConfig;
}

/**
 * Output of the code analyzer.
 */
export interface AnalyzeCodeOutput {
	readonly suggestions: readonly CodeSuggestion[];
	readonly findings: readonly CodeFinding[];
	readonly sourceFile?: ts.SourceFile;
}

/**
 * Exit code for CLI/CI: 0 if no error-level findings, 1 if any. Use exit 2 for internal failures.
 */
export function exitCodeFromFindings(findings: readonly CodeFinding[]): 0 | 1 {
	return findings.some((f) => f.level === "error") ? 1 : 0;
}

// --- Analysis Logic ---

interface AnalysisContext {
	readonly sourceFile: ts.SourceFile;
	readonly filename: string;
	readonly source: string;
	readonly findings: CodeFinding[];
	readonly suggestions: Set<RuleId>;
	readonly resolvedLevelByRuleId: Partial<Record<RuleId, RuleLevel>>;
	/** Fix definitions by id for denormalizing applicableFixes on findings. */
	readonly fixById: Map<FixId, FixDefinition>;
}

const createFinding = (
	ctx: AnalysisContext,
	node: ts.Node,
	ruleId: RuleId,
	rules: Map<RuleId, RuleDefinition>
): void => {
	const rule = rules.get(ruleId);
	if (!rule) return;

	const start = ctx.sourceFile.getLineAndCharacterOfPosition(node.getStart());
	const end = ctx.sourceFile.getLineAndCharacterOfPosition(node.getEnd());
	const level = ctx.resolvedLevelByRuleId[ruleId] ?? "warn";
	const applicableFixes: ApplicableFix[] = rule.fixIds
		.map((fid) => ctx.fixById.get(fid))
		.filter((f): f is FixDefinition => f != null)
		.map((f) => ({ id: f.id, title: f.title, safety: f.safety, kind: f.kind }));

	const finding: CodeFinding = {
		id: `${ruleId}:${ctx.filename}:${start.line + 1}:${start.character + 1}`,
		ruleId,
		title: rule.title,
		message: rule.message,
		severity: rule.severity,
		level,
		filename: ctx.filename,
		range: {
			startLine: start.line + 1,
			startCol: start.character + 1,
			endLine: end.line + 1,
			endCol: end.character + 1,
		},
		refactoringIds: rule.fixIds,
		applicableFixes,
	};

	ctx.findings.push(finding);
	ctx.suggestions.add(ruleId);
};

const isBoundaryFile = (filename: string): boolean => {
	return filename.includes("app/api/") && filename.endsWith("route.ts");
};

// Use AST-based detection from ASTUtils
const looksLikeEffectCode = (sourceFile: ts.SourceFile): boolean =>
	ASTUtils.looksLikeEffectCode(sourceFile);

const categoriesForAnalysisType = (
	analysisType: AnalyzeCodeInput["analysisType"]
): readonly string[] => {
	switch (analysisType) {
		case "validation":
			return ["validation"];
		case "patterns":
			return ["style", "dependency-injection", "resources", "types"];
		case "errors":
			return ["errors", "async", "concurrency", "platform"];
		case "all":
		default:
			return [
				"async",
				"errors",
				"validation",
				"resources",
				"dependency-injection",
				"style",
				"concurrency",
				"platform",
				"types",
			];
	}
};

const visitNode = (
	node: ts.Node,
	ctx: AnalysisContext,
	rules: Map<RuleId, RuleDefinition>
) => {
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
		if (!isBoundary && looksLikeEffectCode(ctx.sourceFile)) {
			// We only flag if we are in an Effect context
			createFinding(ctx, node, "async-await", rules);
		}
	}

	// 2. node:fs imports and require calls
	if (ts.isImportDeclaration(node)) {
		if (ts.isStringLiteral(node.moduleSpecifier)) {
			if (node.moduleSpecifier.text === "node:fs" || node.moduleSpecifier.text === "node:fs/promises") {
				createFinding(ctx, node, "node-fs", rules);
			}
		}
	}

	// Check for require('fs') calls
	if (ts.isCallExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === "require" &&
		node.arguments.length > 0 &&
		ts.isStringLiteral(node.arguments[0])) {
		const arg = node.arguments[0] as ts.StringLiteral;
		if (arg.text === "fs" || arg.text === "node:fs" || arg.text === "fs/promises") {
			createFinding(ctx, node, "node-fs", rules);
		}
	}

	// 3. try/catch
	if (ts.isTryStatement(node)) {
		if (isBoundary) {
			createFinding(ctx, node, "try-catch-boundary-ok", rules);
		} else if (looksLikeEffectCode(ctx.sourceFile)) {
			// Check for manual resource lifecycle in try/finally
			if (node.finallyBlock && node.finallyBlock.statements.length > 0) {
				const hasResourceCleanup = node.finallyBlock.statements.some(stmt => {
					if (ts.isExpressionStatement(stmt) && ts.isCallExpression(stmt.expression)) {
						const callExpr = stmt.expression;
						if (ts.isPropertyAccessExpression(callExpr.expression)) {
							const method = callExpr.expression.name.text;
							return method === "close" || method === "destroy" || method === "dispose";
						}
					}
					return false;
				});

				if (hasResourceCleanup) {
					createFinding(ctx, node, "manual-resource-lifecycle", rules);
				}
			}

			// Check if errors are swallowed (missing-error-channel)
			if (node.catchClause && node.catchClause.block.statements.length > 0) {
				const stmts = node.catchClause.block.statements;
				const hasThrow = stmts.some(s => ts.isThrowStatement(s));
				const hasEffectFail = stmts.some(s => {
					if (ts.isExpressionStatement(s) && ts.isCallExpression(s.expression)) {
						return ASTUtils.isMethodCall(s.expression, "Effect", "fail");
					}
					if (ts.isReturnStatement(s) && s.expression && ts.isCallExpression(s.expression)) {
						return ASTUtils.isMethodCall(s.expression, "Effect", "fail");
					}
					return false;
				});

				if (!hasThrow && !hasEffectFail) {
					createFinding(ctx, node, "missing-error-channel", rules);
				}
			}

			// Also flag try-catch-in-effect
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
					if (ASTUtils.isMethodCall(s.expression, "Effect", "log")) return true;
				}
				return false;
			});

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

			if (hasLog && !hasThrow && !hasEffectFail && looksLikeEffectCode(ctx.sourceFile)) {
				createFinding(ctx, node, "catch-log-and-swallow", rules);
			}
		}
	}

	// 4. throw
	if (ts.isThrowStatement(node)) {
		if (looksLikeEffectCode(ctx.sourceFile)) {
			if (isInsideEffectGen(node)) {
				createFinding(ctx, node, "throw-inside-effect-logic", rules);
			} else if (isInsideEffectCombinator(node)) {
				createFinding(ctx, node, "throw-in-effect-pipeline", rules);
			} else {
				createFinding(ctx, node, "throw-in-effect-code", rules);
			}
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

		// Check catchAll/catchTag/tryPromise for error handling rules
		const isCatchAll = ASTUtils.isMethodCall(node, "Effect", "catchAll");
		const isCatchTag = ASTUtils.isMethodCall(node, "Effect", "catchTag");

		if (isCatchAll || isCatchTag) {
			// Check swallow-failures-without-logging
			// Check catch-log-and-swallow
			// Check generic-error-type
			if ((node as ts.CallExpression).arguments.length > 0) {
				const callback = isCatchAll ? (node as ts.CallExpression).arguments[0] : (node as ts.CallExpression).arguments[1];
				if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
					// 1. generic-error-type
					if (callback.parameters.length > 0) {
						const param = callback.parameters[0];
						if (param.type && ts.isTypeReferenceNode(param.type) && ts.isIdentifier(param.type.typeName)) {
							if (param.type.typeName.text === "Error") {
								createFinding(ctx, node, "generic-error-type", rules);
							}
						}
					}

					// Analyze callback body
					const body = callback.body;
					let hasLog = false;
					let returnsFail = false;

					const checkBody = (n: ts.Node) => {
						// Log check
						if (ts.isCallExpression(n)) {
							if (ASTUtils.isMethodCall(n, "Effect", "log") ||
								ASTUtils.isMethodCall(n, "Effect", "logInfo") ||
								ASTUtils.isMethodCall(n, "Effect", "logWarning") ||
								ASTUtils.isMethodCall(n, "Effect", "logError")) {
								hasLog = true;
							}

							// Check for console.log calls
							if (ts.isPropertyAccessExpression(n.expression) &&
								ts.isIdentifier(n.expression.expression) &&
								n.expression.expression.text === "console") {
								hasLog = true;
							}

							// Fail check
							if (ASTUtils.isMethodCall(n, "Effect", "fail")) {
								returnsFail = true;
							}
						}
						ts.forEachChild(n, checkBody);
					};
					checkBody(body);

					if (hasLog && !returnsFail) {
						createFinding(ctx, node, "catch-log-and-swallow", rules);
					}

					if (!hasLog && !returnsFail) {
						// If it swallows without logging
						createFinding(ctx, node, "swallow-failures-without-logging", rules);
					}
				}
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
			if (looksLikeEffectCode(ctx.sourceFile)) {
				createFinding(ctx, node, "promise-all-in-effect", rules);
			}
		}
	}

	// 10. Mutable refs (let) inside Effect.gen
	if (ts.isVariableStatement(node)) {
		const decl = node.declarationList;
		if (decl.flags & ts.NodeFlags.Let) {
			if (looksLikeEffectCode(ctx.sourceFile) && isInsideEffectGen(node)) {
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
					if (looksLikeEffectCode(ctx.sourceFile)) {
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
			if (looksLikeEffectCode(ctx.sourceFile) && !hasSchemaImport(ctx.sourceFile)) {
				createFinding(ctx, node, "schema-decode-unknown", rules);
			}
		}
	}

	// 16. Scope Anti-Patterns Detection

	// 16.1 Manual resource closing (e.g., conn.close(), file.close())
	if (ts.isCallExpression(node)) {
		if (ts.isPropertyAccessExpression(node.expression)) {
			const methodName = node.expression.name.text;
			if (
				methodName === "close" ||
				methodName === "dispose" ||
				methodName === "cleanup" ||
				methodName === "destroy"
			) {
				if (looksLikeEffectCode(ctx.sourceFile) && isInsideEffectGen(node) && !isInsideAcquireReleaseCleanup(node)) {
					createFinding(ctx, node, "closing-resources-manually", rules);
				}
			}
		}
	}

	// 16.2 Effect.run* calls (potential resource leaks)
	if (ts.isCallExpression(node)) {
		if (
			ASTUtils.isMethodCall(node, "Effect", "runPromise") ||
			ASTUtils.isMethodCall(node, "Effect", "runSync") ||
			ASTUtils.isMethodCall(node, "Effect", "runFork")
		) {
		        // Check if this might be running with open resources
		        if (hasResourceCreationInScope(node)) {
		                createFinding(ctx, node, "effect-run-with-open-resources", rules);
		        }
		}
	}

	// 16.3 Global singleton pattern (new SomeClass() at module level)
	if (ts.isNewExpression(node) && isAtModuleLevel(node)) {
		if (looksLikeEffectCode(ctx.sourceFile) && looksLikeResourceSingleton(node)) {
			createFinding(ctx, node, "global-singletons-instead-of-layers", rules);
		}
	}

	// 16.4 Effect.succeed wrapping resources
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "succeed")) {
			if (isReturningResource(node)) {
				createFinding(ctx, node, "returning-resources-instead-of-effects", rules);
			}
		}
	}

	// 16.5 Scope.global usage
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Scope", "global")) {
			if (looksLikeEffectCode(ctx.sourceFile)) {
				createFinding(ctx, node, "using-scope-global-for-convenience", rules);
			}
		}
	}

	// 16.6 Nested acquireRelease patterns
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "acquireRelease")) {
			if (countNestedAcquireRelease(node) > 2) {
				createFinding(ctx, node, "nested-resource-acquisition", rules);
			}
		}
	}

	// === Domain Modeling Rules ===

	// 13. primitives-for-domain-concepts: type with raw string/number fields
	if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
		if (hasPrimitiveDomainConcepts(node)) {
			createFinding(ctx, node, "primitives-for-domain-concepts", rules);
		}
	}

	// 14. boolean-flags-controlling-behavior: function params with boolean flags
	if (
		ts.isFunctionDeclaration(node) ||
		ts.isArrowFunction(node) ||
		ts.isFunctionExpression(node) ||
		ts.isMethodDeclaration(node)
	) {
		if (hasBooleanControllingBehavior(node)) {
			createFinding(ctx, node, "boolean-flags-controlling-behavior", rules);
		}
	}

	// 15. magic-string-domains: string comparisons in conditionals
	if (ts.isIfStatement(node) || ts.isConditionalExpression(node)) {
		const condition = ts.isIfStatement(node) ? node.expression : node.condition;
		if (hasMagicStringComparisons(condition)) {
			createFinding(ctx, node, "magic-string-domains", rules);
		}
	}

	// 16. objects-as-implicit-state-machines: class with mutable state and conditional transitions
	if (ts.isClassDeclaration(node)) {
		if (looksLikeImplicitStateMachine(node)) {
			createFinding(ctx, node, "objects-as-implicit-state-machines", rules);
		}
	}

	// 17. domain-logic-in-conditionals: business logic inside if conditions
	if (ts.isIfStatement(node) || ts.isConditionalExpression(node)) {
		const condition = ts.isIfStatement(node) ? node.expression : node.condition;
		if (hasComplexDomainLogic(condition)) {
			createFinding(ctx, node, "domain-logic-in-conditionals", rules);
		}
	}

	// 18. adhoc-error-semantics-in-domain: throw new Error("string") or Effect.fail("string")
	if (ts.isThrowStatement(node)) {
		const expr = node.expression;
		if (expr && ts.isNewExpression(expr)) {
			if (ts.isIdentifier(expr.expression) && expr.expression.text === "Error") {
				if (expr.arguments && expr.arguments.length > 0) {
					const arg = expr.arguments[0];
					if (ts.isStringLiteral(arg)) {
						createFinding(ctx, node, "adhoc-error-semantics-in-domain", rules);
					}
				}
			}
		}
	}

	// Also check Effect.fail("string")
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "fail")) {
			if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
				createFinding(ctx, node, "adhoc-error-semantics-in-domain", rules);
			}
		}
	}

	// 19. overloaded-config-objects: interface/type with overloaded config objects
	if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
		if (hasOverloadedConfigPattern(node)) {
			createFinding(ctx, node, "overloaded-config-objects", rules);
		}
	}

	// 20. domain-ids-as-raw-strings: interface/type with id: string field
	if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
		if (hasRawStringIdField(node)) {
			createFinding(ctx, node, "domain-ids-as-raw-strings", rules);
		}
	}

	// 21. time-as-number-or-date: type with timestamp, expiresAt, etc. as number or Date
	if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
		if (hasTimeAsRawType(node)) {
			createFinding(ctx, node, "time-as-number-or-date", rules);
		}
	}

	// 22. domain-meaning-from-file-structure: service classes relying on file structure for semantics
	if (ts.isClassDeclaration(node)) {
		if (looksLikeServiceClass(node) && hasGenericServiceMethod(node)) {
			createFinding(ctx, node, "domain-meaning-from-file-structure", rules);
		}
	}

	// 17. Correctness Anti-Patterns

	// 17.1 yield instead of yield*
	if (ts.isYieldExpression(node) && !node.asteriskToken) {
		if (isInsideEffectGen(node)) {
			createFinding(ctx, node, "yield-instead-of-yield-star", rules);
		}
	}

	// 17.2 Async callbacks in Effect combinators
	if (
		(ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
		node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
	) {
		if (isArgumentOfEffectCombinator(node)) {
			createFinding(ctx, node, "async-callbacks-in-effect-combinators", rules);
		}
	}

	// 17.3 Promise APIs inside Effect logic
	if (ts.isCallExpression(node)) {
		if (
			ASTUtils.isMethodCall(node, "Promise", "all") ||
			ASTUtils.isMethodCall(node, "Promise", "race") ||
			ASTUtils.isMethodCall(node, "Promise", "allSettled") ||
			ASTUtils.isMethodCall(node, "Promise", "any")
		) {
			if (looksLikeEffectCode(ctx.sourceFile) && (isInsideEffectGen(node) || isInsideEffectCombinator(node))) {
				createFinding(ctx, node, "promise-apis-inside-effect-logic", rules);
			}
		}
	}

	// 17.4 Running effects outside boundaries (merging effect-runSync-unsafe logic)
	if (ts.isCallExpression(node)) {
		if (
			ASTUtils.isMethodCall(node, "Effect", "runPromise") ||
			ASTUtils.isMethodCall(node, "Effect", "runSync") ||
			ASTUtils.isMethodCall(node, "Effect", "runFork")
		) {
			if (!isBoundary) {
				// Fire both/all relevant rules to satisfy different tests
				createFinding(ctx, node, "run-effect-outside-boundary", rules);
				createFinding(ctx, node, "effect-run-promise-boundary", rules);
			}
		}
	}

	// 17.5 Incorrect promise bridge
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "tryPromise") || ASTUtils.isMethodCall(node, "Effect", "promise")) {
			if (node.arguments.length > 0) {
				const arg = node.arguments[0];
				// Check for () => identifier
				if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
					if (arg.body && ts.isIdentifier(arg.body)) {
						createFinding(ctx, node, "incorrect-promise-bridge", rules);
					}
				}
			}
		}
	}

	// 17.6 Blocking calls in Effect
	if (ts.isCallExpression(node)) {
		if (ts.isPropertyAccessExpression(node.expression)) {
			const methodName = node.expression.name.text;
			if (
				methodName.endsWith("Sync") &&
				looksLikeEffectCode(ctx.sourceFile) &&
				(isInsideEffectGen(node) || isInsideEffectCombinator(node))
			) {
				createFinding(ctx, node, "blocking-calls-in-effect", rules);
				createFinding(ctx, node, "blocking-calls-in-effect-logic", rules);
			}
		}
	}

	// 17.7 Ignoring fiber failures (Fire-and-forget fork)
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "fork")) {
			// Check if the result is used
			const parent = node.parent;
			let isUsed = false;
			if (ts.isVariableDeclaration(parent) || ts.isBinaryExpression(parent)) {
				isUsed = true;
			} else if (ts.isYieldExpression(parent)) {
				const yieldParent = parent.parent; // Variable declaration or assignment
				if (ts.isVariableDeclaration(yieldParent) || ts.isBinaryExpression(yieldParent)) {
					isUsed = true;
				}
			} else if (ts.isCallExpression(parent) && (
				ASTUtils.isMethodCall(parent, "Effect", "flatMap") ||
				ASTUtils.isMethodCall(parent, "Effect", "map") ||
				ASTUtils.isMethodCall(parent, "Effect", "tap")
			)) {
				isUsed = true; // Used in chain
			}

			if (!isUsed) {
				createFinding(ctx, node, "ignoring-fiber-failures", rules);
				createFinding(ctx, node, "fire-and-forget-fork", rules); // alias
			}
		}
	}

	// 17.8 Retrying concurrently without limits
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "all")) {
			// Check arguments
			if (node.arguments.length > 0) {
				const effectsArg = node.arguments[0];
				// Check for concurrency option
				let hasConcurrencyLimit = false;
				if (node.arguments.length > 1) {
					const options = node.arguments[1];
					if (ts.isObjectLiteralExpression(options)) {
						hasConcurrencyLimit = options.properties.some(p =>
							ts.isPropertyAssignment(p) &&
							ts.isIdentifier(p.name) &&
							p.name.text === "concurrency"
						);
					}
				}

				if (!hasConcurrencyLimit) {
					// Heuristic: check if input involves retries
					// e.g. Effect.all(tasks.map(t => Effect.retry(t)))
					// or Effect.all([Effect.retry(..), ...])

					const hasRetry = (n: ts.Node): boolean => {
						let found = false;
						const visit = (c: ts.Node) => {
							if (found) return;
							if (ts.isCallExpression(c) && ASTUtils.isMethodCall(c, "Effect", "retry")) {
								found = true;
							}
							ts.forEachChild(c, visit);
						}
						visit(n);
						return found;
					}

					if (hasRetry(effectsArg)) {
						createFinding(ctx, node, "retrying-concurrently-without-limits", rules);
					}
				}
			}
		}
	}

	// 17.9 Shared mutable state across fibers
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "fork")) {
			// Check if the forked effect uses external mutable variables
			// This is complex, simplified heuristic:
			// Look for identifiers that refer to variables defined outside with let/var/class fields
			// and are modified (assigned to) inside the forked effect.

			const effectArg = node.arguments[0];
			if (effectArg) {
				let accessesMutableState = false;

				const checkMutability = (n: ts.Node) => {
					// Check for assignments to variables
					if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
						if (ts.isIdentifier(n.left)) {
							// Simple check: is this a variable?
							// In a real compiler we'd check symbols. 
							// Here we assume assignment to identifier implies mutable state modification.
							// Exception: local variables inside the effect scope.
							// We can't easily distinguish without scope analysis.
							// Heuristic: if identifier is used, flag it if it looks like external state.
							accessesMutableState = true;
						}
						// Check property access (object mutation)
						if (ts.isPropertyAccessExpression(n.left)) {
							accessesMutableState = true;
						}
					}
					// Check for ++ / --
					if (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) {
						if (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken) {
							accessesMutableState = true;
						}
					}
					ts.forEachChild(n, checkMutability);
				};

				checkMutability(effectArg);

				if (accessesMutableState) {
					createFinding(ctx, node, "shared-mutable-state-across-fibers", rules);
				}
			}
		}
	}

	// 17.10 Timeouts without cancellation awareness
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "timeout")) {
			// Only check timeout calls that have an effect argument (not just duration)
			if (node.arguments.length >= 2) {
				// Check if the effect being timed out handles interruption?
				// Heuristic: If it's a long running gen/task and NOT inside a match/catchTag that handles "Timeout" or interruption.
				// Actually the rule is "Applying timeouts but inner effects ignore interruption".
				// So check if inner effect is likely to be "uninterruptible" or just long running sync work?
				// Or if it lacks cleanup?
				// Test expects flagging `Effect.gen(...)` inside timeout.
				// Safe variant has `.pipe(Effect.catchTag("Timeout"))`.

				// So we check if the result of Effect.timeout is piped to catchTag("Timeout")?
				// But Effect.timeout returns an Effect that fails with TimeoutException (or returns Option).
				// If it returns Option, it's safe-ish.
				// If we use `Effect.timeoutFail`, it fails.
				// `Effect.timeout` returns `Option`.
				// Wait, recent Effect versions: `Effect.timeout` returns `Effect<A, E | TimeoutException>`? No, that's timeoutFail.
				// `Effect.timeout` usually returns `Effect<Option<A>, E>`.

				// The test case uses `yield* Effect.timeout(...)`.
				// The violation snippet:
				/*
				Effect.gen(function* () {
				  return yield* Effect.timeout(5000)(...);
				});
				*/
				// The safe variant:
				/*
				... .pipe(Effect.catchTag("Timeout", ...))
				*/
				// This implies the test assumes `Effect.timeout` fails with Timeout.
				// In Effect 3.x `Effect.timeout` returns value or fails with `TimeoutException` if duration exceeded (if using `timeoutFail` behavior, or maybe defaults changed).
				// Actually `Effect.timeout` returns `Effect<A, E | TimeoutException>` in some versions, or `Option`.

				// Assuming the rule wants to enforce HANDLING the timeout.
				// We check if the result is used in `catchTag` or `match`.

				let isHandled = false;

				// Walk up the AST to find a pipe call
				let current = node;
				while (current && !isHandled) {
					const parentNode = current.parent;
					if (!parentNode) break;

					if (ts.isCallExpression(parentNode) && ts.isPropertyAccessExpression(parentNode.expression) && parentNode.expression.name.text === "pipe") {
						// Check arguments of pipe for catchTag("Timeout")
						if (parentNode.arguments.some(arg => {
							return ts.isCallExpression(arg) && ASTUtils.isMethodCall(arg, "Effect", "catchTag") &&
								arg.arguments[0] && ts.isStringLiteral(arg.arguments[0]) && arg.arguments[0].text === "Timeout";
						})) {
							isHandled = true;
							break;
						}
					}
					current = parentNode as ts.CallExpression;
				}

				if (!isHandled) {
					createFinding(ctx, node, "timeouts-without-cancellation-awareness", rules);
				}
			}
		}
	}

	// 17.11 Promise concurrency (alias)
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Promise", "all") && looksLikeEffectCode(ctx.sourceFile)) {
			createFinding(ctx, node, "promise-concurrency-in-effect", rules);
		}
	}

	// 17. Correctness & Concurrency Anti-Patterns

	// 17.1 yield instead of yield*
	if (ts.isYieldExpression(node) && !node.asteriskToken) {
		if (isInsideEffectGen(node)) {
			createFinding(ctx, node, "yield-instead-of-yield-star", rules);
		}
	}

	// 17.2 Async callbacks in Effect combinators
	if (
		(ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
		node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
	) {
		if (isArgumentOfEffectCombinator(node)) {
			createFinding(ctx, node, "async-callbacks-in-effect-combinators", rules);
		}
	}

	// 17.3 Promise APIs inside Effect logic
	if (ts.isCallExpression(node)) {
		if (
			ASTUtils.isMethodCall(node, "Promise", "all") ||
			ASTUtils.isMethodCall(node, "Promise", "race") ||
			ASTUtils.isMethodCall(node, "Promise", "allSettled") ||
			ASTUtils.isMethodCall(node, "Promise", "any")
		) {
			if (looksLikeEffectCode(ctx.sourceFile) && (isInsideEffectGen(node) || isInsideEffectCombinator(node))) {
				createFinding(ctx, node, "promise-apis-inside-effect-logic", rules);
				createFinding(ctx, node, "promise-concurrency-in-effect", rules);
			}
		}
	}

	// 17.4 Running effects outside boundaries (merging effect-runSync-unsafe logic)
	if (ts.isCallExpression(node)) {
		if (
			ASTUtils.isMethodCall(node, "Effect", "runPromise") ||
			ASTUtils.isMethodCall(node, "Effect", "runSync") ||
			ASTUtils.isMethodCall(node, "Effect", "runFork")
		) {
			if (!isBoundary) {
				// Fire both/all relevant rules to satisfy different tests
				createFinding(ctx, node, "run-effect-outside-boundary", rules);
				createFinding(ctx, node, "effect-run-promise-boundary", rules);
			}
		}
	}

	// 17.5 Incorrect promise bridge
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "tryPromise") || ASTUtils.isMethodCall(node, "Effect", "promise")) {
			if (node.arguments.length > 0) {
				const arg = node.arguments[0];
				// Check for () => identifier
				if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
					if (arg.body && ts.isIdentifier(arg.body)) {
						createFinding(ctx, node, "incorrect-promise-bridge", rules);
					}
				}
			}
		}
	}

	// 17.6 Blocking calls in Effect
	if (ts.isCallExpression(node)) {
		if (ts.isPropertyAccessExpression(node.expression)) {
			const methodName = node.expression.name.text;
			if (
				methodName.endsWith("Sync") &&
				looksLikeEffectCode(ctx.sourceFile) &&
				(isInsideEffectGen(node) || isInsideEffectCombinator(node))
			) {
				createFinding(ctx, node, "blocking-calls-in-effect", rules);
				createFinding(ctx, node, "blocking-calls-in-effect-logic", rules);
			}
		}
	}

	// 17.7 Ignoring fiber failures (Fire-and-forget fork)
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "fork")) {
			// Check if the result is used
			const parent = node.parent;
			let isUsed = false;
			if (ts.isVariableDeclaration(parent) || ts.isBinaryExpression(parent)) {
				isUsed = true;
			} else if (ts.isYieldExpression(parent)) {
				const yieldParent = parent.parent; // Variable declaration or assignment
				if (ts.isVariableDeclaration(yieldParent) || ts.isBinaryExpression(yieldParent)) {
					isUsed = true;
				}
			} else if (ts.isCallExpression(parent) && (
				ASTUtils.isMethodCall(parent, "Effect", "flatMap") ||
				ASTUtils.isMethodCall(parent, "Effect", "map") ||
				ASTUtils.isMethodCall(parent, "Effect", "tap")
			)) {
				isUsed = true; // Used in chain
			}

			if (!isUsed) {
				createFinding(ctx, node, "ignoring-fiber-failures", rules);
				createFinding(ctx, node, "fire-and-forget-fork", rules); // alias
			}
		}
	}

	// 17.8 Unbounded parallelism & Retrying concurrently
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "all")) {
			// Check arguments
			if (node.arguments.length > 0) {
				const effectsArg = node.arguments[0];
				// Check for concurrency option
				let hasConcurrencyLimit = false;
				if (node.arguments.length > 1) {
					const options = node.arguments[1];
					if (ts.isObjectLiteralExpression(options)) {
						hasConcurrencyLimit = options.properties.some(p =>
							ts.isPropertyAssignment(p) &&
							ts.isIdentifier(p.name) &&
							p.name.text === "concurrency"
						);
					}
				}

				if (!hasConcurrencyLimit) {
					// 1. Unbounded parallelism
					// Flag if input is dynamic (Identifier or CallExpression like .map)
					if (ts.isIdentifier(effectsArg) || ts.isCallExpression(effectsArg)) {
						createFinding(ctx, node, "unbounded-parallelism", rules);
						createFinding(ctx, node, "unbounded-parallelism-effect-all", rules);
					}

					// 2. Retrying concurrently
					const hasRetry = (n: ts.Node): boolean => {
						let found = false;
						const visit = (c: ts.Node) => {
							if (found) return;
							if (ts.isCallExpression(c) && ASTUtils.isMethodCall(c, "Effect", "retry")) {
								found = true;
							}
							ts.forEachChild(c, visit);
						}
						visit(n);
						return found;
					}

					if (hasRetry(effectsArg)) {
						createFinding(ctx, node, "retrying-concurrently-without-limits", rules);
					}
				}
			}
		}
	}

	// 17.9 Shared mutable state across fibers
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "fork")) {
			const effectArg = node.arguments[0];
			if (effectArg) {
				let accessesMutableState = false;
				const checkMutability = (n: ts.Node) => {
					if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
						if (ts.isIdentifier(n.left) || ts.isPropertyAccessExpression(n.left)) {
							accessesMutableState = true;
						}
					}
					if (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) {
						if (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken) {
							accessesMutableState = true;
						}
					}
					ts.forEachChild(n, checkMutability);
				};
				checkMutability(effectArg);
				if (accessesMutableState) {
					createFinding(ctx, node, "shared-mutable-state-across-fibers", rules);
				}
			}
		}
	}

	// 17.10 Timeouts without cancellation awareness
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "timeout")) {
			let checkNode = node;
			// If curried timeout(d)(e), we want to check the outer call
			if (node.arguments.length === 1 && node.parent && ts.isCallExpression(node.parent) && node.parent.expression === node) {
				checkNode = node.parent;
			}

			if (!isPipedToHandling(checkNode)) {
				createFinding(ctx, node, "timeouts-without-cancellation-awareness", rules);
			}
		}
	}

	// 17.12 Forking inside loops
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "fork")) {
			let parent = node.parent;
			while (parent) {
				if (
					ts.isForStatement(parent) ||
					ts.isForOfStatement(parent) ||
					ts.isForInStatement(parent) ||
					ts.isWhileStatement(parent) ||
					ts.isDoStatement(parent)
				) {
					createFinding(ctx, node, "forking-inside-loops", rules);
					break;
				}
				if (ts.isFunctionLike(parent)) break; // Stop at function boundary
				parent = parent.parent;
			}
		}
	}

	// 17.13 Racing without handling losers
	if (ts.isCallExpression(node)) {
		if (ASTUtils.isMethodCall(node, "Effect", "race")) {
			// Check if handled by argument (as in some test variants) or by pipe
			const isHandledByArg = node.arguments.some(arg =>
				ts.isCallExpression(arg) && (
					ASTUtils.isMethodCall(arg, "Effect", "match") ||
					ASTUtils.isMethodCall(arg, "Effect", "catchAll") ||
					ASTUtils.isMethodCall(arg, "Effect", "matchEffect")
				)
			);

			if (!isHandledByArg && !isPipedToHandling(node)) {
				createFinding(ctx, node, "racing-without-handling-losers", rules);
			}
		}
	}

	ts.forEachChild(node, (child) => visitNode(child, ctx, rules));
};

// Helper: Check if an expression is piped to a handling method
const isPipedToHandling = (node: ts.Node): boolean => {
	let current = node;
	while (current.parent) {
		const parent = current.parent;
		if (ts.isPropertyAccessExpression(parent) && parent.name.text === "pipe" && parent.expression === current) {
			const pipeCall = parent.parent;
			if (pipeCall && ts.isCallExpression(pipeCall)) {
				const hasHandler = pipeCall.arguments.some(arg => {
					return ts.isCallExpression(arg) && (
						ASTUtils.isMethodCall(arg, "Effect", "catchTag") ||
						ASTUtils.isMethodCall(arg, "Effect", "match") ||
						ASTUtils.isMethodCall(arg, "Effect", "matchEffect") ||
						ASTUtils.isMethodCall(arg, "Effect", "orElse") ||
						ASTUtils.isMethodCall(arg, "Effect", "catchAll")
					);
				});
				if (hasHandler) return true;
				current = pipeCall;
				continue;
			}
		}
		if (ts.isCallExpression(parent) && parent.expression === current) {
			current = parent;
			continue;
		}
		break;
	}
	return false;
};

// Helper: Check if node is inside an Effect combinator callback
const isInsideEffectCombinator = (node: ts.Node): boolean => {
	let parent = node.parent;
	while (parent) {
		if (ts.isCallExpression(parent)) {
			if (
				ASTUtils.isMethodCall(parent, "Effect", "map") ||
				ASTUtils.isMethodCall(parent, "Effect", "flatMap") ||
				ASTUtils.isMethodCall(parent, "Effect", "tap") ||
				ASTUtils.isMethodCall(parent, "Effect", "catchAll") ||
				ASTUtils.isMethodCall(parent, "Effect", "catchTag") ||
				ASTUtils.isMethodCall(parent, "Effect", "match") ||
				ASTUtils.isMethodCall(parent, "Effect", "zip") ||
				ASTUtils.isMethodCall(parent, "Effect", "zipRight") ||
				ASTUtils.isMethodCall(parent, "Effect", "zipLeft") ||
				ASTUtils.isMethodCall(parent, "Effect", "forEach") ||
				ASTUtils.isMethodCall(parent, "Effect", "all")
			) {
				return true;
			}
		}
		if (ts.isFunctionDeclaration(parent) || ts.isMethodDeclaration(parent)) {
			return false;
		}
		parent = parent.parent;
	}
	return false;
};

// Helper: Check if node is a direct argument of an Effect combinator
const isArgumentOfEffectCombinator = (node: ts.Node): boolean => {
	const parent = node.parent;
	if (ts.isCallExpression(parent)) {
		if (
			ASTUtils.isMethodCall(parent, "Effect", "map") ||
			ASTUtils.isMethodCall(parent, "Effect", "flatMap") ||
			ASTUtils.isMethodCall(parent, "Effect", "tap") ||
			ASTUtils.isMethodCall(parent, "Effect", "catchAll") ||
			ASTUtils.isMethodCall(parent, "Effect", "catchTag") ||
			ASTUtils.isMethodCall(parent, "Effect", "match") ||
			ASTUtils.isMethodCall(parent, "Effect", "forEach") ||
			ASTUtils.isMethodCall(parent, "Effect", "zipWith") ||
			ASTUtils.isMethodCall(parent, "Effect", "reduce")
		) {
			return parent.arguments.includes(node as ts.Expression);
		}
	}
	return false;
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

// === Scope Anti-Pattern Helper Functions ===

// Helper: Check if node is at module level (not inside a function)
const isAtModuleLevel = (node: ts.Node): boolean => {
	let parent = node.parent;
	while (parent) {
		if (
			ts.isFunctionDeclaration(parent) ||
			ts.isFunctionExpression(parent) ||
			ts.isArrowFunction(parent) ||
			ts.isMethodDeclaration(parent) ||
			ts.isClassDeclaration(parent) ||
			ts.isBlock(parent)
		) {
			return false;
		}
		if (ts.isSourceFile(parent)) {
			return true;
		}
		parent = parent.parent;
	}
	return false;
};

// Helper: Check if there's resource creation in the current scope
const hasResourceCreationInScope = (node: ts.Node): boolean => {
	// Simple heuristic: look for common resource creation patterns
	let found = false;
	const visit = (n: ts.Node) => {
		if (found) return;

		// Look for resource creation patterns
		if (ts.isNewExpression(n)) {
			// Common resource types
			if (ts.isIdentifier(n.expression)) {
				const typeName = n.expression.text;
				if (
					typeName.includes("Connection") ||
					typeName.includes("Client") ||
					typeName.includes("Socket") ||
					typeName.includes("Stream") ||
					typeName.includes("File") ||
					typeName.includes("Database")
				) {
					found = true;
					return;
				}
			}
		}

		// Look for fs.open, createConnection, etc.
		if (ts.isCallExpression(n)) {
			if (ts.isPropertyAccessExpression(n.expression)) {
				const methodName = n.expression.name.text;
				if (
					methodName === "open" ||
					methodName === "createConnection" ||
					methodName === "connect" ||
					methodName === "create"
				) {
					found = true;
					return;
				}
			}
		}

		ts.forEachChild(n, visit);
	};

	// Search from the current function scope up to the source file
	let scope = node.parent;
	while (scope && !ts.isSourceFile(scope)) {
		ts.forEachChild(scope, visit);
		if (found) return true;
		scope = scope.parent;
	}

	return false;
};

// Helper: Check if Effect.succeed is wrapping a resource
const isReturningResource = (node: ts.Node): boolean => {
	if (ts.isCallExpression(node) && node.arguments.length > 0) {
		const arg = node.arguments[0];

		// Check if the argument looks like a resource
		if (ts.isIdentifier(arg)) {
			const name = arg.text;
			return (
				name.includes("conn") ||
				name.includes("client") ||
				name.includes("socket") ||
				name.includes("stream") ||
				name.includes("file") ||
				name.includes("resource")
			);
		}

		// Check if it's a new expression creating a resource
		if (ts.isNewExpression(arg)) {
			if (ts.isIdentifier(arg.expression)) {
				const typeName = arg.expression.text;
				return (
					typeName.includes("Connection") ||
					typeName.includes("Client") ||
					typeName.includes("Socket") ||
					typeName.includes("Stream")
				);
			}
		}
	}

	return false;
};

// Helper: Count nested acquireRelease calls
const countNestedAcquireRelease = (node: ts.Node): number => {
	let count = 0;

	const visit = (n: ts.Node) => {
		if (ts.isCallExpression(n)) {
			if (ASTUtils.isMethodCall(n, "Effect", "acquireRelease")) {
				count++;
			}
		}
		ts.forEachChild(n, visit);
	};

	visit(node);
	return count;
};

// Helper: Check if node is inside an acquireRelease cleanup function
const isInsideAcquireReleaseCleanup = (node: ts.Node): boolean => {
	let parent = node.parent;
	while (parent) {
		// Check if we're inside the second argument of acquireRelease (the cleanup function)
		if (ts.isCallExpression(parent) && ASTUtils.isMethodCall(parent, "Effect", "acquireRelease")) {
			if (parent.arguments.length >= 2) {
				const cleanupArg = parent.arguments[1];
				// Check if the current node is inside the cleanup function
				return isNodeInsideFunction(node, cleanupArg);
			}
		}
		parent = parent.parent;
	}
	return false;
};

// Helper: Check if a node is inside a specific function node
const isNodeInsideFunction = (node: ts.Node, functionNode: ts.Node): boolean => {
	let current = node.parent;
	while (current) {
		if (current === functionNode) {
			return true;
		}
		if (ts.isSourceFile(current)) {
			return false;
		}
		current = current.parent;
	}
	return false;
};


// Helper: Check if a new expression looks like a resource singleton
const looksLikeResourceSingleton = (node: ts.NewExpression): boolean => {
	if (!ts.isIdentifier(node.expression)) {
		return false;
	}

	const typeName = node.expression.text;

	// Check for common resource singleton patterns
	return (
		typeName.includes("Client") ||
		typeName.includes("Connection") ||
		typeName.includes("Socket") ||
		typeName.includes("Pool") ||
		typeName.includes("Database") ||
		typeName.includes("Cache") ||
		typeName.includes("Queue") ||
		typeName.includes("Store") ||
		typeName.includes("Repository") ||
		typeName.includes("Service") ||
		typeName.includes("Manager") ||
		typeName.includes("Controller")
	);
};

// === Domain Modeling Rule Helper Functions ===

// Helper: Check if a condition has complex domain logic
const hasComplexDomainLogic = (condition: ts.Expression): boolean => {
	// Look for comparisons with magic numbers/strings
	if (ts.isBinaryExpression(condition)) {
		const left = condition.left;
		const right = condition.right;
		const operator = condition.operatorToken.kind;

		// Check for comparisons against literals
		if (
			(ts.isNumericLiteral(right) || ts.isStringLiteral(right)) &&
			(operator === ts.SyntaxKind.EqualsEqualsToken ||
				operator === ts.SyntaxKind.EqualsEqualsEqualsToken ||
				operator === ts.SyntaxKind.LessThanToken ||
				operator === ts.SyntaxKind.GreaterThanToken)
		) {
			return true;
		}

		// Recursively check nested conditions
		return hasComplexDomainLogic(left) || hasComplexDomainLogic(right);
	}

	return false;
};

// Helper: Check if type/interface has primitive domain concepts (raw strings/numbers for domain ideas)
const hasPrimitiveDomainConcepts = (node: ts.Node): boolean => {
	let members: ts.TypeElement[] = [];
	let nodeName = "";

	if (ts.isInterfaceDeclaration(node)) {
		members = [...node.members];
		if (node.name) nodeName = node.name.text;
	} else if (ts.isTypeAliasDeclaration(node)) {
		if (ts.isTypeLiteralNode(node.type)) {
			members = [...node.type.members];
		} else {
			return false;
		}
		if (node.name) nodeName = node.name.text;
	}

	// Interfaces are typically intended for data/domain contracts
	// Only flag type aliases that look like domain entities with primitives
	const isInterface = ts.isInterfaceDeclaration(node);
	if (isInterface) return false; // Interfaces with primitives are OK - they're describing contracts

	// Check if this looks like a domain entity (User, Order, Product, etc.)
	const isDomainEntity = /^(User|Order|Product|Payment|Account|Item|Entity)/i.test(nodeName);
	if (!isDomainEntity) return false;

	// Count how many fields have primitive types (string, number)
	let primitiveFieldCount = 0;

	for (const member of members) {
		if (ts.isPropertySignature(member) && member.name && member.type) {
			// Check if type is primitive (string, number) - these should often be domain types
			if (
				member.type.kind === ts.SyntaxKind.StringKeyword ||
				member.type.kind === ts.SyntaxKind.NumberKeyword
			) {
				primitiveFieldCount++;
			}
		}
	}

	// Flag if domain entity has multiple primitive fields (should use domain types)
	return primitiveFieldCount >= 2;
};

// Helper: Check if function has boolean parameters controlling behavior
const hasBooleanControllingBehavior = (node: ts.Node): boolean => {
	let parameters: ts.ParameterDeclaration[] = [];

	if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		parameters = [...node.parameters];
	} else if (ts.isMethodDeclaration(node)) {
		parameters = [...node.parameters];
	}

	// Look for boolean parameters that start with "is" or control flow
	for (const param of parameters) {
		if (param.type && param.type.kind === ts.SyntaxKind.BooleanKeyword) {
			if (param.name && ts.isIdentifier(param.name)) {
				const name = param.name.text;
				if (name.startsWith("is") || name.startsWith("has") || name === "enabled" || name === "admin") {
					return true;
				}
			}
		}
	}

	return false;
};

// Helper: Check if condition has magic string comparisons
const hasMagicStringComparisons = (condition: ts.Expression): boolean => {
	if (ts.isBinaryExpression(condition)) {
		const left = condition.left;
		const right = condition.right;
		const operator = condition.operatorToken.kind;

		// Check for string literal comparisons
		if (
			(ts.isStringLiteral(right) || ts.isStringLiteral(left)) &&
			(operator === ts.SyntaxKind.EqualsEqualsToken ||
				operator === ts.SyntaxKind.EqualsEqualsEqualsToken ||
				operator === ts.SyntaxKind.ExclamationEqualsToken ||
				operator === ts.SyntaxKind.ExclamationEqualsEqualsToken)
		) {
			return true;
		}

		// Recursively check nested conditions
		return hasMagicStringComparisons(left) || hasMagicStringComparisons(right);
	}

	return false;
};

// Helper: Check if class looks like an implicit state machine
const looksLikeImplicitStateMachine = (node: ts.ClassDeclaration): boolean => {
	if (!node.members) return false;

	// Look for properties with union types (state field) and methods that mutate it
	let hasStateProperty = false;
	let hasMutatingMethods = false;

	for (const member of node.members) {
		// Look for state property (string union)
		if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
			const name = member.name.text;
			if (
				(name === "status" || name === "state" || name.endsWith("Status")) &&
				member.type &&
				(ts.isUnionTypeNode(member.type) || member.type.kind === ts.SyntaxKind.StringKeyword)
			) {
				hasStateProperty = true;
			}
		}

		// Look for methods that might mutate state
		if (ts.isMethodDeclaration(member) && member.body) {
			const body = member.body;
			let hasStateAssignment = false;
			const checkAssignment = (n: ts.Node) => {
				if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
					if (ts.isPropertyAccessExpression(n.left)) {
						const propName = n.left.name.text;
						if (propName === "status" || propName === "state" || propName.endsWith("Status")) {
							hasStateAssignment = true;
						}
					}
				}
				ts.forEachChild(n, checkAssignment);
			};
			checkAssignment(body);
			if (hasStateAssignment) hasMutatingMethods = true;
		}
	}

	return hasStateProperty && hasMutatingMethods;
};

// Helper: Check if interface/type has overloaded config pattern
const hasOverloadedConfigPattern = (node: ts.Node): boolean => {
	let members: ts.TypeElement[] = [];

	if (ts.isInterfaceDeclaration(node)) {
		members = [...node.members];
	} else if (ts.isTypeAliasDeclaration(node)) {
		if (ts.isTypeLiteralNode(node.type)) {
			members = [...node.type.members];
		} else {
			return false;
		}
	}

	// Overloaded config pattern: 2+ nested objects WITH optional nested objects
	// (having 2 nested objects is OK if they're not optional - that's just composition)
	let nestedObjectCount = 0;
	let optionalNestedCount = 0;

	for (const member of members) {
		if (ts.isPropertySignature(member) && member.type) {
			// Check if property type is a nested object
			if (ts.isTypeLiteralNode(member.type)) {
				nestedObjectCount++;
				if (member.questionToken !== undefined) {
					optionalNestedCount++;
				}
			}
		}
	}

	// Only flag if we have nested objects AND some are optional (overloaded pattern)
	return nestedObjectCount >= 2 && optionalNestedCount > 0;
};

// Helper: Check if type has raw string id field
const hasRawStringIdField = (node: ts.Node): boolean => {
	let members: ts.TypeElement[] = [];

	if (ts.isInterfaceDeclaration(node)) {
		members = [...node.members];
	} else if (ts.isTypeAliasDeclaration(node)) {
		if (ts.isTypeLiteralNode(node.type)) {
			members = [...node.type.members];
		} else {
			return false;
		}
	}

	for (const member of members) {
		if (ts.isPropertySignature(member) && member.name) {
			const name = ts.isIdentifier(member.name) ? member.name.text : "";
			// Look for id, userId, orderId, etc.
			if (name && (name === "id" || name.endsWith("Id"))) {
				if (member.type && member.type.kind === ts.SyntaxKind.StringKeyword) {
					return true;
				}
			}
		}
	}

	return false;
};

// Helper: Check if type has time as raw number or Date
const hasTimeAsRawType = (node: ts.Node): boolean => {
	let members: ts.TypeElement[] = [];

	if (ts.isInterfaceDeclaration(node)) {
		members = [...node.members];
	} else if (ts.isTypeAliasDeclaration(node)) {
		if (ts.isTypeLiteralNode(node.type)) {
			members = [...node.type.members];
		} else {
			return false;
		}
	}

	const timeKeywords = ["timestamp", "expiresAt", "createdAt", "updatedAt", "date", "time"];

	for (const member of members) {
		if (ts.isPropertySignature(member) && member.name) {
			const name = ts.isIdentifier(member.name) ? member.name.text : "";
			const isTimeField = timeKeywords.some((kw) => name.toLowerCase().includes(kw));

			if (isTimeField && member.type) {
				// Check for number
				if (member.type.kind === ts.SyntaxKind.NumberKeyword) {
					return true;
				}

				// Check for Date (identifier)
				if (ts.isTypeReferenceNode(member.type) && ts.isIdentifier(member.type.typeName)) {
					if (member.type.typeName.text === "Date") {
						return true;
					}
				}
			}
		}
	}

	return false;
};

// Helper: Check if class looks like a service class
const looksLikeServiceClass = (node: ts.ClassDeclaration): boolean => {
	if (!node.name) return false;

	const className = node.name.text;
	// Check for Service, Repository, Controller, etc.
	return (
		className.includes("Service") ||
		className.includes("Repository") ||
		className.includes("Controller") ||
		className.includes("Manager") ||
		className.includes("Handler")
	);
};

// Helper: Check if service class has generic methods that don't encode domain meaning
const hasGenericServiceMethod = (node: ts.ClassDeclaration): boolean => {
	if (!node.members) return false;

	// Look for methods with generic fetch/get patterns that return 'any' or Promise
	for (const member of node.members) {
		if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
			const methodName = member.name.text;
			// Generic patterns that suggest domain meaning comes from file structure
			if ((methodName === "get" || methodName.startsWith("get") || methodName === "fetch") && member.body) {
				// Check for fetch calls without specific return types
				const hasFetchCall = checkForFetchCall(member.body);
				if (hasFetchCall) {
					// Check if return type is generic (Promise<any> or just Promise)
					if (!member.type || returnTypeIsGeneric(member.type)) {
						return true;
					}
				}
			}
		}
	}

	return false;
};

// Helper: Check if return type is generic (any, Promise, etc.)
const returnTypeIsGeneric = (typeNode: ts.TypeNode | undefined): boolean => {
	if (!typeNode) return true;

	// Check for any, Promise, Promise<any>
	if (ts.isTypeReferenceNode(typeNode)) {
		if (ts.isIdentifier(typeNode.typeName)) {
			const typeName = typeNode.typeName.text;
			// Generic Promise without specific type argument means generic
			if (typeName === "Promise") {
				// Promise with type arguments is OK (Promise<User> is specific)
				if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
					const arg = typeNode.typeArguments[0];
					// But Promise<any> is still generic
					if (arg && arg.kind === ts.SyntaxKind.AnyKeyword) {
						return true;
					}
					// Promise<specific type> is not generic
					return false;
				}
				// Promise without type arguments is generic
				return true;
			}
			if (typeName === "any") {
				return true;
			}
		}
	}

	return false;
};

// Helper: Check if a block contains fetch calls
const checkForFetchCall = (node: ts.Node): boolean => {
	let found = false;
	const visit = (n: ts.Node) => {
		if (found) return;
		if (ts.isCallExpression(n)) {
			if (ts.isIdentifier(n.expression) && n.expression.text === "fetch") {
				found = true;
				return;
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
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

			const analyze = (
				input: AnalyzeCodeInput
			): Effect.Effect<AnalyzeCodeOutput, never> =>
				Effect.gen(function* () {
					const [rulesList, resolvedConfig, fixesList] = yield* Effect.all([
						registry.listRules(input.config),
						registry.getResolvedConfig(input.config),
						registry.listFixes(),
					]);
					const ruleById: Map<RuleId, RuleDefinition> = new Map(
						rulesList.map((r) => [r.id, r] as const)
					);
					const resolvedLevelByRuleId: Partial<Record<RuleId, RuleLevel>> =
						Object.fromEntries(
							Object.entries(resolvedConfig.rules).map(([id, c]) => [id, c.level])
						) as Partial<Record<RuleId, RuleLevel>>;
					const fixById = new Map(
						fixesList.map((f) => [f.id, f] as const)
					);

					const filename = input.filename ?? "anonymous.ts";
					const sourceFile = ASTUtils.createSourceFile(
						filename,
						input.source
					);

					const ctx: AnalysisContext = {
						sourceFile,
						filename,
						source: input.source,
						findings: [],
						suggestions: new Set(),
						resolvedLevelByRuleId,
						fixById,
					};

					const allowedCategories = categoriesForAnalysisType(
						input.analysisType ?? "all"
					);
					const filteredRuleById: Map<RuleId, RuleDefinition> = new Map(
						Array.from(ruleById.entries()).filter(([, rule]) =>
							allowedCategories.includes(rule.category)
						)
					);

					// Check for non-ts
					if (
						filename &&
						!filename.endsWith(".ts") &&
						!filename.endsWith(".tsx")
					) {
						createFinding(
							ctx,
							sourceFile,
							"non-typescript",
							filteredRuleById
						);
					} else {
						// Traverse AST
						visitNode(sourceFile, ctx, filteredRuleById);
					}

					// Map suggestions
					const suggestions = Array.from(ctx.suggestions).map((id) => {
						const rule = filteredRuleById.get(id) ?? ruleById.get(id);
						return {
							id,
							title: rule?.title ?? "",
							message: rule?.message ?? "",
							severity: rule?.severity ?? "low",
						} satisfies CodeSuggestion;
					});

					return { suggestions, findings: ctx.findings, sourceFile: ctx.sourceFile };
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
