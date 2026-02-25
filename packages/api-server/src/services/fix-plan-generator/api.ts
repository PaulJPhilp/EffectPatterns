import { Effect } from "effect";
import type { FixPlan } from "../../tools/schemas";
import type { GenerateFixPlanInput } from "./types";
import { generateSteps, generateChanges, generateRisks } from "./helpers";

/**
 * FixPlanGeneratorService - Generate fix plans for code findings
 *
 * Creates actionable but not-copy-paste-ready fix plans that show:
 * - Steps to fix (3-5 items)
 * - What will change (2-4 items)
 * - Risks to watch for (1-3 items)
 */
export class FixPlanGeneratorService extends Effect.Service<
	FixPlanGeneratorService
>()("FixPlanGeneratorService", {
	effect: Effect.gen(function* () {
		/**
		 * Generate a fix plan for a finding
		 */
		const generate = (
			finding: Parameters<typeof generateSteps>[0],
			rule: Parameters<typeof generateRisks>[0],
			allFixes: Parameters<typeof generateSteps>[2]
		): Effect.Effect<FixPlan, never> =>
			Effect.sync(() => {
				// Get relevant fixes for this rule
				const relevantFixes = rule.fixIds
					.map((id) => allFixes.find((f) => f.id === id))
					.filter((f) => f !== undefined) as typeof allFixes;

				// Generate steps from fix descriptions
				const steps = generateSteps(finding, rule, relevantFixes);

				// Describe what will change
				const changes = generateChanges(finding, rule, steps);

				// Identify risks based on category
				const risks = generateRisks(rule);

				return {
					steps,
					changes,
					risks,
				};
			});

		/**
		 * Generate fix plan from input object
		 */
		const generateFromInput = (
			input: GenerateFixPlanInput
		): Effect.Effect<FixPlan, never> =>
			generate(input.finding, input.rule, input.allFixes);

		return {
			generate,
			generateFromInput,
		};
	}),
}) { }
