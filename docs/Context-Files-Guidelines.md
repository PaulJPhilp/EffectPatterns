# Context Files Guidelines

This document defines what context files are, how they relate to canonical rules and architecture docs, and how CLI and MCP tools should create and update them. It is designed to be **portable**: any project (Effect-Patterns or not) can adopt this strategy. It also serves as the **single strategy reference** for tooling (e.g. `ep install add`, ep-admin `config install add`, and future MCP behavior that touches context files).

---

## 1. Purpose and scope

**Context files** are the small, root-level and tool-specific files that tell AI tools where to find architecture and rules. Examples: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/rules.md`, `.vscode/rules.md`.

**Audience:**

- Maintainers of any project that uses "AI context" files.
- Implementers of CLI and MCP tools that create or update those files.

**Goals:**

- One **canonical source** for rules (and one for architecture).
- **Minimal wrapper** content so context files do not bloat every conversation.
- **Safe, idempotent updates** via managed sections so tooling can update only the rules-related part of a file.

---

## 2. Canonical sources

- **Rules:** One canonical rules document per project (e.g. `docs/Effect-Patterns-Rules.md`). All context files that reference "rules" should point here or contain content derived from here.
- **Architecture:** One canonical architecture document (e.g. `docs/Architecture.md`) for workspace layout, services, config, commands, and debugging.

Paths are **project-relative** (e.g. `docs/Effect-Patterns-Rules.md`). Do not rely on absolute or tool-specific paths in the guidelines.

---

## 3. Context file inventory and roles

| File | Role | Content strategy |
|------|------|------------------|
| `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` | Wrapper (project root) | Minimal: link to architecture + link to canonical rules + run/tooling conventions. Optional managed section for tooling. |
| `.cursor/rules.md`, `.vscode/rules.md`, `.windsurf/rules.md`, etc. | Tool-specific | Either **pointer only** (link to canonical doc) or **full copy** of rules, depending on tool behavior; see §4. |

Wrapper files must stay **small** (on the order of a few dozen lines, like typical `CLAUDE.md` / `AGENTS.md`) so they do not bloat every AI conversation.

---

## 4. Pointer vs. full inject

**Pointer (preferred)**  
The context file contains a short line that points to the canonical rules doc, e.g.:

```text
For Effect Patterns rules, see [docs/Effect-Patterns-Rules.md](docs/Effect-Patterns-Rules.md).
```

Use a pointer when the AI tool can follow links or load that doc when needed.

**Full inject**  
The context file contains the full rules content (or a large subset). Use when the tool only ever loads that one file and does not follow links. When possible:

1. Write the full content to the **canonical** rules doc.
2. Keep a **pointer** in the tool file if the tool supports it.

If the tool cannot use a pointer (e.g. it always loads a single rules file and never follows links), then the CLI may write a full copy into the tool file (e.g. `.cursor/rules.md`). In that case, treat the canonical doc as the **source of truth** and the tool file as a **generated artifact**.

**Rule:** Do not duplicate the canonical rules in multiple places unless the tool cannot use a pointer.

---

## 5. Managed sections (markers)

**Purpose:** Let CLI/tools update only the "rules" part of a file without touching user-added content outside the block.

**Marker pair (standard):**

- Start: `<!-- EP_RULES_START -->`
- End: `<!-- EP_RULES_END -->`

Use exact spelling. Place each marker on its own line. Tooling must **only** replace the region between the two markers; never delete or overwrite content outside.

**Allowed content between markers:**

- **(a)** A single pointer line to the canonical rules doc, or  
- **(b)** Generated rules content (e.g. when using full inject for that file).

**When markers are missing:** Either append a new block (with markers) to the file, or create the file with that block. Do **not** assume the whole file is managed; preserve everything outside the markers.

---

## 6. Required content in wrapper files (CLAUDE.md, AGENTS.md, GEMINI.md)

Every wrapper file should include at minimum:

1. **Link to architecture**  
   e.g. “For architecture (workspace layout, …), use: [docs/Architecture.md](docs/Architecture.md).”

2. **Link to canonical rules**  
   e.g. “For [Effect Patterns] rules, use: [docs/Effect-Patterns-Rules.md](docs/Effect-Patterns-Rules.md).”

3. **Run and tooling conventions**  
   One line, e.g. “Run commands from the project root. Use Bun and workspace:* dependencies; no TypeScript path aliases.” (or the project’s equivalent.)

Optional: a short project-specific line (e.g. “In Cursor, use the MCP search_patterns tool for pattern queries.”) and, for AGENTS.md-style files, a managed section with the markers from §5.

---

## 7. File locations and naming

- **Project root:** `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`.
- **docs/:** Canonical rules and architecture (e.g. `docs/Effect-Patterns-Rules.md`, `docs/Architecture.md`).
- **Tool directories:** `.cursor/rules.md`, `.vscode/rules.md`, `.windsurf/rules.md`, etc., as per tool conventions.

Tool → path mapping (for CLI/MCP alignment):

| Tool | Path |
|------|------|
| agents | `AGENTS.md` |
| cursor | `.cursor/rules.md` |
| claude | `CLAUDE.md` |
| gemini | `GEMINI.md` |
| vscode | `.vscode/rules.md` |
| windsurf | `.windsurf/rules.md` |
| kilo | `.kilo/rules.md` |
| kira | `.kira/rules.md` |
| trae | `.trae/rules.md` |
| goose | `.goosehints` |

---

## 8. Idempotency and safety

- **Idempotent:** Re-running “install” or “update context” should produce the same result and not grow or corrupt the file.
- **Safe:** Only the content between the designated markers is replaced; the rest of the file is left unchanged. If the file has no markers, follow “when markers are missing” in §5.
- **No silent overwrite:** Tooling must not overwrite an entire wrapper file (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) without explicit user intent; prefer marker-based updates.

---

## 9. Using this in another project

1. Create or adopt a canonical rules doc (e.g. `docs/MyRules.md` or a URL).
2. Create or adopt an architecture doc (e.g. `docs/Architecture.md`).
3. Add minimal `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` at project root with the two links and run conventions; add a managed section with markers if tooling will update it.
4. Optionally run the project’s CLI to install rules into `.cursor/rules.md` (or equivalent) using the same pointer vs. full-inject strategy.

---

## 10. MCP and pattern lookup

When the project uses an MCP server (e.g. `search_patterns`): **pattern how-to queries** are best served by the MCP tool, not by inlining the full rules into context files. Context files should still point to the canonical rules doc for reference.

A project may enforce “use MCP for patterns” via a rule file (e.g. `.cursorrules`). That is consistent with keeping wrapper files minimal.

---

## 11. Summary for implementers

| Item | Value |
|------|--------|
| Canonical rules path | `docs/Effect-Patterns-Rules.md` (or project equivalent) |
| Canonical architecture path | `docs/Architecture.md` (or project equivalent) |
| Marker start | `<!-- EP_RULES_START -->` |
| Marker end | `<!-- EP_RULES_END -->` |
| Wrapper minimum content | Link to architecture + link to rules + run conventions |

**Pointer vs. full inject (recommended):**

| Tool / file | Recommendation |
|-------------|-----------------|
| AGENTS.md | Pointer in managed section; full rules in `docs/Effect-Patterns-Rules.md`. |
| CLAUDE.md, GEMINI.md | Pointer only (no full inject into wrapper). |
| .cursor/rules.md, .vscode/rules.md, .windsurf/rules.md | Pointer if tool can follow links; otherwise full copy from canonical doc. |

**Tool → path:** See the table in §7.
