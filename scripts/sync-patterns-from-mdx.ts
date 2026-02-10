#!/usr/bin/env bun

/**
 * Sync all .mdx pattern files from disk into the PostgreSQL database.
 *
 * - Inserts patterns that exist on disk but not in the DB
 * - Updates patterns that already exist in the DB
 *
 * Usage: bun run scripts/sync-patterns-from-mdx.ts [--release <version>]
 *
 * Options:
 *   --release <version>  Tag newly inserted patterns with this release version (e.g. "0.12.0")
 */

import matter from "gray-matter";
import { globSync } from "glob";
import path from "node:path";
import { readFileSync } from "node:fs";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { createDatabase } from "../packages/toolkit/src/db/client.js";
import { effectPatterns } from "../packages/toolkit/src/db/schema/index.js";

const ROOT = path.resolve(import.meta.dir, "..");
const CONTENT_DIR = path.join(ROOT, "content/published/patterns");

// Parse --release flag
const releaseIdx = process.argv.indexOf("--release");
const releaseVersion = releaseIdx !== -1 ? process.argv[releaseIdx + 1] : null;

interface CodeBlock {
  code: string;
  language: string;
}

function extractFirstCodeFence(text: string): CodeBlock | null {
  const fence = /```(\w+)?\n([\s\S]*?)\n```/m.exec(text);
  if (!fence) return null;
  return { language: fence[1] || "typescript", code: fence[2].trim() };
}

function extractSectionByHeading(body: string, pattern: RegExp): string | null {
  const match = pattern.exec(body);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const next = rest.search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function extractExamples(content: string): Array<{ language: string; code: string; description: string }> {
  const sectionPatterns = [
    /^##\s+Good Example.*$/m,
    /^##\s+Solution.*$/m,
    /^##\s+Example.*$/m,
    /^##\s+Practical Example.*$/m,
    /^##\s+Walkthrough.*$/m,
  ];

  for (const pat of sectionPatterns) {
    const section = extractSectionByHeading(content, pat);
    const block = extractFirstCodeFence(section || "");
    if (block) {
      return [{ language: block.language, code: block.code, description: "Example" }];
    }
  }

  // Fallback: first code fence in the entire body
  const block = extractFirstCodeFence(content);
  if (block) {
    return [{ language: block.language, code: block.code, description: "Example" }];
  }

  return [];
}

function extractSummary(content: string): string {
  // Try to get first paragraph after the first heading
  const afterHeading = content.replace(/^#[^\n]*\n+/, "").trim();
  const firstParagraph = afterHeading.split(/\n\n/)[0]?.trim() || "";
  // Strip markdown formatting
  return firstParagraph.replace(/[#*`\[\]]/g, "").trim().slice(0, 500) || "No summary available";
}

const program = Effect.gen(function* () {
  const files = globSync(`${CONTENT_DIR}/**/*.mdx`);
  console.log(`Found ${files.length} .mdx files on disk`);
  if (releaseVersion) {
    console.log(`Release version for new patterns: ${releaseVersion}`);
  }
  console.log();

  const { db, close } = createDatabase();

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const { data: frontmatter, content } = matter(raw);

    const slug =
      typeof frontmatter.id === "string" && frontmatter.id.trim().length > 0
        ? frontmatter.id.trim()
        : path.basename(file, ".mdx");

    const title = frontmatter.title || slug;
    const skillLevel = frontmatter.skillLevel || "intermediate";
    const category = frontmatter.category || frontmatter.applicationPatternId || path.basename(path.dirname(file));
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    const summary = frontmatter.summary || extractSummary(content);
    const difficulty = frontmatter.difficulty || skillLevel;
    const author = frontmatter.author || "Effect Patterns Team";
    const lessonOrder = typeof frontmatter.lessonOrder === "number" ? frontmatter.lessonOrder : null;
    const rule = frontmatter.rule || null;
    const examples = extractExamples(content);

    try {
      // Check if pattern exists
      const existing = yield* Effect.tryPromise({
        try: () =>
          db
            .select({ id: effectPatterns.id })
            .from(effectPatterns)
            .where(eq(effectPatterns.slug, slug))
            .limit(1),
        catch: (error) => new Error(`Failed to check pattern ${slug}: ${error}`),
      });

      if (existing.length > 0) {
        // Update
        yield* Effect.tryPromise({
          try: () =>
            db
              .update(effectPatterns)
              .set({
                title,
                summary,
                skillLevel,
                category,
                difficulty,
                tags,
                examples,
                content: raw,
                author,
                lessonOrder,
                rule,
                validated: true,
                validatedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(effectPatterns.slug, slug)),
          catch: (error) => new Error(`Failed to update pattern ${slug}: ${error}`),
        });
        updated++;
      } else {
        // Insert
        yield* Effect.tryPromise({
          try: () =>
            db.insert(effectPatterns).values({
              slug,
              title,
              summary,
              skillLevel,
              category,
              difficulty,
              tags,
              examples,
              content: raw,
              author,
              lessonOrder,
              rule,
              releaseVersion,
              validated: true,
              validatedAt: new Date(),
            }),
          catch: (error) => new Error(`Failed to insert pattern ${slug}: ${error}`),
        });
        inserted++;
        console.log(`  + Inserted: ${title}`);
      }
    } catch (err) {
      errors++;
      console.error(`  ! Error: ${slug}:`, err);
    }
  }

  // Verify
  const count = yield* Effect.tryPromise({
    try: () =>
      db
        .select()
        .from(effectPatterns)
        .then((result) => result.length),
    catch: (error) => new Error(`Failed to count patterns: ${error}`),
  });

  console.log(`\n✅ Sync complete!`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated:  ${updated}`);
  console.log(`   Errors:   ${errors}`);
  console.log(`   Total in DB: ${count}`);

  yield* Effect.promise(() => close());
});

Effect.runPromise(program).catch((error) => {
  console.error("❌ Error syncing patterns:", error);
  process.exit(1);
});
