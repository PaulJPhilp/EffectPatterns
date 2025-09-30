# Changelog

All notable changes to the Effect Patterns Hub will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-09-30

### Fixed

- **Publishing Pipeline Restored**: Fixed all pipeline scripts that were broken due to `effect-mdx` dependency issues
- **Content Restored**: Recovered and republished all 88 patterns that were accidentally deleted
- **Simplified Scripts**: Replaced Effect-based publishing scripts with simpler, more maintainable implementations using Node.js built-ins

### Changed

- **Publishing Scripts**: Migrated from `effect-mdx` to direct file operations using `fs/promises` and `gray-matter`
- **Package Dependencies**: Updated Effect ecosystem packages to latest compatible versions:
  - `@effect/platform`: `0.90.2` → `0.90.10`
  - `@effect/platform-node`: `0.90.0` → `0.94.2`
  - `effect`: `3.17.7` → `3.17.14`

### Performance

- **Pipeline Speed**: Full pipeline now runs in ~85 seconds with 100% success rate
- **Reliability**: Zero errors across all 88 patterns

### Documentation

- Updated status documentation to reflect current state
- Added comprehensive pipeline documentation
- Created release planning documentation

## [0.1.0] - 2024-07-XX

### Added

- Initial release with 88 Effect-TS patterns
- Pattern categories covering:
  - Error Management (11 patterns)
  - Building APIs (8 patterns)
  - Core Concepts (13 patterns)
  - Concurrency (11 patterns)
  - Testing (7 patterns)
  - Resource Management (7 patterns)
  - And more...
- AI coding rules for Cursor and Windsurf IDEs
- Publishing pipeline infrastructure
- Ingest pipeline for processing new patterns
- QA validation system

### Infrastructure

- TypeScript validation for all code examples
- MDX frontmatter validation
- Automated README generation
- AI rules generation system
- Pattern categorization by use case

