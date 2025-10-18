# Effect Patterns Hub - Roadmap

Future enhancements and planned features for the Effect Patterns Hub CLI and infrastructure.

## High Priority

### Package Manager Support
**Status:** Planned
**Priority:** High
**Description:** Add support for npm and pnpm in addition to Bun

**Tasks:**
- [ ] Add npm/pnpm installation instructions
- [ ] Test CLI with `npm link` and `pnpm link`
- [ ] Update shebang to support node runtime
- [ ] Add `engines` field to package.json
- [ ] Test all commands with node runtime
- [ ] Update documentation for multi-package-manager support
- [ ] Add CI/CD tests for npm and pnpm

**Considerations:**
- Keep Bun as recommended/default
- Ensure all Effect-TS code works with Node.js
- May need different lock files (package-lock.json, pnpm-lock.yaml)
- Performance differences between runtimes

### Re-enable Effect-TS Linter
**Status:** In Progress (Disabled)
**Priority:** High
**Description:** Re-enable the custom Effect-TS linting commands

**Tasks:**
- [ ] Review and update linter rules
- [ ] Test linter with current patterns
- [ ] Update documentation
- [ ] Remove `if (false)` wrapper from linter commands
- [ ] Add linter to CI/CD pipeline

**Linter Rules:**
1. `effect-use-taperror` - Use Effect.tapError for logging
2. `effect-explicit-concurrency` - Require concurrency option
3. `effect-deprecated-api` - Detect deprecated APIs
4. `effect-prefer-pipe` - Suggest pipe for long chains
5. `effect-stream-memory` - Catch non-streaming operations
6. `effect-error-model` - Suggest typed errors

## Medium Priority

### Interactive Rule Selection
**Status:** Planned
**Priority:** Medium
**Description:** Add interactive checkbox UI for selecting specific rules to install

**Tasks:**
- [ ] Add `@inquirer/prompts` or similar library
- [ ] Create interactive mode for `install add`
- [ ] Show rules with categories and descriptions
- [ ] Support multi-select with space bar
- [ ] Add search/filter within interactive mode
- [ ] Add `--interactive` flag

**Example:**
```bash
ep install add --tool cursor --interactive

? Select rules to install: (Use arrow keys and space to select)
◯ Error Recovery Pattern (error-management, beginner)
◉ Concurrency Control (concurrency, intermediate)
◯ Resource Management (resource-management, advanced)
```

### Additional AI Tool Support
**Status:** Planned
**Priority:** Medium
**Description:** Add support for more AI development tools

**Tools to Add:**
- [ ] Codeium
- [ ] Tabnine
- [ ] GitHub Copilot (if configuration file support exists)
- [ ] Replit AI
- [ ] Pieces

### Rule Update Notifications
**Status:** Planned
**Priority:** Medium
**Description:** Notify users when new rules are available

**Tasks:**
- [ ] Add version tracking to installed rules
- [ ] Create `ep install check` command to check for updates
- [ ] Show diff of changes when updating
- [ ] Add `ep install update` command to update existing rules
- [ ] Optional: Add auto-update flag

### Rule Management Commands
**Status:** Planned
**Priority:** Medium
**Description:** Better management of installed rules

**New Commands:**
- [ ] `ep install remove --tool <name>` - Remove installed rules
- [ ] `ep install status` - Show which tools have rules installed
- [ ] `ep install diff --tool <name>` - Show what would change
- [ ] `ep install backup` - Backup existing rules before update
- [ ] `ep install rollback` - Rollback to previous version

## Low Priority

### Pattern Templates
**Status:** Planned
**Priority:** Low
**Description:** Add templates for common pattern types

**Tasks:**
- [ ] Create template system
- [ ] Add templates for common patterns
- [ ] `ep pattern new --template <name>`
- [ ] Templates: beginner, error-handling, resource, concurrency, testing

### Pattern Validation Improvements
**Status:** Planned
**Priority:** Low
**Description:** More comprehensive pattern validation

**Tasks:**
- [ ] Validate code examples actually demonstrate the pattern
- [ ] Check for broken Effect-TS API usage
- [ ] Validate frontmatter against schema
- [ ] Suggest improvements to pattern descriptions
- [ ] Check for common anti-patterns

### Documentation Generator
**Status:** Planned
**Priority:** Low
**Description:** Generate better documentation from patterns

**Tasks:**
- [ ] Generate API reference from patterns
- [ ] Create searchable pattern index
- [ ] Generate pattern dependency graph
- [ ] Create learning paths (beginner → advanced)

### Analytics and Metrics
**Status:** Planned
**Priority:** Low
**Description:** Track pattern usage and popularity

**Tasks:**
- [ ] Add optional analytics to installed rules
- [ ] Track which patterns are most commonly installed
- [ ] Show popular patterns in `ep install list`
- [ ] Community voting on patterns

## Ideas / Research

### Web UI
**Status:** Research
**Description:** Web interface for browsing patterns

**Considerations:**
- Pattern browsing with search
- Interactive examples
- Visual pattern relationships
- Integration with existing docs site

### VS Code Extension
**Status:** Research
**Description:** Native VS Code extension for patterns

**Features:**
- Inline pattern suggestions
- Quick access to pattern docs
- One-click pattern installation
- Pattern usage analytics

### Pattern Marketplace
**Status:** Research
**Description:** Community-contributed patterns

**Considerations:**
- Pattern submission workflow
- Review process
- Quality standards
- Versioning and updates

### AI-Powered Pattern Suggestions
**Status:** Research
**Description:** Suggest patterns based on code context

**Features:**
- Analyze user code
- Suggest relevant patterns
- Auto-apply pattern transformations
- Learn from user preferences

## Completed

### ✅ CLI Release (v0.2.0)
- [x] Command structure reorganization
- [x] Install command with filtering
- [x] Support for 10 AI tools
- [x] Global CLI installation
- [x] Progress indicators and UX improvements
- [x] Comprehensive test suite (60 tests)
- [x] Documentation (README, SETUP, TESTING)

## Contributing

Want to work on any of these features?

1. Check if there's an existing issue
2. Comment on the issue or create one
3. Fork the repository
4. Create a feature branch
5. Submit a pull request

See [CONTRIBUTING](./docs/guides/CONTRIBUTING.md) for details.

## Feedback

Have ideas for new features? Create an issue with the `enhancement` label:
https://github.com/patrady/effect-patterns/issues/new
