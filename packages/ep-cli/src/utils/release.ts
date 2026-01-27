/**
 * Release Utilities
 */

import { Effect } from "effect";
import semver from "semver";
import { getCommitsSinceTag, getLatestTag } from "./git.js";

/**
 * Determine the recommended version bump based on conventional commits
 */
export const getRecommendedBump = (
  _commits: string[]
): Effect.Effect<
  { releaseType: semver.ReleaseType; reason: string },
  Error
> =>
  Effect.succeed({
    releaseType: "patch",
    reason: "Patch bump for bug fixes and improvements",
  });

/**
 * Commit parser output structure
 */
interface ParsedCommit {
  type?: string;
  subject?: string;
  header?: string;
  notes?: Array<{ title: string }>;
}

/**
 * Basic fallback commit parser
 */
const createFallbackParser = (): ((message: string) => ParsedCommit) => {
  return (message: string) => {
    const header = message.split("\n")[0] ?? message;
    const match = header.match(
      /^(?<type>\w+)(?:\([^)]*\))?(?<breaking>!)?:\s*(?<subject>.+)$/
    );

    const type = match?.groups?.type;
    const subject = match?.groups?.subject ?? header;
    const notes = match?.groups?.breaking
      ? [{ title: "BREAKING CHANGE" }]
      : [];

    return { type, subject, header, notes };
  };
};

/**
 * Load commit parser, falling back to basic parser if unavailable
 */
const loadCommitParser = async (): Promise<(message: string) => ParsedCommit> => {
  const isCommitParser = (fn: unknown): fn is (message: string) => ParsedCommit => {
    return typeof fn === "function";
  };

  try {
    const module = await import("conventional-commits-parser");
    const maybeDefault = (module as { default?: unknown }).default;

    if (isCommitParser(maybeDefault)) {
      return maybeDefault;
    }
    if (isCommitParser(module as unknown)) {
      return module as unknown as (message: string) => ParsedCommit;
    }
    throw new Error("No callable export found in conventional-commits-parser");
  } catch {
    return createFallbackParser();
  }
};

/**
 * Parse commits and categorize them
 */
export const categorizeCommits = async (commits: string[]) => {
  const parseCommit = await loadCommitParser();

  const categories = {
    breaking: [] as string[],
    features: [] as string[],
    fixes: [] as string[],
    docs: [] as string[],
    chore: [] as string[],
    other: [] as string[],
  };

  for (const commitMsg of commits) {
    const parsed = parseCommit(commitMsg);

    if (parsed.notes?.some((note) => note.title === "BREAKING CHANGE")) {
      categories.breaking.push(parsed.header || commitMsg);
    } else if (parsed.type === "feat") {
      categories.features.push(parsed.subject || commitMsg);
    } else if (parsed.type === "fix") {
      categories.fixes.push(parsed.subject || commitMsg);
    } else if (parsed.type === "docs") {
      categories.docs.push(parsed.subject || commitMsg);
    } else if (
      ["chore", "build", "ci"].includes(parsed.type ?? "")
    ) {
      categories.chore.push(parsed.subject || commitMsg);
    } else {
      categories.other.push(parsed.subject || commitMsg);
    }
  }

  return categories;
};

/**
 * Generate a draft changelog from categorized commits
 */
export const generateChangelog = (
  categories: Awaited<ReturnType<typeof categorizeCommits>>,
  currentVersion: string,
  nextVersion: string
) => {
  const lines: string[] = [];

  lines.push(`# Release ${nextVersion}\n`);
  lines.push(`**Previous version:** ${currentVersion}\n`);

  const sections = [
    { title: "🚨 BREAKING CHANGES", items: categories.breaking },
    { title: "✨ Features", items: categories.features },
    { title: "🐛 Bug Fixes", items: categories.fixes },
    { title: "📚 Documentation", items: categories.docs },
    { title: "🔧 Chores & Maintenance", items: categories.chore },
    { title: "📝 Other Changes", items: categories.other },
  ];

  for (const section of sections) {
    if (section.items.length > 0) {
      lines.push(`## ${section.title}\n`);
      for (const item of section.items) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
};

/**
 * Analyze release - shared logic for preview and create
 */
export const analyzeRelease = () =>
  Effect.gen(function* () {
    const latestTag = yield* getLatestTag();
    const currentVersion = latestTag.replace(/^v/, "");

    const commits = yield* getCommitsSinceTag(latestTag);

    if (commits.length === 0) {
      return { hasChanges: false } as const;
    }

    const bump = yield* getRecommendedBump(commits);
    const nextVersion = semver.inc(currentVersion, bump.releaseType);

    if (!nextVersion) {
      return yield* Effect.fail(
        new Error(`Failed to calculate next version from ${currentVersion}`)
      );
    }

    const categories = yield* Effect.tryPromise({
      try: () => categorizeCommits(commits),
      catch: (error) =>
        new Error(
          `Failed to categorize commits: ${error instanceof Error ? error.message : String(error)}`
        ),
    });

    const changelog = generateChangelog(
      categories,
      currentVersion,
      nextVersion
    );

    return {
      hasChanges: true,
      latestTag,
      currentVersion,
      nextVersion,
      bump,
      commits,
      categories,
      changelog,
    } as const;
  });
