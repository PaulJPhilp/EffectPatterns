import {
	buildSnippet,
	findEffectPatternBySlug
} from "@effect-patterns/toolkit";
import { Effect } from "effect";
import {
	getPattern as getTemplatePattern,
	listPatterns as listTemplatePatterns,
	renderTemplate,
	validateVariables,
} from "../tools/patterns";

type ModuleType = "esm" | "cjs";

/**
 * Input for generating from hardcoded templates (quick scaffolding)
 */
export interface GenerateFromTemplateInput {
	readonly patternId: string;
	readonly variables: Record<string, string>;
}

/**
 * Input for generating from database patterns
 */
export interface GenerateFromDatabaseInput {
	readonly patternId: string;
	readonly customName?: string;
	readonly customInput?: string;
	readonly moduleType?: ModuleType;
	readonly effectVersion?: string;
}

/**
 * Output from pattern generation
 */
export interface GeneratePatternOutput {
	readonly patternId: string;
	readonly name: string;
	readonly imports: readonly string[];
	readonly code: string;
	readonly source: "template" | "database";
}

/**
 * Generate code from a database pattern (standalone function)
 * Requires EffectPatternRepositoryService in context
 */
export const generateFromDatabase = (
	input: GenerateFromDatabaseInput
) =>
	Effect.gen(function* () {
		const pattern = yield* findEffectPatternBySlug(input.patternId);

		if (!pattern) {
			return yield* Effect.fail(
				new Error(`Pattern not found in database: ${input.patternId}`)
			);
		}

		const code = buildSnippet({
			pattern,
			customName: input.customName,
			customInput: input.customInput,
			moduleType: input.moduleType ?? "esm",
			effectVersion: input.effectVersion,
		});

		return {
			patternId: pattern.id,
			name: pattern.title,
			imports: ['import { Effect } from "effect";'],
			code,
			source: "database" as const,
		} satisfies GeneratePatternOutput;
	});

/**
 * PatternGeneratorService - Generates code from patterns
 *
 * Supports two modes:
 * 1. Template patterns - Quick scaffolding from hardcoded templates
 * 2. Database patterns - Use generateFromDatabase() function (requires DB)
 */
export class PatternGeneratorService extends Effect.Service<
	PatternGeneratorService
>()("PatternGeneratorService", {
	effect: Effect.gen(function* () {
		/**
		 * Generate code from a hardcoded template
		 * Used for quick scaffolding (e.g., service skeleton, validator)
		 */
		const generateFromTemplate = (
			input: GenerateFromTemplateInput
		): Effect.Effect<GeneratePatternOutput, Error> =>
			Effect.gen(function* () {
				const pattern = yield* getTemplatePattern(input.patternId);
				yield* validateVariables(pattern, input.variables);

				const code = renderTemplate(pattern.template, input.variables);

				return {
					patternId: pattern.id,
					name: pattern.name,
					imports: pattern.imports,
					code,
					source: "template" as const,
				};
			});

		/**
		 * Smart generate - tries templates, for DB use generateFromDatabase()
		 */
		const generate = (
			input: GenerateFromTemplateInput
		): Effect.Effect<GeneratePatternOutput, Error> =>
			generateFromTemplate(input);

		/**
		 * List available template patterns (for scaffolding)
		 */
		const listTemplates = () => Effect.succeed(listTemplatePatterns());

		return {
			generate,
			generateFromTemplate,
			listTemplates,
		};
	}),
}) { }

export const PatternGeneratorServiceLive = PatternGeneratorService.Default;
