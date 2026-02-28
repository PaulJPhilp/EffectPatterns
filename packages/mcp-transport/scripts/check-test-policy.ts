#!/usr/bin/env bun
/**
 * Test policy checker — enforces the no-behavioral-mocks rule.
 *
 * Scans test files for disallowed patterns and exits non-zero if
 * any violations are found.
 *
 * Usage:
 *   bun run scripts/check-test-policy.ts
 *   bun run test:policy
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const SCAN_DIRS = [join(ROOT, "src"), join(ROOT, "tests")]

// ── Patterns that are ALWAYS forbidden in test files ────────
const GLOBAL_FORBIDDEN: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /vi\.spyOn\s*\(/, label: "vi.spyOn(" },
  { pattern: /\.toHaveBeenCalled\b/, label: ".toHaveBeenCalled" },
  { pattern: /\.toHaveBeenCalledWith\b/, label: ".toHaveBeenCalledWith" },
  { pattern: /jest\.mock\s*\(/, label: "jest.mock(" },
  { pattern: /jest\.spyOn\s*\(/, label: "jest.spyOn(" },
  { pattern: /\.mockImplementation\s*\(/, label: ".mockImplementation(" },
  { pattern: /\.mockReturnValue\s*\(/, label: ".mockReturnValue(" },
  { pattern: /\.mockResolvedValue\s*\(/, label: ".mockResolvedValue(" },
  { pattern: /\.mockRejectedValue\s*\(/, label: ".mockRejectedValue(" },
]

// ── Patterns forbidden ONLY in handler test files ───────────
const HANDLER_FORBIDDEN: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /vi\.fn\s*\(/, label: "vi.fn(" },
]

// ── Helpers ─────────────────────────────────────────────────

function isTestFile(path: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx|mts|cts)$/.test(path)
}

function isHandlerTestPath(relPath: string): boolean {
  return (
    relPath.includes("handlers") && relPath.includes("__tests__")
  )
}

function collectFiles(dir: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) {
        if (entry === "node_modules" || entry === "dist") continue
        results.push(...collectFiles(full))
      } else if (isTestFile(full)) {
        results.push(full)
      }
    }
  } catch {
    // Directory may not exist
  }
  return results
}

interface Violation {
  file: string
  line: number
  label: string
  text: string
}

function scanFile(absPath: string, relPath: string): Violation[] {
  const content = readFileSync(absPath, "utf-8")
  const lines = content.split("\n")
  const violations: Violation[] = []
  const inHandlerDir = isHandlerTestPath(relPath)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
      continue
    }

    for (const rule of GLOBAL_FORBIDDEN) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relPath,
          line: i + 1,
          label: rule.label,
          text: line.trim(),
        })
      }
    }

    if (inHandlerDir) {
      for (const rule of HANDLER_FORBIDDEN) {
        if (rule.pattern.test(line)) {
          violations.push({
            file: relPath,
            line: i + 1,
            label: rule.label,
            text: line.trim(),
          })
        }
      }
    }
  }

  return violations
}

// ── Main ────────────────────────────────────────────────────

const files: string[] = []
for (const dir of SCAN_DIRS) {
  files.push(...collectFiles(dir))
}

const allViolations: Violation[] = []

for (const f of files) {
  const rel = relative(ROOT, f)
  allViolations.push(...scanFile(f, rel))
}

if (allViolations.length === 0) {
  console.log(
    `✓ Test policy check passed (${files.length} files scanned)`,
  )
  process.exit(0)
}

console.error(
  `✗ Test policy: ${allViolations.length} mock violation(s) in ` +
    `${new Set(allViolations.map((v) => v.file)).size} file(s):\n`,
)
for (const v of allViolations) {
  console.error(`  ${v.file}:${v.line}  ${v.label}`)
  console.error(`    ${v.text}\n`)
}

process.exit(1)
