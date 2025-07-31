import { Effect, Data } from "effect";
import { FileSystem } from "@effect/platform";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"; 

// Frontmatter interface with readonly properties and index signature
export interface Frontmatter {
	readonly expectedOutput?: string;
	readonly expectedError?: string;
	needsReview?: boolean; // Can be updated, so not readonly if it is to be written to.
	readonly [key: string]: unknown; // Allows for any other properties in frontmatter
}


// Function to read MDX content and parse its YAML frontmatter (Idiomatic Effect)
export const readMdxAndFrontmatter = (filePath: string) =>
	FileSystem.FileSystem.pipe(
		Effect.flatMap((fs) => fs.readFileString(filePath)),
		Effect.flatMap((content) =>
			// Use Effect.sync to wrap the synchronous YAML parsing, mapping any sync error
			Effect.sync(() => {
				const parts = content.split("---", 3); // Frontmatter is between first two '---'
				if (parts.length < 3) {
					throw new Error(
						"Missing or malformed frontmatter block (expected '---' delimiters)."
					);
				}
				const frontmatterStr = parts[1];
				const mdxBody = parts[2]; // Keep original leading newlines/spaces for now, trim later during update

				const frontmatter = parseYaml(frontmatterStr) as Frontmatter;
				return Data.struct({ content, frontmatter, mdxBody });
			}).pipe(
				// Map any synchronous parsing errors into Effect's error channel
				Effect.mapError(
					(e) =>
						new Error(
							`Failed to parse frontmatter in ${filePath.toString()}: ${String(e)}`
						)
				)
			)
		)
	);

// Function to reconstruct MDX content with updated frontmatter (Pure function)
export function updateMdxContent(
	originalFullMdxContent: string,
	updatedFrontmatter: Frontmatter
): string {
	const parts = originalFullMdxContent.split("---", 3);
	const newFrontmatterStr = stringifyYaml(updatedFrontmatter).trim(); // trimEnd() is also good

	// Determine the original MDX body content, including any newlines between '---' and content
	let originalBodyContent = originalFullMdxContent;
	if (parts.length >= 3) {
		// Find the end of the second '---' and take everything after it
		const secondDelimiterEndIndex =
			originalFullMdxContent.indexOf(
				"---",
				originalFullMdxContent.indexOf("---") + 3
			) + 3;
		originalBodyContent = originalFullMdxContent.substring(
			secondDelimiterEndIndex
		);
	} else {
		// No frontmatter found, so the whole content is the body
		originalBodyContent = originalFullMdxContent;
	}

	// Ensure there's at least two newlines between frontmatter and body for consistency
	return `---\n${newFrontmatterStr}\n---\n\n${originalBodyContent.trimStart()}`;
}