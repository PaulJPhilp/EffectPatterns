# Effect Patterns Lifecycle Harness

A **randomized, seedable lifecycle test harness** that creates real repos, mutates them through a simulated dev lifecycle, and exercises the `ep` CLI end-to-end using **real network/API** (no mocks). This is a **developer tool**, not a unit test suite. The harness is written in plain TypeScript (no Effect dependency) for simplicity and to keep the script runnable with minimal dependencies.

## Quick start

Run via `bun run lifecycle-harness …` from the monorepo root (recommended). The harness discovers the monorepo root by walking up from its script location, so it does not depend on your current working directory.

```bash
bun run lifecycle-harness --seed 123
```

This runs up to 10 scenarios (deterministic for seed `123`), creates repos under `~/Projects/TestRepos`, and writes a JSON report under `scripts/lifecycle-harness/reports/`.

**What it tests:**

- Scaffolding (all templates: basic, service, cli, http-server, lib, worker)
- Completions (sh, bash, fish, zsh)
- Pattern commands: search, list, show
- Installs for random tools (install list / install add), including both skill types: **agent** (AGENTS.md) and **claude** (CLAUDE.md)
- Skills discovery and validation (list, preview, stats, validate)
- Lifecycle mutations (break/fix cycles, TS edits, tests, skills, etc.)

## Flags

| Flag | Description | Default |
|------|-------------|--------|
| `--seed <number>` | PRNG seed (reproducible runs) | `Date.now()` |
| `--scenarios <n>` | Number of lifecycle scenarios | `10` |
| `--only-scenario <n>` | Run only the scenario at 0-based index `n` (use same `--seed` as full run to reproduce) | (all) |
| `--budget-minutes <n>` | Hard stop before this many minutes | `14` |
| `--scenario-timeout-seconds <n>` | Per-scenario / per-command timeout | `90` |
| `--root-dir <path>` | Parent directory for generated repos (**currently must be** `$HOME/Projects/TestRepos` because `scaffold` is hardcoded) | `$HOME/Projects/TestRepos` |
| `--disk-budget-mb <n>` | Stop if total repo size (excl. node_modules) exceeds this MB | `1024` |
| `--commits minimal\|none` | Create 2–5 checkpoint git commits per scenario | `minimal` |
| `--keep-last-n <n>` | Keep only the N most recent scenario repos; delete older ones after each scenario so disk stays bounded and you can inspect the last N | off (keep all) |
| `--verbose` | Stream subprocess stdout/stderr live | off |
| `--dry-run` | Print planned actions only; do not execute | off |
| `--ep-bin <path>` | Path to `ep` CLI (or `ep` on PATH) | `ep` |
| `--analyze <path>` | Print built-in summary for an existing report JSON (coverage matrix, soft-fail counts, template distribution); no run | — |

**Note:** The scaffold script currently always creates projects under `$HOME/Projects/TestRepos`. The harness `--root-dir` flag exists for future support but must match that path for now.

## Examples

- **Reproduce a run:**  
`bun run lifecycle-harness --seed 1`

- **Fewer scenarios (faster):**  
`bun run lifecycle-harness --seed 42 --scenarios 2`

- **Dry run (see planned actions only):**  
`bun run lifecycle-harness --seed 1 --dry-run`

- **Verbose (see all commands and output):**  
`bun run lifecycle-harness --seed 1 --scenarios 1 --verbose`

- **Re-run only scenario 3 (same seed = same scenario):**  
`bun run lifecycle-harness --seed 888 --only-scenario 3`

- **Clean up as you go (keep last 5 repos for inspection):**  
`bun run lifecycle-harness --seed 1 --scenarios 25 --keep-last-n 5`

- **Print summary for an existing report:**  
`bun run lifecycle-harness --analyze scripts/lifecycle-harness/reports/run-20260226-172113-seed-20260226.json`

## Unit tests

The harness has a companion unit test suite under `scripts/__tests__/lifecycle-harness/` (e.g. `code-broken.test.ts`, `report.test.ts`, `scaffold-validate.test.ts`, `output-checks.test.ts`, `list-parse.test.ts`). Run from the monorepo root:

```bash
bunx vitest run scripts/__tests__/lifecycle-harness/ --config vitest.config.ts
```

These tests cover outcome classification, output validation, list parsing, scaffold validation, code-broken detection, args, disk helpers, and report summary. They do **not** run the full harness or hit the network.

## Report summary

At the end of each run the harness prints a **report summary**: coverage matrix (attempted/succeeded per ep surface), soft-fail counts by command type, and template distribution. The same summary can be printed for any saved report with `--analyze <path>`.

## JSON report

After each run, a report is written to:

`scripts/lifecycle-harness/reports/run-<YYYYMMDD-HHmmss>-seed-<seed>.json`

Contents:

- **seed**, **startTime**, **endTime**, **runtimeMs**
- **scenarios**: per-scenario repo path, template, tools, status (`success` / `soft-fail` / `hard-fail`), and list of **commands** with:
- **resolvedBinary**, **args**, **cwd**, **envOverrides**, **timeoutMs** (if used), **exitCode**, **durationMs**, **outcome** (`success` | `soft-fail` | `hard-fail`), optional **expectedToFail** (true = intentional negative test, e.g. bogus `ep show`), optional **outputCheckFailed** (when command exited 0 but stdout failed validation), optional **stderrExcerpt** (truncated)
- **totalCommandsAttempted**, **totalSuccess**, **totalSoftFail**, **totalHardFail**
- **diskUsageBytes**, **diskUsageMb** (sum of scenario repo sizes; **node_modules excluded**)
- **firstFailingScenario**: `{ scenarioIndex, seed }` to reproduce the first hard-fail, or `null`
- **coverageAttempted**: Each ep surface invoked at least once: `list`, `search`, `show`, `installList`, `installAdd`, `skillsList`, `skillsPreview`, `skillsValidate`, `skillsStats`, `completions`
- **coverageSucceeded**: Each of those surfaces succeeded at least once. If `coverageAttempted.installAdd` is true and `coverageSucceeded.installAdd` is false, the surface was attempted but e.g. blocked by 401.
- **softFailByCommand**: JSON object of soft-fail counts by command key (e.g. `"skills validate": 33`, `"git commit": 70`), sorted by count descending. Lets you see which commands accounted for soft-fails without scanning all command records.

Per-command fields allow copy/paste or reconstructing the exact invocation.

## How to interpret the report

**Outcome policy (explicit, consistent):**

- **success**: Command exited 0 **and** passed output validation (if applicable).
- **hard-fail (output check)**: Command exited 0 but stdout failed validation (e.g. `ep list` returned no patterns, `ep search` returned empty output). Recorded as `outputCheckFailed` in the report.
- **soft-fail (output check)**: Same as above, but when stdout/stderr suggests login required, unauthorized, or “not found” (e.g. after adding `ep login`), the outcome is **soft-fail** instead of hard-fail so the run does not flood with hard-fails; coverage gap still reflects that the surface never succeeded.
- **soft-fail**: Non-zero exit matching known external/expected conditions:
- API: 401, 403, 404, 429, 5xx
- Network: DNS (ENOTFOUND, getaddrinfo), connection refused, timeout
- Not-found / bogus `ep show` id
- “Skills missing” only when intentionally triggered (e.g. break step)
- **hard-fail**: Timeout (process killed), crash, or any other unexpected non-zero. Scenario may be marked hard-fail.

If **expectedToFail** is true, a non-zero exit is treated as **outcome: "success"** for that command. A command with **expectedToFail: true** and **outcome: "success"** thus means the intentional negative test passed (e.g. bogus `ep show` correctly exited non-zero).

**Source layout:** The harness lives under `scripts/lifecycle-harness/`. Entry point is `src/index.ts`. Supporting modules: `args.ts` (CLI flags), `command.ts` (subprocess run with timeout/capture), `report.ts` (outcome classification, JSON shape), `report-summary.ts` (printed summary), `mutations.ts` (random lifecycle steps), `code-broken.ts` (detect broken project state), `output-checks.ts` (stdout validation), `list-parse.ts` (parse pattern IDs from `ep list`), `scaffold-validate.ts` (required files per template), `paths.ts` (monorepo root, scaffold root, reports dir), `disk.ts` (size helpers), `skills.ts` (break/fix SKILL.md), `types.ts` (TEMPLATES, TOOLS, mutation union). See **§ Unit tests** for the test suite.

**Repo root:** The harness discovers the monorepo root by walking up from its script location (`scripts/lifecycle-harness/src/`). It looks for a directory containing `package.json` with either `effect-patterns-hub` or a `"scaffold"` script. If not found, it throws a clear error (where it searched, what it expected). This contract is in `paths.ts`; if the root `package.json` is restructured, that check may need updating.

**Scenario directory names:** Each scenario repo is named `ep-life-YYYYMMDD-<seed>-s<index>-<template>-<shortRand>`. The date prefix (today’s date) is included so runs on different days get distinct directories and do not collide. The same seed still produces the same sequence of actions and the same logical scenario; only the directory path differs across days.

To reproduce the first failing scenario:

```bash
# Fastest reproduction (recommended)
bun run lifecycle-harness --seed <seed> --only-scenario <scenarioIndex>

# Alternative: run up to and including the failing scenario
bun run lifecycle-harness --seed <seed> --scenarios <scenarioIndex + 1>
```

**Disk usage:** The budget and report totals **exclude `node_modules`**, so the disk budget is a heuristic for project content size; actual disk usage will be higher. A **soft warning** is printed (without enforcing) if total size *including* `node_modules` exceeds 1.5× the disk budget so you can clean old runs if needed.

**Orphan processes:** If a command times out (e.g. `bun run dev`), the harness kills the process. On macOS, child processes may survive; if you see stuck `bun run dev` or similar, clean them up manually (e.g. `pkill -f "bun run dev"` or kill the specific PID).

## Lifecycle phases (per scenario)

1. **Phase A** – Scaffold project (`bun run scaffold ...`), then baseline `ep` coverage: `--version`, `--help`, `--completions` (sh/bash/fish/zsh), `list`, `search retry`, `show <id>`.
2. **Skills** – Create `.claude-plugin/plugins/effect-patterns/skills/<category>/SKILL.md` (valid content), then `ep skills list`, `preview`, `stats`, `validate`.
3. **Phase B** – 8–20 random mutations (add TS module, rename file, break/fix TS, add/break/fix test, package scripts, skills break/fix, short `bun run dev`/`test`, `ep install list`/`install add`, `ep skills validate`, `ep search`, `ep show` with bogus id).
4. **Phase C** – Re-run selected `ep` commands (list, search, install list, skills list).
5. **Phase D** – Ensure at least one intentional skills break and fix; re-run `ep skills validate`.
6. **Commits** – If `--commits minimal`, 2–5 git checkpoint commits.

**Template distribution:** Templates are assigned in strict round-robin by scenario index: scenario s uses `TEMPLATES[s % 6]` (basic, service, cli, http-server, lib, worker). So with 24 scenarios each template is used exactly 4 times; with 25, one template is used 5 times and the rest 4. This evens out distribution and makes runs reproducible for a given `--scenarios`.

**Output validation:** After successful `ep` commands, the harness validates stdout content (not just exit code). Checked commands: `list` (has pattern slugs), `search` (non-trivial output), `show` (substantial content), `install list` (mentions known tools), and `skills validate` after a fix step (no missing sections). A command that exits 0 but fails validation is reclassified as **hard-fail** with `outputCheckFailed` in the report.

**Multiple pattern IDs for `ep show`:** Phase A parses up to 3 pattern IDs from `ep list` output and runs `ep show <id>` for each, so several different patterns are exercised per scenario (fallback to one known ID if parsing yields none).

**Scaffold output validation:** After the scaffold command succeeds and the repo dir exists, the harness verifies that required files are present (e.g. `package.json`, `src/index.ts`, and template-specific files such as `src/service.ts` for service, `src/commands.ts` for cli, `src/routes.ts` for http-server, `src/index.test.ts` for lib). If any are missing, the scenario is marked hard-fail and the run continues (so you get a clear failure instead of failing later in Phase A).

**Coverage gate:** At the end of a run, if any ep surface was attempted but never succeeded (e.g. `installAdd` always 401), the harness prints "Coverage gap: ..." and exits with code 1. When you use `--only-scenario N`, the coverage gate is **skipped** (and a one-line note is printed), since a single scenario cannot exercise all surfaces.

All randomness (tools, mutation order, short random suffix) is driven by the seed, so the same seed produces the same sequence of actions. Only template assignment is deterministic (round-robin by scenario index). Repo directory names include the current date (see above), so the exact path varies by run date.
