import {
	buildSnippet,
	findEffectPatternBySlug
} from "@effect-patterns/toolkit";
import { Effect } from "effect";
import { GenerateFromDatabaseInput, GeneratePatternOutput } from "./types";

/**
 * Generate code from a database pattern (standalone function)
 * Requires EffectPatternRepositoryService in context (implicitly via findEffectPatternBySlug which uses DB)
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
