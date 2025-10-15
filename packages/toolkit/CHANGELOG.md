# Changelog

All notable changes to `@effect-patterns/toolkit` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-15

### Added

#### Core Features
- Pattern loading from JSON files with `loadPatternsFromJson` and `loadPatternsFromJsonRunnable`
- Type-safe pattern search with `searchPatterns` supporting query, skill level, use case, and tag filters
- Pattern retrieval by ID with `getPatternById`
- Code generation with `buildSnippet` supporting custom names, inputs, and module types
- Usage example generation with `generateUsageExample`

#### Schema Definitions
- `Pattern` schema for full pattern data with validation
- `PatternSummary` schema for lightweight pattern lists
- `PatternsIndex` schema for pattern collection metadata
- `SearchPatternsRequest` and `SearchPatternsResponse` schemas for API contracts
- `GenerateRequest` and `GenerateResponse` schemas for code generation
- `ExplainPatternRequest` schema for pattern explanation requests
- `ModuleType` schema for ESM/CommonJS module selection

#### Utilities
- `splitSections` - Parse pattern MDX content into semantic sections (Use Case, Good Example, Anti-Pattern, Rationale, Trade-offs)
- `sanitizeInput` - Security utility for input sanitization
- `toPatternSummary` - Convert full patterns to summaries for efficient lists

#### Type Safety
- Explicit `Effect` return types with error channels
- Runtime validation using `@effect/schema`
- No implicit `any` types
- Full TypeScript 5.8+ compatibility

#### Documentation
- Comprehensive README with usage examples
- API reference documentation
- Contributing guidelines
- TypeScript examples for all functions

### Technical Details

#### Dependencies
- `effect` ^3.18.2 - Core Effect framework
- `@effect/schema` ^0.75.5 - Runtime validation
- `@effect/platform` ^0.90.10 - Platform abstractions
- `@effect/platform-node` ^0.94.2 - Node.js integration

#### Architecture
- Pure functional architecture with Effect-TS
- Zero runtime dependencies beyond Effect ecosystem
- Effect-native error handling with tagged errors
- Layer-based dependency injection support

#### Testing
- 148 passing unit tests
- Coverage across all core functions
- Vitest test framework
- Effect-based test utilities

### Features by Category

#### Pattern Discovery
- Full-text search across title, summary, and content
- Filter by skill level (beginner, intermediate, advanced)
- Filter by use case categories (Error Management, Concurrency, etc.)
- Filter by tags
- Result limiting and pagination support
- Case-insensitive search

#### Code Generation
- Template-based snippet generation
- Custom function name substitution
- Custom input code injection
- ESM and CommonJS module support
- Import statement generation
- Type-safe template rendering

#### Data Validation
- Schema-based validation for all inputs
- Runtime type checking
- Graceful error handling for invalid data
- JSON parsing with error recovery
- File system error handling

### Security
- Input sanitization for XSS prevention
- No code execution (templates only)
- Safe JSON parsing
- Validated file paths
- No dependency vulnerabilities

### Performance
- In-memory pattern caching via Effect.Ref
- Efficient search algorithms
- Lazy evaluation with Effect
- Zero-copy JSON parsing
- Minimal bundle size (~20KB minified)

### Breaking Changes

None - Initial release

### Migration Guide

Not applicable - Initial release

### Known Issues

None

### Deprecations

None

### Internal Changes

- TypeScript compilation target: ES2022
- Module format: ESM with CommonJS support
- Build tool: Bun + TypeScript
- Test framework: Vitest
- Linter: Biome

---

## Future Releases

See [ROADMAP.md](../../ROADMAP.md) for planned features.

### [0.2.0] - Planned

Potential features:
- Pattern caching with TTL
- Fuzzy search support
- Pattern similarity matching
- Advanced filtering options
- Streaming results for large datasets
- Pattern relationship graph
- Pattern usage analytics

### [1.0.0] - Planned

Breaking changes for stable API:
- Finalize schema definitions
- Lock API surface
- Comprehensive documentation
- Production-ready guarantees

---

## Contributing

See [CONTRIBUTING.md](../../docs/guides/CONTRIBUTING.md) for guidelines on contributing to this project.

## License

MIT © Paul Philp
