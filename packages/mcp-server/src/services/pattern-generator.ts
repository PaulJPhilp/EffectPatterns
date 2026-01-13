import { Effect } from "effect";
import {
	getPattern,
	renderTemplate,
	validateVariables,
} from "../tools/patterns";

export interface GeneratePatternInput {
	readonly patternId: string;
	readonly variables: Record<string, string>;
}

export interface GeneratePatternOutput {
	readonly patternId: string;
	readonly name: string;
	readonly imports: readonly string[];
	readonly code: string;
}

export class PatternGeneratorService extends Effect.Service<
	PatternGeneratorService
>()("PatternGeneratorService", {
	effect: Effect.gen(function* () {
		const generate = (
			input: GeneratePatternInput
		): Effect.Effect<GeneratePatternOutput, Error> =>
			Effect.gen(function* () {
				const pattern = yield* getPattern(input.patternId);
				yield* validateVariables(pattern, input.variables);

				const code = renderTemplate(pattern.template, input.variables);

				return {
					patternId: pattern.id,
					name: pattern.name,
					imports: pattern.imports,
					code,
				};
			});

		return { generate };
	}),
}) { }

export const PatternGeneratorServiceLive = PatternGeneratorService.Default;
