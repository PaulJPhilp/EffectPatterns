# Changelog

All notable changes to `@effect-patterns/ep-cli` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-03-02

### Changed
- **Category-based install for all tools**: `install add` now writes one file per pattern category for `claude`, `cursor`, and `windsurf` (up to 16 files each), instead of a single flat file
- `cursor` and `windsurf` output `.mdc` files with YAML frontmatter (`description`, `globs`, `alwaysApply`) in `.cursor/rules/` and `.windsurf/rules/`
- `vscode` now writes to `.github/copilot-instructions.md` (Copilot convention) as a single aggregated file with category sections
- `claude` writes `.md` skill files to `.claude/skills/` (unchanged directory, now uses shared category config)
- `agent` behavior unchanged (managed section in `AGENTS.md`)

## [0.3.2] - 2026-02-26

### Fixed
- Resolve Effect version mismatch warnings by bumping `@effect/cluster` to 0.56.4 and `@effect/rpc` to 0.73.2
- Fix default API URL to point to correct Vercel deployment

## [0.3.1] - 2026-02-26

### Added
- Published `@effect-patterns/ep-cli` to npm for global installation (`bun add -g @effect-patterns/ep-cli`)
- Added `@effect/cluster`, `@effect/rpc`, and `@effect/sql` as dependencies to satisfy `@effect/platform-node` peer requirements

### Fixed
- Fix missing peer dependencies that caused `Cannot find module '@effect/cluster/RunnerStorage'` at runtime

## [0.3.0] - 2026-02-10

### Added
- **Pattern Discovery**: `search`, `list`, `show` commands for browsing 700+ Effect-TS patterns
- **Rule Installation**: `install add/list` for installing Effect pattern rules into AI tools (Cursor, VS Code, Windsurf, Agents)
- **Skills Management**: `skills list/preview/validate/stats` for Claude Skills

### Dependencies
- effect 3.19.19
- @effect/cli 0.73.2
- @effect/platform 0.94.5
- @effect/platform-node 0.104.1
