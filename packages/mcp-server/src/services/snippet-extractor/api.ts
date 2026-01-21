import { Effect } from "effect";
import type { CodeSnippet, Finding } from "../../tools/schemas";
import {
	calculateBoundaries,
	DEFAULT_SNIPPET_CONFIG,
	extractSections,
	splitLines,
	trimContextIfNeeded,
} from "./helpers";
import type { ExtractSnippetInput } from "./types";

/**
 * SnippetExtractorService - Extract code snippets showing context around issues
 *
 * Extracts a snippet of code (before context + problem lines + after context)
 * to show the issue in context without showing the full file.
 */
export class SnippetExtractorService extends Effect.Service<SnippetExtractorService>()(
	"SnippetExtractorService",
	{
		effect: Effect.gen(function* () {
			/**
			 * Extract a code snippet from source, showing context around the finding
			 */
			const extract = (
				finding: Finding,
				source: string,
				contextLines?: number,
			): Effect.Effect<CodeSnippet, never> =>
				Effect.sync(() => {
					const config = DEFAULT_SNIPPET_CONFIG;
					const ctx = contextLines ?? config.defaultContextLines;

					const lines = splitLines(source);
					const { startLine, endLine } = finding.range;

					const boundaries = calculateBoundaries(
						startLine,
						endLine,
						ctx,
						lines.length,
					);

					const { beforeContext, targetLines, afterContext } = extractSections(
						lines,
						boundaries.beforeStartIdx,
						boundaries.targetStartIdx,
						boundaries.targetEndIdx,
						boundaries.afterEndIdx,
					);

					const { beforeContext: finalBefore, afterContext: finalAfter } =
						trimContextIfNeeded(
							beforeContext,
							targetLines,
							afterContext,
							config,
						);

					return {
						beforeContext: finalBefore,
						targetLines,
						afterContext: finalAfter,
						startLine,
						endLine,
					};
				});

			/**
			 * Extract snippet from input object
			 */
			const extractFromInput = (
				input: ExtractSnippetInput,
			): Effect.Effect<CodeSnippet, never> =>
				extract(input.finding, input.source, input.contextLines);

			return {
				extract,
				extractFromInput,
			};
		}),
	},
) { }
