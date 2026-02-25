#!/usr/bin/env bun

/**
 * seed-skills.ts
 *
 * Reads all SKILL.md files from the skills directory and upserts them
 * into the local Postgres `skills` table via the toolkit's repository.
 *
 * Each skill's category is resolved to a parent application_pattern slug
 * so that `ep list --category X` and skill categories are aligned.
 *
 * Usage: bun run seed:skills
 */

import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { eq } from "drizzle-orm"
import { createDatabase } from "../packages/toolkit/src/db/client.js"
import { createSkillRepository } from "../packages/toolkit/src/repositories/skill.js"
import {
  applicationPatterns,
  type NewSkill,
} from "../packages/toolkit/src/db/schema/index.js"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKILLS_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "config",
  ".claude-plugin",
  "plugins",
  "effect-patterns",
  "skills"
)

/**
 * Maps skill sub-category slugs to their parent application_pattern slug.
 * Only entries that differ from the sub-category itself need to be listed.
 */
const SUB_CATEGORY_TO_PARENT: Record<string, string> = {
  "concurrency-getting-started": "concurrency",
  "error-handling": "error-management",
  "error-handling-resilience": "error-management",
  "platform-getting-started": "platform",
  "project-setup--execution": "getting-started",
  "scheduling-periodic-tasks": "scheduling",
  "streams-getting-started": "streams",
  "streams-sinks": "streams",
  "value-handling": "core-concepts",
}

// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------

function parseFrontmatter(raw: string): {
  name: string
  description: string
  content: string
} {
  const trimmed = raw.trimStart()
  if (!trimmed.startsWith("---")) {
    return { name: "", description: "", content: raw }
  }

  const endIdx = trimmed.indexOf("---", 3)
  if (endIdx === -1) {
    return { name: "", description: "", content: raw }
  }

  const frontmatter = trimmed.slice(3, endIdx).trim()
  const content = trimmed.slice(endIdx + 3).trim()

  let name = ""
  let description = ""
  for (const line of frontmatter.split("\n")) {
    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (key === "name") name = value
    if (key === "description") description = value
  }

  return { name, description, content }
}

// ---------------------------------------------------------------------------
// Category resolution
// ---------------------------------------------------------------------------

function stripPrefix(slug: string): string {
  return slug.replace(/^effect-patterns-/, "")
}

// ---------------------------------------------------------------------------
// Pattern count (### headings)
// ---------------------------------------------------------------------------

function countPatterns(content: string): number {
  const matches = content.match(/^### /gm)
  return matches ? matches.length : 0
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Reading skills from: ${SKILLS_DIR}\n`)

  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))

  if (entries.length === 0) {
    console.error("No skill directories found!")
    process.exitCode = 1
    return
  }

  console.log(`Found ${entries.length} skill directories\n`)

  const { db, close } = createDatabase()
  const repo = createSkillRepository(db)

  // Load application_patterns to build slug → id lookup
  const appPatterns = await db
    .select({ id: applicationPatterns.id, slug: applicationPatterns.slug })
    .from(applicationPatterns)
  const slugToId = new Map(appPatterns.map((ap) => [ap.slug, ap.id]))

  console.log(`Loaded ${appPatterns.length} application patterns\n`)

  let upserted = 0
  let errors = 0

  for (const entry of entries) {
    const slug = entry.name
    const skillFile = path.join(SKILLS_DIR, slug, "SKILL.md")

    let raw: string
    try {
      raw = readFileSync(skillFile, "utf-8")
    } catch {
      console.error(`  SKIP ${slug} — no SKILL.md found`)
      errors++
      continue
    }

    const { name, description, content } = parseFrontmatter(raw)

    if (!name || !description) {
      console.error(`  SKIP ${slug} — missing name or description in frontmatter`)
      errors++
      continue
    }

    // Resolve sub-category to parent application_pattern
    const subCategory = stripPrefix(slug)
    const parentSlug = SUB_CATEGORY_TO_PARENT[subCategory] ?? subCategory
    const applicationPatternId = slugToId.get(parentSlug)

    if (!applicationPatternId) {
      console.error(`  WARN ${slug} — no application_pattern found for "${parentSlug}"`)
    }

    const newSkill: NewSkill = {
      slug,
      name,
      description,
      category: parentSlug,
      content,
      patternCount: countPatterns(content),
      applicationPatternId: applicationPatternId ?? undefined,
    }

    try {
      const result = await repo.upsert(newSkill)
      const fkLabel = applicationPatternId ? "FK" : "no-FK"
      console.log(
        `  OK  ${slug} → ${parentSlug} (v${result.version}, ${newSkill.patternCount} patterns, ${fkLabel})`
      )
      upserted++
    } catch (err) {
      console.error(`  ERR ${slug} — ${err}`)
      errors++
    }
  }

  console.log(`\nDone: ${upserted} upserted, ${errors} errors`)

  await close()
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exitCode = 1
})
