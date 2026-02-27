/**
 * Validate scaffold output: required files per template.
 * Aligns with scripts/scaffold-test-project.ts templateFiles and package.json write.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { Template } from './types.js'
import { TEMPLATES } from './types.js'

/** Required relative paths under the project dir for each template. */
const REQUIRED_BY_TEMPLATE: Record<Template, string[]> = {
  basic: ['package.json', 'src/index.ts'],
  service: ['package.json', 'src/index.ts', 'src/service.ts', 'src/service.test.ts'],
  cli: ['package.json', 'src/index.ts', 'src/commands.ts'],
  'http-server': ['package.json', 'src/index.ts', 'src/routes.ts'],
  lib: ['package.json', 'src/index.ts', 'src/index.test.ts'],
  worker: ['package.json', 'src/index.ts'],
}

/**
 * Return null if all required files exist; otherwise return an error message.
 */
export function validateScaffoldOutput(repoPath: string, template: Template): string | null {
  const required = REQUIRED_BY_TEMPLATE[template]
  if (!required) return `Unknown template: ${template}`
  const missing: string[] = []
  for (const rel of required) {
    const full = path.join(repoPath, rel)
    if (!fs.existsSync(full)) missing.push(rel)
  }
  if (missing.length === 0) return null
  return `Scaffold output validation failed: missing ${missing.join(', ')}`
}

export function getRequiredFilesForTemplate(template: Template): readonly string[] {
  return REQUIRED_BY_TEMPLATE[template] ?? []
}

export function isKnownTemplate(t: string): t is Template {
  return TEMPLATES.includes(t as Template)
}
