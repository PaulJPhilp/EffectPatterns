/**
 * Local skills directory content: valid SKILL.md and break/fix operations.
 * Path: .claude-plugin/plugins/effect-patterns/skills/<category>/SKILL.md
 * Validator expects: # heading, ### pattern, level mentions, Good Example, Anti-Pattern, Rationale.
 */

import fs from 'node:fs'
import path from 'node:path'

export const SKILL_CATEGORIES = ['testing', 'error-handling'] as const

const VALID_SKILL_CONTENT = `# Testing (beginner / intermediate)

Skill for writing tests with Effect.

### My First Test (beginner)

**Good Example**

\`\`\`ts
import { Effect } from "effect"
import { describe, it, expect } from "vitest"
Effect.runPromise(Effect.succeed(1)).then((n) => expect(n).toBe(1))
\`\`\`

**Anti-Pattern**

\`\`\`ts
// Don't ignore errors
Effect.runPromise(Effect.fail("oops"))
\`\`\`

**Rationale**

Tests should assert both success and failure paths. Use \`Effect.runPromise\` or \`Effect.runSync\` in tests.
`

const VALID_ERROR_HANDLING = `# Error Handling (intermediate)

Patterns for error handling in Effect.

### Retry (intermediate)

**Good Example**

\`\`\`ts
import { Effect } from "effect"
const withRetry = Effect.retry(Effect.succeed(1), { times: 3 })
\`\`\`

**Anti-Pattern**

\`\`\`ts
// No retry, single attempt only
Effect.runPromise(Effect.fail("network error"))
\`\`\`

**Rationale**

Transient failures can be retried with backoff. Effect.retry supports scheduling and limits.
`

const CATEGORY_CONTENT: Record<string, string> = {
  testing: VALID_SKILL_CONTENT,
  'error-handling': VALID_ERROR_HANDLING,
}

/** Create skills dir and write valid SKILL.md for each category. */
export function createValidSkills(repoPath: string, categories: string[]): void {
  for (const cat of categories) {
    const dir = path.join(repoPath, '.claude-plugin', 'plugins', 'effect-patterns', 'skills', cat)
    fs.mkdirSync(dir, { recursive: true })
    const content = CATEGORY_CONTENT[cat] ?? VALID_SKILL_CONTENT
    fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf-8')
  }
}

/** Break validator: remove Rationale section. */
export function breakSkillsRemoveRationale(repoPath: string, category: string): void {
  const skillPath = path.join(
    repoPath,
    '.claude-plugin',
    'plugins',
    'effect-patterns',
    'skills',
    category,
    'SKILL.md'
  )
  let content = fs.readFileSync(skillPath, 'utf-8')
  content = content.replace(/\*\*Rationale\*\*[\s\S]*?(?=\n###|\n#|$)/i, '')
  fs.writeFileSync(skillPath, content, 'utf-8')
}

/** Restore Rationale section (fix). */
export function fixSkillsRestoreRationale(repoPath: string, category: string): void {
  const restored = CATEGORY_CONTENT[category] ?? VALID_SKILL_CONTENT
  const dir = path.join(repoPath, '.claude-plugin', 'plugins', 'effect-patterns', 'skills', category)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'SKILL.md'), restored, 'utf-8')
}
