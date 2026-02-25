/**
 * One-time migration: move EP rules from AGENTS.md to docs/Effect-Patterns-Rules.md
 * and replace the block in AGENTS.md with a pointer.
 * Run from repo root: bun run scripts/migrate-ep-rules-to-canonical.ts
 */

import fs from "node:fs"
import path from "node:path"

const REPO_ROOT = path.resolve(import.meta.dirname, "..")
const AGENTS_PATH = path.join(REPO_ROOT, "AGENTS.md")
const CANONICAL_PATH = path.join(REPO_ROOT, "docs", "Effect-Patterns-Rules.md")
const START_MARKER = "<!-- EP_RULES_START -->"
const END_MARKER = "<!-- EP_RULES_END -->"

const content = fs.readFileSync(AGENTS_PATH, "utf-8")
const startIdx = content.indexOf(START_MARKER)
const endIdx = content.indexOf(END_MARKER)

if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
  console.error("Markers not found or invalid order in AGENTS.md")
  process.exit(1)
}

const rulesContent = content.slice(
  startIdx + START_MARKER.length,
  endIdx
).replace(/^\n+/, "").replace(/\n+$/, "\n")

const pointerSection = `${START_MARKER}\n\nFor Effect Patterns rules, see [docs/Effect-Patterns-Rules.md](docs/Effect-Patterns-Rules.md).\n\n${END_MARKER}\n`

const before = content.slice(0, startIdx)
const after = content.slice(endIdx + END_MARKER.length)
const nextAgents = before + pointerSection + after

fs.mkdirSync(path.dirname(CANONICAL_PATH), { recursive: true })
fs.writeFileSync(CANONICAL_PATH, rulesContent, "utf-8")
fs.writeFileSync(AGENTS_PATH, nextAgents, "utf-8")

console.log("Created docs/Effect-Patterns-Rules.md")
console.log("Updated AGENTS.md with pointer only")
