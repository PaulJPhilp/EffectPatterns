# EP CLI Master User Documentation

Canonical user documentation for `ep` (Effect Patterns CLI), version `0.3.0`.

This document is the source of truth for end-user behavior, command semantics, configuration, and troubleshooting.

## What `ep` Is

`ep` is the end-user CLI for browsing Effect Patterns, viewing pattern details, installing rules into local AI tool config files, and validating local Claude Skills.

Public command surface:

- `search`
- `list`
- `show`
- `install add`
- `install list`
- `skills list`
- `skills preview`
- `skills validate`
- `skills stats`

Maintainer workflows are intentionally out of scope and live in `ep-admin`.

## Installation

Requires Bun (package declares `bun >= 1.0.0`).

```bash
bun add -g @effect-patterns/ep-cli
```

Verify:

```bash
ep --version
```

## Quick Start

```bash
# 1) List available patterns
ep list

# 2) Search by keyword
ep search "retry"

# 3) Show one pattern in detail
ep show retry-with-backoff

# 4) See supported install targets
ep install list
```

If your API requires a key:

```bash
export PATTERN_API_KEY="your-key"
ep search "error handling"
```

Or securely via stdin (not stored in shell history):

```bash
printf '%s' "$PATTERN_API_KEY" | ep --api-key-stdin search "retry"
```

## Global CLI Behavior

### Global options

These are available on commands:

- `--completions sh|bash|fish|zsh`
- `--log-level all|trace|debug|info|warning|error|fatal|none`
- `-h, --help`
- `--wizard`
- `--version`

### Exit codes

- `0` on success
- `1` on command/runtime failure

### Streams (`stdout` vs `stderr`)

- Structured command output goes to `stdout`.
- Errors and diagnostics go to `stderr`.
- `--json` output is kept parseable and clean on `stdout`.

### Color behavior

Color is disabled when any of these are true:

- `NO_COLOR` is set
- `CI` is set
- `TERM=dumb`
- output is not a TTY

## Authentication and API Key Resolution

Pattern API key lookup order:

1. `PATTERN_API_KEY` env var
2. `EP_API_KEY_FILE` (path to a file containing only the key)
3. Config file JSON `apiKey` field:
   - `EP_CONFIG_FILE` if set
   - otherwise `${XDG_CONFIG_HOME:-~/.config}/ep-cli/config.json`

### `--api-key-stdin`

`--api-key-stdin` is a hidden global flag supported by the runtime layer.  
When passed, `ep` reads stdin, trims it, and sets `PATTERN_API_KEY` for that invocation.

If stdin is empty, command fails with:

- `No API key was provided on stdin. Pipe a PATTERN_API_KEY value when using --api-key-stdin.`

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `PATTERN_API_KEY` | API key sent as `x-api-key` to pattern API | unset |
| `EP_API_KEY_FILE` | File containing API key text | unset |
| `EP_CONFIG_FILE` | Path to JSON config (expects `{"apiKey":"..."}`) | `${XDG_CONFIG_HOME:-~/.config}/ep-cli/config.json` |
| `EFFECT_PATTERNS_API_URL` | Base URL for pattern API | `https://effect-patterns-mcp.vercel.app` |
| `EP_API_TIMEOUT_MS` | Request timeout in ms | `10000` |
| `EP_INSTALLED_STATE_FILE` | Installed-rules state file path override | `${XDG_STATE_HOME:-~/.local/state}/ep-cli/installed-rules.json` |
| `EP_SKILLS_DIR` | Explicit skills directory override | auto-discovered from cwd upward |
| `LOG_LEVEL` | Logger level (`debug|info|warn|error`) | `info` |
| `DEBUG` | Enables debug logging when set | unset |
| `VERBOSE` | Enables debug logging when set | unset |
| `NO_COLOR` | Disable ANSI colors | unset |
| `CI` | CI mode; disables colors | unset |
| `TERM` | Terminal type; `dumb` disables colors | inherited |

Logger priority:

1. CLI `--log-level`
2. `LOG_LEVEL`
3. `DEBUG`
4. `VERBOSE`
5. default `info`

## Command Reference

### `ep search [--json] <query>`

Searches patterns by keyword. Current implementation uses server-side limit `10`.

Examples:

```bash
ep search "retry"
ep search "http timeout" --json
```

Human mode behavior:

- prints matched pattern titles and IDs
- if results exist: nudge `Next: ep show <first-id>`
- if no results: suggestion nudges for `ep list --category ...` and `ep list --difficulty ...`

JSON shape:

```json
{
  "count": 2,
  "patterns": [
    {
      "id": "retry-with-backoff",
      "title": "Retry with Backoff",
      "description": "...",
      "category": "error-handling",
      "difficulty": "intermediate",
      "tags": ["retry"],
      "examples": [],
      "useCases": ["resilience"],
      "relatedPatterns": []
    }
  ]
}
```

### `ep list [--difficulty text] [--category text] [--json]`

Lists patterns, optionally filtered by difficulty and/or category.

Examples:

```bash
ep list
ep list --difficulty beginner
ep list --category core-concepts
ep list --difficulty intermediate --category error-handling --json
```

Human mode behavior:

- prints total count and pattern bullets
- if non-empty: nudge `Next: ep show <first-id>`
- if empty: nudge `Try: ep search retry`

JSON shape:

```json
{
  "count": 12,
  "patterns": [/* pattern summary objects */]
}
```

### `ep show [--json] <pattern-id>`

Fetches one pattern by ID.

Examples:

```bash
ep show retry-with-backoff
ep show retry-with-backoff --json
```

Human mode behavior:

- renders description panel
- nudge: `Next: ep search "<pattern-category>"`

Not-found behavior:

- human: error + `Try: ep search "<input>"`
- json:

```json
{
  "pattern": null,
  "message": "Pattern \"your-id\" not found"
}
```

Success JSON shape:

```json
{
  "pattern": {
    "id": "retry-with-backoff",
    "title": "Retry with Backoff",
    "description": "...",
    "category": "error-handling",
    "difficulty": "intermediate",
    "tags": [],
    "examples": [],
    "useCases": [],
    "relatedPatterns": [],
    "slug": "retry-with-backoff",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-10T00:00:00.000Z"
  }
}
```

### `ep install`

Subcommands:

- `install add`
- `install list`

`install remove` and `install diff` exist in code but are intentionally not exposed in the public command surface at this time.

### `ep install add --tool text [--skill-level text] [--use-case text] [-i|--interactive]`

Installs rule content into local tool configuration files.

Supported tool values:

- `agents`
- `cursor`
- `vscode`
- `windsurf`

Target files:

- `agents` -> `AGENTS.md`
- `cursor` -> `.cursor/rules.md`
- `vscode` -> `.vscode/rules.md`
- `windsurf` -> `.windsurf/rules.md`

Examples:

```bash
ep install add --tool agents
ep install add --tool cursor --skill-level intermediate
ep install add --tool vscode --use-case building-apis
ep install add --tool windsurf -i
```

Notes:

- `--interactive` opens multi-select prompt.
- `--skill-level` maps to pattern difficulty filter.
- `--use-case` filters results client-side by use case tag.
- For `agents`, managed block markers are used:
  - `<!-- EP_RULES_START -->`
  - `<!-- EP_RULES_END -->`
- Existing managed block in `AGENTS.md` is replaced in place.
- State is recorded in installed-rules state JSON file.

Unsupported tool behavior:

- exits non-zero
- diagnostic printed to `stderr`

### `ep install list [--installed] [--json]`

Without flags: prints supported tools.

With `--installed`: prints locally tracked installed rules.

Examples:

```bash
ep install list
ep install list --json
ep install list --installed
ep install list --installed --json
```

JSON shapes:

```json
{ "tools": ["agents", "cursor", "vscode", "windsurf"] }
```

```json
{
  "count": 1,
  "rules": [
    {
      "id": "access-environment-variables",
      "title": "Access Environment Variables",
      "description": "...",
      "skillLevel": "general",
      "useCase": ["platform-getting-started"],
      "content": "...",
      "installedAt": "2026-02-15T00:00:00.000Z",
      "tool": "cursor",
      "version": "1.0.0"
    }
  ]
}
```

### `ep skills`

Subcommands:

- `skills list`
- `skills preview <category>`
- `skills validate`
- `skills stats`

Skills operate on local filesystem content, not remote API lookups.

Skills directory resolution order:

1. `EP_SKILLS_DIR` if set
   - absolute path used directly
   - relative path resolved against current working directory
2. Auto-discovery: traverse cwd -> parent directories, looking for:
   - `.claude-plugin/plugins/effect-patterns/skills`
3. Fallback to cwd + default path (then fail if missing)

If directory not found, command fails with actionable guidance.

### `ep skills list [--json]`

Lists discovered skills categories and metadata.

Example:

```bash
ep skills list
ep skills list --json
```

JSON shape:

```json
{
  "count": 2,
  "skills": [
    {
      "category": "testing",
      "title": "Testing Skill",
      "patternCount": 3,
      "skillLevels": ["beginner", "intermediate"],
      "filePath": "/abs/path/.../SKILL.md"
    }
  ]
}
```

### `ep skills preview [--json] <category>`

Shows full `SKILL.md` content for one category.

Example:

```bash
ep skills preview testing
ep skills preview testing --json
```

JSON shape:

```json
{
  "skill": {
    "metadata": {
      "category": "testing",
      "title": "Testing Skill",
      "patternCount": 3,
      "skillLevels": ["beginner"],
      "filePath": "/abs/path/.../SKILL.md"
    },
    "content": "# Testing Skill\n..."
  }
}
```

### `ep skills validate [--json]`

Validates all skills for structure/content expectations.

Checks:

- main heading exists (`# `)
- at least one pattern heading (`###`)
- at least one level mention (`beginner|intermediate|advanced`)
- required sections exist:
  - `Good Example`
  - `Anti-Pattern`
  - `Rationale`

Example:

```bash
ep skills validate
ep skills validate --json
```

JSON shape:

```json
{
  "valid": false,
  "errorCount": 2,
  "errors": [
    {
      "category": "testing",
      "filePath": "/abs/path/.../SKILL.md",
      "error": "Missing required section: Rationale"
    }
  ]
}
```

Behavior note:

- exits non-zero when validation errors exist.

### `ep skills stats [--json]`

Shows aggregate stats from discovered skills.

Example:

```bash
ep skills stats
ep skills stats --json
```

JSON shape:

```json
{
  "stats": {
    "totalSkills": 10,
    "totalPatterns": 120,
    "skillsByLevel": {
      "beginner": 4,
      "intermediate": 8,
      "advanced": 5
    },
    "categoryCoverage": [
      { "category": "testing", "patterns": 14 }
    ]
  }
}
```

## Shell Completions

Generate completion script:

```bash
ep --completions zsh
ep --completions bash
ep --completions fish
ep --completions sh
```

Then source/install according to your shell setup.

## Error UX and Suggestions

`ep` includes typo and next-step guidance.

Examples:

- `ep serch retry` -> suggests `ep search`
- `ep install ls` -> suggests `ep install list`
- successful list/search/show/install/skills flows print `Next:` hints

Common actionable errors:

- network/API unreachable
- API unauthorized (`401`)
- missing local skills directory
- empty stdin with `--api-key-stdin`

All actionable errors include a docs pointer:

- `https://github.com/PaulJPhilp/Effect-Patterns/tree/main/packages/ep-cli#readme`

## Machine-Mode Guidance (`--json`)

For automation/CI:

- always pass `--json` where supported
- parse `stdout` only
- treat non-zero exit as failure

Recommended examples:

```bash
ep install list --json | jq .
ep skills stats --json | jq '.stats.totalSkills'
ep list --difficulty beginner --json | jq '.count'
```

## File Locations and Persistence

Defaults:

- API config JSON: `${XDG_CONFIG_HOME:-~/.config}/ep-cli/config.json`
- installed rules state: `${XDG_STATE_HOME:-~/.local/state}/ep-cli/installed-rules.json`
- skills root: `.claude-plugin/plugins/effect-patterns/skills` (workspace-relative, auto-discovered)

`agents` tool install target:

- `AGENTS.md` in current working directory

Other install targets:

- `.cursor/rules.md`
- `.vscode/rules.md`
- `.windsurf/rules.md`

## Troubleshooting

### Unauthorized (401)

Symptom:

- `Pattern API request was unauthorized (401).`

Fix:

1. Set `PATTERN_API_KEY`
2. Or pass `--api-key-stdin`
3. Or configure `EP_API_KEY_FILE` / config JSON `apiKey`

### API timeout or connectivity failure

Symptom:

- API request failed or timed out

Fix:

1. verify network access
2. verify `EFFECT_PATTERNS_API_URL`
3. increase `EP_API_TIMEOUT_MS` if needed

### Skills directory not found

Symptom:

- `Skills directory was not found for this workspace.`

Fix:

1. run command inside workspace that contains `.claude-plugin/plugins/effect-patterns/skills`
2. or set `EP_SKILLS_DIR` explicitly

### Empty output when piping

If using `--json`, verify parser reads `stdout` and not `stderr`.

### No color output

Expected when non-TTY or when `NO_COLOR`, `CI`, or `TERM=dumb` is set.

## Compatibility and Scope

- This document covers the end-user CLI (`ep`) only.
- Public command set is intentionally constrained.
- Commands not shown in `ep --help` are not part of stable user-facing surface.

## Versioning

This document tracks behavior for:

- CLI name: `ep`
- Version: `0.3.0`

When command surface or behavior changes, update this file first, then derivative docs.
