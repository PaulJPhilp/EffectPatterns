/**
 * Database operations for the server
 *
 * This module handles file-based rule operations using the file system
 * instead of a database, following the original server implementation.
 */

import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import { RULES_DIRECTORY, RULES_FILE_EXTENSION } from "./constants.js";
import {
    RuleLoadError,
    RuleNotFoundError,
    RuleParseError,
    RulesDirectoryNotFoundError,
} from "./errors.js";
import { ServerRule } from "./types.js";

/**
 * Extract the first # heading from markdown content as the title
 */
export const extractTitle = (content: string): string => {
    const lines = content.split("\n");
    for (const line of lines) {
        const match = line.match(/^#\s+(.+)$/);
        if (match) {
            return match[1].trim();
        }
    }
    return "Untitled Rule";
};

/**
 * Parse a single rule file and return a rule object
 */
export const parseRuleFile = (
    fs: FileSystem.FileSystem,
    filePath: string,
    fileId: string,
) =>
    Effect.gen(function* () {
        // Read file content
        const content = yield* fs
            .readFileString(filePath)
            .pipe(
                Effect.catchAll((error) =>
                    Effect.fail(new RuleLoadError({ path: filePath, cause: error })),
                ),
            );

        // Parse frontmatter - temporarily using gray-matter for simplicity
        // TODO: Migrate to effect-mdx following project patterns
        const { data, content: markdownContent } = yield* Effect.tryPromise({
            try: async () => {
                const matter = await import("gray-matter");
                return matter.default(content);
            },
            catch: (error) => new RuleParseError({ file: filePath, cause: error }),
        });

        // Extract title from content
        const title = extractTitle(markdownContent);

        // Build rule object
        return {
            id: fileId,
            title,
            description: (data.description as string) || "",
            skillLevel: data.skillLevel as string | undefined,
            useCase: data.useCase
                ? Array.isArray(data.useCase)
                    ? (data.useCase as string[])
                    : [data.useCase as string]
                : undefined,
            content: markdownContent,
        } as ServerRule;
    });

/**
 * Read and parse a single rule by ID
 */
export const readRuleById = (id: string) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const filePath = path.join(RULES_DIRECTORY, `${id}${RULES_FILE_EXTENSION}`);

        yield* Effect.logInfo(`Loading rule by ID: ${id}`);

        // Check if file exists
        const fileExists = yield* fs.exists(filePath);
        if (!fileExists) {
            return yield* Effect.fail(new RuleNotFoundError({ id }));
        }

        // Parse the rule file
        const rule = yield* parseRuleFile(fs, filePath, id);

        yield* Effect.logInfo(`Successfully loaded rule: ${id}`);
        return rule;
    });

/**
 * Read and parse all rule files from the rules directory
 */
export const readAndParseRules = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    yield* Effect.logInfo(`Loading rules from ${RULES_DIRECTORY}`);

    // Check if directory exists
    const dirExists = yield* fs.exists(RULES_DIRECTORY);
    if (!dirExists) {
        return yield* Effect.fail(
            new RulesDirectoryNotFoundError({ path: RULES_DIRECTORY }),
        );
    }

    // Read all files in directory
    const files = yield* fs
        .readDirectory(RULES_DIRECTORY)
        .pipe(
            Effect.catchAll((error) =>
                Effect.fail(new RuleLoadError({ path: RULES_DIRECTORY, cause: error })),
            ),
        );

    // Filter for rule files
    const ruleFiles = files.filter((file) => file.endsWith(RULES_FILE_EXTENSION));
    yield* Effect.logInfo(`Found ${ruleFiles.length} rule files`);

    // Parse each file
    const rules = yield* Effect.forEach(
        ruleFiles,
        (file) => {
            const filePath = path.join(RULES_DIRECTORY, file);
            const fileId = path.basename(file, RULES_FILE_EXTENSION);
            return parseRuleFile(fs, filePath, fileId);
        },
        { concurrency: "unbounded" },
    );

    yield* Effect.logInfo(`Successfully parsed ${rules.length} rules`);
    return rules as ServerRule[];
});
