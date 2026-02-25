# Changelog

All notable changes to `@effect-patterns/ep-cli` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-10

### Added
- **First public npm release**
- **Pattern Discovery**: `search`, `list`, `show` commands for browsing 700+ Effect-TS patterns
- **Rule Installation**: `install add/list` for installing Effect pattern rules into AI tools (Cursor, VS Code, Windsurf, Agents)
- **Skills Management**: `skills list/preview/validate/stats` for Claude Skills

### Security
- Strict API key validation for MCP transport
- OAuth/PKCE hardening for authentication flows

### Dependencies
- effect ^3.19.14
- @effect/cli ^0.73.0
- @effect/platform ^0.94.1
