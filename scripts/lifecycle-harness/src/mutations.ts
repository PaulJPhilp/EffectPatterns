/**
 * Random lifecycle mutation steps: step type enum and pick-next logic.
 */

import fs from 'node:fs'
import path from 'node:path'
import { pick } from './prng.js'
import * as skills from './skills.js'
import type { RunnableMutation } from './types.js'

export const MUTATION_STEP_TYPES = [
  'add-ts-module',
  'rename-file-fix-imports',
  'typescript-break-then-fix',
  'add-vitest-then-break-fix',
  'modify-package-scripts',
  'skills-break-then-fix',
  'bun-run-dev',
  'bun-run-test',
  'ep-install-list',
  'ep-install-add',
  'ep-skills-validate',
  'ep-search',
  'ep-show-bogus',
] as const

export type MutationStepType = (typeof MUTATION_STEP_TYPES)[number]

/** Pick a random mutation step (deterministic from rng). */
export function pickMutationStep(
  rng: () => number,
  stepIndex: number,
  repoPath: string,
  _template: string,
  _epBin: string
): RunnableMutation | null {
  switch (pick(rng, MUTATION_STEP_TYPES)) {
    case 'add-ts-module': {
      const name = `mutation-${stepIndex}`
      return {
        kind: 'add-ts-module',
        run() {
          const srcDir = path.join(repoPath, 'src')
          fs.mkdirSync(srcDir, { recursive: true })
          const content = `import { Effect } from "effect"

export const greet = (s: string) => Effect.succeed(\`Hello, \${s}\`)
`
          fs.writeFileSync(path.join(srcDir, `${name}.ts`), content, 'utf-8')
        },
      }
    }
    case 'rename-file-fix-imports': {
      const srcDir = path.join(repoPath, 'src')
      if (!fs.existsSync(srcDir)) return null
      const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
      if (files.length === 0) return null
      const oldName = pick(rng, files)
      const base = oldName.replace(/\.ts$/, '')
      const newName = `${base}-renamed.ts`
      return {
        kind: 'rename-file-fix-imports',
        run() {
          const oldPath = path.join(srcDir, oldName)
          const newPath = path.join(srcDir, newName)
          fs.renameSync(oldPath, newPath)
          for (const f of fs.readdirSync(srcDir)) {
            if (!f.endsWith('.ts')) continue
            const p = path.join(srcDir, f)
            let c = fs.readFileSync(p, 'utf-8')
            if (c.includes(`"./${base}.js"`) || c.includes(`'./${base}.js'`)) {
              c = c.replace(new RegExp(`"\\./${base}\\.js"`, 'g'), `"./${base}-renamed.js"`)
              c = c.replace(new RegExp(`'\\./${base}\\.js'`, 'g'), `'./${base}-renamed.js'`)
              fs.writeFileSync(p, c, 'utf-8')
            }
          }
        },
      }
    }
    case 'typescript-break-then-fix': {
      const srcDir = path.join(repoPath, 'src')
      const files = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter((f) => f.endsWith('.ts')) : []
      if (files.length === 0) return null
      const file = pick(rng, files)
      return {
        kind: 'typescript-break-then-fix',
        run() {
          const p = path.join(srcDir, file)
          let c = fs.readFileSync(p, 'utf-8')
          if (c.includes('BAD_IMPORT_PLACEHOLDER')) {
            c = c.replace('from "BAD_IMPORT_PLACEHOLDER"', 'from "effect"')
            fs.writeFileSync(p, c, 'utf-8')
          } else {
            c = c.replace(/from "effect"/, 'from "BAD_IMPORT_PLACEHOLDER"')
            fs.writeFileSync(p, c, 'utf-8')
          }
        },
      }
    }
    case 'add-vitest-then-break-fix': {
      const pkgPath = path.join(repoPath, 'package.json')
      if (!fs.existsSync(pkgPath)) return null
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      if (!pkg.devDependencies) pkg.devDependencies = {}
      if (!pkg.devDependencies.vitest) {
        pkg.devDependencies.vitest = 'latest'
        pkg.scripts = pkg.scripts || {}
        pkg.scripts.test = 'vitest run'
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8')
      }
      const srcDir = path.join(repoPath, 'src')
      fs.mkdirSync(srcDir, { recursive: true })
      const testPath = path.join(srcDir, 'lifecycle.test.ts')
      const hasTest = fs.existsSync(testPath)
      return {
        kind: 'add-vitest-then-break-fix',
        run() {
          if (!hasTest) {
            const content = `import { describe, expect, it } from "vitest"
describe("lifecycle", () => {
  it("passes", () => expect(1).toBe(1))
})
`
            fs.writeFileSync(testPath, content, 'utf-8')
          } else {
            let c = fs.readFileSync(testPath, 'utf-8')
            if (c.includes('expect(1).toBe(2)')) {
              c = c.replace('expect(1).toBe(2)', 'expect(1).toBe(1)')
              fs.writeFileSync(testPath, c, 'utf-8')
            } else {
              c = c.replace('expect(1).toBe(1)', 'expect(1).toBe(2)')
              fs.writeFileSync(testPath, c, 'utf-8')
            }
          }
        },
      }
    }
    case 'modify-package-scripts': {
      const pkgPath = path.join(repoPath, 'package.json')
      if (!fs.existsSync(pkgPath)) return null
      return {
        kind: 'modify-package-scripts',
        run() {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
          pkg.scripts = pkg.scripts || {}
          if (!pkg.scripts.lint) pkg.scripts.lint = 'echo "lint placeholder"'
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8')
        },
      }
    }
    case 'skills-break-then-fix': {
      const skillsDir = path.join(repoPath, '.claude-plugin', 'plugins', 'effect-patterns', 'skills')
      if (!fs.existsSync(skillsDir)) return null
      const categories = fs.readdirSync(skillsDir).filter((c) => {
        const skillPath = path.join(skillsDir, c, 'SKILL.md')
        return fs.existsSync(skillPath)
      })
      if (categories.length === 0) return null
      const category = pick(rng, categories)
      let broken = false
      try {
        const content = fs.readFileSync(path.join(skillsDir, category, 'SKILL.md'), 'utf-8')
        broken = !content.includes('**Rationale**')
      } catch {
        // ignore
      }
      return {
        kind: 'skills-break-then-fix',
        run() {
          if (broken) {
            skills.fixSkillsRestoreRationale(repoPath, category)
          } else {
            skills.breakSkillsRemoveRationale(repoPath, category)
          }
        },
      }
    }
    case 'bun-run-dev':
      return {
        kind: 'bun-run-dev',
        run() {
          // No-op: actual run is done via runCommand with timeout
        },
      }
    case 'bun-run-test':
      return {
        kind: 'bun-run-test',
        run() {
          // No-op: actual run is done via runCommand with timeout
        },
      }
    case 'ep-install-list':
      return { kind: 'ep-install-list', run() {} }
    case 'ep-install-add':
      return { kind: 'ep-install-add', run() {} }
    case 'ep-skills-validate':
      return { kind: 'ep-skills-validate', run() {} }
    case 'ep-search':
      return { kind: 'ep-search', run() {} }
    case 'ep-show-bogus':
      return { kind: 'ep-show-bogus', run() {} }
    default:
      return null
  }
}
