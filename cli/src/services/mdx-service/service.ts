import { FileSystem } from "@effect/platform";
import { Data, Effect } from "effect";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { Frontmatter, ParameterDefinition } from "./types.js";
import { InvalidMdxFormatError } from "./types.js";

export class MdxService extends Effect.Service<MdxService>()("MdxService", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Read MDX content and parse its YAML frontmatter
    const readMdxAndFrontmatter = (filePath: string) =>
      fs.readFileString(filePath).pipe(
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
                  `Failed to parse frontmatter in ${filePath.toString()}: ${String(
                    e
                  )}`
                )
            )
          )
        )
      );

    // Reconstruct MDX content with updated frontmatter
    const updateMdxContent = (
      originalFullMdxContent: string,
      updatedFrontmatter: Frontmatter
    ): string => {
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
    };

    // Parse MDX frontmatter with validation
    const parseMdxFile = (content: string) =>
      Effect.gen(function* () {
        try {
          // Simple regex-based parsing for basic frontmatter extraction
          const frontmatterMatch = content.match(
            /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
          );

          if (!frontmatterMatch) {
            return yield* Effect.fail(
              new InvalidMdxFormatError({
                reason: "No frontmatter found in .mdx file",
              })
            );
          }

          const [, frontmatterContent, templateContent] = frontmatterMatch;

          // Parse YAML frontmatter
          let metadata: Record<string, unknown>;
          try {
            metadata = parseYaml(frontmatterContent) as Record<string, unknown>;
          } catch (error) {
            return yield* Effect.fail(
              new InvalidMdxFormatError({
                reason: `Invalid YAML frontmatter: ${error}`,
              })
            );
          }

          return {
            attributes: metadata,
            body: templateContent,
          };
        } catch (error) {
          return yield* Effect.fail(
            new InvalidMdxFormatError({
              reason:
                error instanceof Error ? error.message : "Failed to parse MDX",
            })
          );
        }
      });

    // Validate MDX configuration
    const validateMdxConfig = (attributes: Record<string, unknown>) => {
      // Extract common fields that might be used across services
      const provider =
        typeof attributes.provider === "string"
          ? attributes.provider
          : undefined;
      const model =
        typeof attributes.model === "string" ? attributes.model : undefined;
      const parameters =
        typeof attributes.parameters === "object" &&
        attributes.parameters !== null
          ? (attributes.parameters as Record<string, unknown>)
          : undefined;

      return {
        provider,
        model,
        parameters,
      };
    };

    // Extract parameters from frontmatter
    const extractParameters = (metadata: Record<string, unknown>) => {
      const parameters: Record<string, ParameterDefinition> = {};
      const paramsObj = (metadata.parameters || {}) as Record<string, unknown>;

      for (const [key, value] of Object.entries(paramsObj)) {
        if (typeof value === "object" && value !== null && "type" in value) {
          const paramValue = value as Record<string, unknown>;
          const type = paramValue.type;

          if (
            typeof type === "string" &&
            ["string", "number", "boolean", "array", "object"].includes(type)
          ) {
            parameters[key] = {
              type: type as
                | "string"
                | "number"
                | "boolean"
                | "array"
                | "object",
              description:
                typeof paramValue.description === "string"
                  ? paramValue.description
                  : undefined,
              required:
                typeof paramValue.required === "boolean"
                  ? paramValue.required
                  : undefined,
              default: paramValue.default,
            };
          }
        }
      }

      return parameters;
    };

    return {
      readMdxAndFrontmatter,
      updateMdxContent,
      parseMdxFile,
      validateMdxConfig,
      extractParameters,
    };
  }),
}) {}
