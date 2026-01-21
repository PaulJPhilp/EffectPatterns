import type {
	ChangeDescription,
	Finding,
	FixDefinition,
	FixStep,
	RuleDefinition,
} from "../../tools/schemas";

/**
 * Generate fix steps from rule and fix definitions
 */
export function generateSteps(
	_finding: Finding,
	rule: RuleDefinition,
	fixes: readonly FixDefinition[],
): readonly FixStep[] {
	const steps: FixStep[] = [];

	// Map rule categories to generic step templates
	switch (rule.category) {
		case "errors":
			if (rule.id.includes("generic")) {
				steps.push({
					order: 1,
					action: "Define domain-specific error types",
					detail:
						"Create tagged error types using Data.TaggedError for your domain errors",
				});
				steps.push({
					order: 2,
					action: "Replace Error in Effect type signature",
					detail:
						"Update Effect<Success, Error> to Effect<Success, YourError1 | YourError2>",
				});
				steps.push({
					order: 3,
					action: "Update error handling code",
					detail:
						"Use Effect.catchTag() for specific error handling instead of catchAll",
				});
			} else {
				steps.push({
					order: 1,
					action: "Review error handling pattern",
					detail: "Check if error is properly typed and handled",
				});
				steps.push({
					order: 2,
					action: "Apply suggested fix from available fixes",
					detail: `Consider using: ${fixes.map((f) => f.title).join(", ") || "manual fix"}`,
				});
			}
			break;

		case "async":
			steps.push({
				order: 1,
				action: "Replace async/await with Effect composition",
				detail:
					"Convert Promise-based code to Effect.gen() or other Effect combinators",
			});
			steps.push({
				order: 2,
				action: "Handle errors properly",
				detail:
					"Use Effect error handling (catchTag, catchAll) instead of try/catch",
			});
			steps.push({
				order: 3,
				action: "Test async flow",
				detail:
					"Verify that async behavior (concurrency, timing) works as expected",
			});
			break;

		case "validation":
			steps.push({
				order: 1,
				action: "Import Schema from effect",
				detail: "Add: import { Schema } from 'effect'",
			});
			steps.push({
				order: 2,
				action: "Define validation schema",
				detail:
					"Create a Schema to describe expected input shape and constraints",
			});
			steps.push({
				order: 3,
				action: "Apply validation at boundaries",
				detail:
					"Use Schema.decodeUnknown() for external data and Schema.decode() for internal",
			});
			break;

		case "dependency-injection":
			steps.push({
				order: 1,
				action: "Define Effect.Service",
				detail: "Replace Context.Tag with modern Effect.Service pattern",
			});
			steps.push({
				order: 2,
				action: "Provide service implementation",
				detail: "Use Layer to provide the service in your Effect environment",
			});
			steps.push({
				order: 3,
				action: "Update consumers",
				detail: "Change access pattern to use Service instead of Context.Tag",
			});
			break;

		case "resources":
			steps.push({
				order: 1,
				action: "Identify resource lifecycle",
				detail: "Determine when resources should be acquired and released",
			});
			steps.push({
				order: 2,
				action: "Use Effect.acquireRelease",
				detail: "Wrap resource acquisition with proper cleanup guarantees",
			});
			steps.push({
				order: 3,
				action: "Test resource cleanup",
				detail:
					"Verify resources are released even if code throws or exits early",
			});
			break;

		default:
			// Generic steps for other categories
			steps.push({
				order: 1,
				action: "Understand the issue",
				detail: rule.message,
			});
			if (fixes.length > 0) {
				steps.push({
					order: 2,
					action: `Apply fix: ${fixes[0].title}`,
					detail: fixes[0].description,
				});
			} else {
				steps.push({
					order: 2,
					action: "Make the necessary code changes",
					detail: "Implement the fix based on the issue description",
				});
			}
	}

	return steps;
}

/**
 * Describe what will change when the fix is applied
 */
export function generateChanges(
	finding: Finding,
	rule: RuleDefinition,
	_steps: readonly FixStep[],
): readonly ChangeDescription[] {
	const changes: ChangeDescription[] = [];

	// Determine scope based on finding location
	const isMultiLine = finding.range.endLine - finding.range.startLine > 0;

	switch (rule.category) {
		case "errors":
			changes.push({
				type: "add",
				scope: "This file",
				description: "Error type definitions or imports added",
			});
			changes.push({
				type: "modify",
				scope: "Error type signature",
				description: "Replace generic Error with specific error union type",
			});
			break;

		case "async":
			changes.push({
				type: "modify",
				scope: "Function implementation",
				description: "Replace async/await with Effect composition",
			});
			changes.push({
				type: "modify",
				scope: "Error handling",
				description: "Update from try/catch to Effect error handling",
			});
			break;

		case "validation":
			changes.push({
				type: "add",
				scope: "Schema definition",
				description: "New Schema added for input validation",
			});
			changes.push({
				type: "modify",
				scope: "Function",
				description: "Input validation call added",
			});
			break;

		case "dependency-injection":
			changes.push({
				type: "modify",
				scope: "Service definition",
				description: "Migrate from Context.Tag to Effect.Service",
			});
			changes.push({
				type: "modify",
				scope: "Multiple locations",
				description: "Update service access pattern in consumers",
			});
			break;

		default:
			changes.push({
				type: "modify",
				scope: isMultiLine ? "Multiple lines" : "Single line",
				description: "Code changes required to fix issue",
			});
	}

	return changes;
}

/**
 * Generate risks based on rule category
 */
export function generateRisks(rule: RuleDefinition): readonly string[] {
	const risks: string[] = [];

	switch (rule.category) {
		case "errors":
			risks.push(
				"Downstream code may expect generic Error type - check call sites",
			);
			risks.push("Error handling patterns must update to use catchTag");
			break;

		case "async":
			risks.push("Breaking change if consumers expect Promise return type");
			risks.push("May require updating all call sites");
			break;

		case "validation":
			risks.push(
				"Validation may reject previously accepted inputs - test thoroughly",
			);
			risks.push(
				"Schema enforcement happens at boundaries - unexpected inputs will fail",
			);
			break;

		case "dependency-injection":
			risks.push(
				"Pattern change affects service layer - coordinate with dependent code",
			);
			risks.push("DI container configuration may need updates");
			break;

		case "resources":
			risks.push(
				"Resource lifecycle management becomes stricter - ensure cleanup",
			);
			risks.push(
				"Leaking resources could cause issues - test resource cleanup",
			);
			break;

		default:
			risks.push("Review the fix carefully before applying");
			risks.push("Test the change in your local environment first");
	}

	return risks;
}
