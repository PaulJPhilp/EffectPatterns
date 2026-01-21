import { Effect } from "effect";
import {
	getPattern as getTemplatePattern,
	listPatterns as listTemplatePatterns,
	renderTemplate,
	validateVariables,
} from "../../tools/patterns";
import { GenerateFromTemplateInput, GeneratePatternOutput } from "./types";

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
