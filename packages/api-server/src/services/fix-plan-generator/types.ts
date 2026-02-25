import type {
	ChangeDescription,
	Finding,
	FixDefinition,
	FixPlan,
	FixStep,
	RuleDefinition,
} from "../../tools/schemas";

/**
 * Input for generating a fix plan
 */
export interface GenerateFixPlanInput {
	readonly finding: Finding;
	readonly rule: RuleDefinition;
	readonly allFixes: readonly FixDefinition[];
}

/**
 * Re-exported types for convenience
 */
export type { ChangeDescription, Finding, FixDefinition, FixPlan, FixStep, RuleDefinition };
