# Effect Patterns Lifecycle Harness

A **randomized, seedable lifecycle test harness** that creates real repos, mutates them through a simulated dev lifecycle, and exercises the `ep` CLI end-to-end using **real network/API** (no mocks). This is a **developer tool**, not a unit test suite. The harness is written in plain TypeScript (no Effect dependency) for simplicity and to keep the script runnable with minimal dependencies.

## Quick start

Run via `bun run lifecycle-harness …` from the monorepo root (recommended). The harness discovers the monorepo root by walking up from its script location, so it does not depend on your current working directory.

```bash
bun run lifecycle-harness --seed 123
```

This runs up to 10 scenarios (deterministic for seed `123`), creates repos under `~/Projects/TestRepos`, and writes a JSON report under `scripts/lifecycle-harness/reports/`.

**What it tests:**

- Scaffolding (all templates: basic, service, cli, http-server)
- Completions (sh, bash, fish, zsh)
- Pattern commands: search, list, show
- Installs for random tools (install list / install add)
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
| `--verbose` | Stream subprocess stdout/stderr live | off |
| `--dry-run` | Print planned actions only; do not execute | off |
| `--ep-bin <path>` | Path to `ep` CLI (or `ep` on PATH) | `ep` |

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

## JSON report

After each run, a report is written to:

`scripts/lifecycle-harness/reports/run-<YYYYMMDD-HHmmss>-seed-<seed>.json`

Contents:

- **seed**, **startTime**, **endTime**, **runtimeMs**
- **scenarios**: per-scenario repo path, template, tools, status (`success` / `soft-fail` / `hard-fail`), and list of **commands** with:
- **resolvedBinary**, **args**, **cwd**, **envOverrides**, **timeoutMs** (if used), **exitCode**, **durationMs**, **outcome** (`success` | `soft-fail` | `hard-fail`), optional **expectedToFail** (true = intentional negative test, e.g. bogus `ep show`), optional **stderrExcerpt** (truncated)
- **totalCommandsAttempted**, **totalSuccess**, **totalSoftFail**, **totalHardFail**
- **diskUsageBytes**, **diskUsageMb** (sum of scenario repo sizes; **node_modules excluded**)
- **firstFailingScenario**: `{ scenarioIndex, seed }` to reproduce the first hard-fail, or `null`
- **coverageAttempted**: Each ep surface invoked at least once: `list`, `search`, `show`, `installList`, `installAdd`, `skillsList`, `skillsPreview`, `skillsValidate`, `skillsStats`, `completions`
- **coverageSucceeded**: Each of those surfaces succeeded at least once. If `coverageAttempted.installAdd` is true and `coverageSucceeded.installAdd` is false, the surface was attempted but e.g. blocked by 401.

Per-command fields allow copy/paste or reconstructing the exact invocation.

## How to interpret the report

**Outcome policy (explicit, consistent):**

- **success**: Command exited 0.
- **soft-fail**: Non-zero exit matching known external/expected conditions:
- API: 401, 403, 404, 429, 5xx
- Network: DNS (ENOTFOUND, getaddrinfo), connection refused, timeout
- Not-found / bogus `ep show` id
- “Skills missing” only when intentionally triggered (e.g. break step)
- **hard-fail**: Timeout (process killed), crash, or any other unexpected non-zero. Scenario may be marked hard-fail.

If **expectedToFail** is true, a non-zero exit is treated as **outcome: "success"** for that command. A command with **expectedToFail: true** and **outcome: "success"** thus means the intentional negative test passed (e.g. bogus `ep show` correctly exited non-zero).

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

All randomness (templates, tools, mutation order, short random suffix) is driven by the seed, so the same seed produces the same sequence of actions. Repo directory names also include the current date (see above), so the exact path varies by run date.
