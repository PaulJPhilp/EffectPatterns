# Documentation Organization

This document describes the organization of all documentation in the Effect Patterns repository.

## Structure

All documentation has been consolidated into the `docs/` folder with the following structure:

### Root Level Documentation
- `docs/CHANGELOG.md` - Project changelog (moved from root)
- `docs/README.md` - Main project README (stays at root for GitHub)
- `docs/SECURITY.md` - Security policy (stays at root for GitHub)

### Release Documentation
- `docs/release/` - All release notes and changelogs
  - `RELEASE_NOTES_v0.9.0-patterns.md`
  - `CHANGELOG-CLI.md`
  - Other release-related documents

### Scripts Documentation
- `docs/scripts/` - Documentation for scripts
  - `README.md` - Main scripts documentation
  - `README-test-harness.md` - Test harness documentation
  - `GEMINI.md` - Gemini integration docs
  - `deploy-and-update-plugin.md` - Deployment guide
  - `ingest/README.md` - Ingest pipeline documentation
  - `qa/README.md` - QA process documentation
  - `cli-tests/README.md` - CLI tests documentation

### Services Documentation
- `docs/services/mcp-server/` - MCP Server documentation
  - `README.md` - Main documentation
  - `DEPLOYMENT.md` - Deployment guide
  - `VERCEL_SETUP.md` - Vercel setup
  - Other service-specific docs
- `docs/services/mcp-server-stdio/` - MCP Server Stdio documentation
  - `README.md` - Main documentation
  - `INSTALLATION.md` - Installation guide
  - `SUMMARY.md` - Summary document

### Application Documentation
- `docs/app/sm-cli/` - Supermemory CLI documentation
  - `PROFILES_GUIDE.md` - User profiles guide

### Agents Documentation
- `docs/agents/analyzer/` - Analyzer agent documentation
  - All analyzer-related documentation files

## Package Documentation

Package-specific README files remain in their respective package directories (standard practice):
- `packages/*/README.md` - Package documentation
- `app/*/README.md` - Application documentation

## Notes

- The main `README.md` remains at the repository root for GitHub visibility
- `SECURITY.md` remains at the repository root for GitHub security policy detection
- All other documentation has been moved to `docs/` for better organization
- Code references to `CHANGELOG.md` have been updated to `docs/CHANGELOG.md`
