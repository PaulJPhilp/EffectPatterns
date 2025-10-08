# CLI Changelog

Summary of all changes made to the Effect Patterns Hub CLI.

## Version 0.4.0 - Production Release (October 2025)

### 🎉 Production-Ready Release

The Effect Patterns Hub CLI is now production-ready with comprehensive testing, documentation, and full feature set.

### ✨ Improvements

**Testing**
- All 73 automated tests passing (100% pass rate)
- Fixed server unavailable test handling
- Improved error message assertions
- Full integration test coverage

**Documentation**
- Added CLI section to main README.md
- Created RELEASE-ANNOUNCEMENT.md
- Created RELEASE-CHECKLIST.md
- Created RELEASE-SUMMARY.md
- Created QUICK-RELEASE-GUIDE.md
- All documentation verified and up-to-date

**Version Management**
- Synced CLI version with package.json
- Consistent version reporting across all commands

### 📊 Statistics

- **Commands**: 15 total commands
- **Supported Tools**: 10 AI development tools
- **Test Coverage**: 73 tests, 100% passing
- **Documentation**: 5 comprehensive guides
- **Patterns**: 88+ Effect-TS patterns

### 🚀 Ready for Production

This release marks the CLI as production-ready with:
- Comprehensive test coverage
- Complete documentation
- Stable command structure
- Reliable error handling
- Full feature set

---

## Version 0.2.0 - CLI Release (2025)

### 🎉 Major Changes

#### Command Structure Reorganization
- Renamed `rules` command to `install` for clarity
- Grouped administrative commands under `admin` namespace
- New top-level structure:
  - `ep pattern` - User commands for creating patterns
  - `ep install` - Install rules into AI tools
  - `ep admin` - Administrative repository management

#### New Features

**1. Install Command with Filtering**
- `ep install add --tool <name>` - Install rules into AI tool configurations
- `ep install list` - List all supported tools and their file paths
- New filtering options:
  - `--skill-level <level>` - Filter rules by difficulty (beginner, intermediate, advanced)
  - `--use-case <category>` - Filter rules by category (error-management, core-concepts, etc.)
- Filters can be combined for precise rule selection

**2. Supported AI Tools (10 total)**
- Cursor IDE (`.cursor/rules.md`)
- Windsurf IDE (`.windsurf/rules.md`)
- VS Code / Continue.dev (`.vscode/rules.md`)
- Goose AI (`.goosehints`)
- Kilo IDE (`.kilo/rules.md`)
- Kira IDE (`.kira/rules.md`)
- Trae IDE (`.trae/rules.md`)
- AGENTS.md standard (`AGENTS.md`)
- Gemini AI (`GEMINI.md`)
- Claude AI (`CLAUDE.md`)

**3. Global CLI Installation**
- Added `bin` entry in package.json
- Users can now run `ep` directly after `bun link`
- No need for `bun run` prefix

**4. Enhanced UX**
- Progress indicators with `ora` library
- TTY-aware spinners (auto-disable in CI/CD)
- `--verbose` flags on all long-running commands
- Improved error messages with actionable guidance
- Server health checks before API calls
- Helpful examples in error messages

**5. Comprehensive Test Suite**
- 60 automated tests covering all CLI functionality
- Integration tests with Pattern Server
- Command structure validation
- Error handling tests
- File operations tests
- 100% test pass rate

### 📦 New Commands

```bash
# Installation Commands
ep install list                                           # List all tools
ep install add --tool <name>                              # Install all rules
ep install add --tool <name> --skill-level <level>        # Filter by level
ep install add --tool <name> --use-case <category>        # Filter by category

# Pattern Commands
ep pattern new                                            # Create new pattern

# Admin Commands
ep admin validate [--verbose]                             # Validate patterns
ep admin test [--verbose]                                 # Run tests
ep admin pipeline [--verbose]                             # Full pipeline
ep admin generate [--verbose]                             # Generate README
ep admin rules generate [--verbose]                       # Generate AI rules
ep admin release preview                                  # Preview release
ep admin release create                                   # Create release
```

### 🔄 Command Changes

**Before:**
```bash
bun run ep rules add --tool cursor
bun run ep validate
bun run ep test
bun run ep generate
```

**After:**
```bash
ep install add --tool cursor
ep admin validate
ep admin test
ep admin generate
```

### 🗑️ Temporarily Disabled

The following commands are temporarily disabled but preserved for future re-enablement:
- `ep lint` - Effect-TS pattern linting
- `ep lint rules` - Show linting rules
- `ep init` - Initialize configuration

### 📚 Documentation

**New Documentation:**
- `SETUP.md` - Complete setup and usage guide
- `TESTING.md` - Comprehensive testing documentation
- Updated `README.md` - Quick start guide
- Command help text on all commands

**Key Documentation Sections:**
- Installation instructions with `bun link`
- Filtering rules by skill level and use case
- All 10 supported tools with file paths
- Troubleshooting guide
- Common commands reference
- Testing guide with examples

### 🧪 Testing

**Test Coverage:**
- Help and version commands (4 tests)
- Error handling (2 tests)
- Install commands (29 tests)
- Pattern commands (2 tests)
- Admin commands (14 tests)
- Command structure (3 tests)
- Integration workflows (2 tests)
- Detailed install tests (18 tests)

**Total: 60 tests, 100% passing**

Run tests with:
```bash
bun run test:cli
```

### 🛠️ Technical Improvements

**Dependencies Added:**
- `ora@9.0.0` - Terminal spinners and progress indicators

**Code Quality:**
- Type-safe command definitions with `@effect/cli`
- Effect-TS patterns throughout
- Proper error handling with typed errors
- Server health checks before API calls
- Managed block replacement in target files
- File system safety checks

**Error Handling:**
- Proactive server health checks
- Detailed error messages with fix instructions
- Server URL configuration support
- Graceful degradation in non-TTY environments

### 📋 Breaking Changes

1. **Command Rename:** `rules add` → `install add`
   - Update any scripts using the old command

2. **Command Reorganization:** Admin commands now under `admin` namespace
   - `ep validate` → `ep admin validate`
   - `ep test` → `ep admin test`
   - `ep generate` → `ep admin generate`
   - `ep rules generate` → `ep admin rules generate`

3. **Global Installation Required:** Users must run `bun link` to use `ep` command
   - Previous: `bun run ep <command>`
   - Now: `ep <command>` (after `bun link`)

### 🔮 Future Enhancements

Planned for future releases:
- **npm/pnpm support** - Allow users to install and run with npm/pnpm in addition to Bun
- Re-enable Effect-TS linter commands
- Interactive rule selection with checkboxes
- Support for more AI tools (Codeium, etc.)
- Rule update notifications
- Diff view for rule updates
- Rollback functionality

### 📊 Statistics

- **Commands:** 15 total commands
- **Supported Tools:** 10
- **Test Coverage:** 60 tests
- **Documentation:** 4 comprehensive guides
- **Lines of Code:** ~2,500 in ep.ts

### 🙏 Migration Guide

**For Users:**
```bash
# 1. Pull latest changes
git pull

# 2. Install dependencies
bun install

# 3. Link CLI globally
bun link

# 4. Verify installation
ep --help

# 5. Update your command usage
# Old: bun run ep rules add --tool cursor
# New: ep install add --tool cursor
```

**For CI/CD:**
```yaml
# Update your workflows
- name: Validate patterns
  run: ep admin validate

- name: Run tests
  run: ep admin test

- name: Generate docs
  run: ep admin generate
```

### 📝 Examples

**Basic Installation:**
```bash
# Install all rules to Cursor
ep install add --tool cursor

# Install beginner rules only
ep install add --tool cursor --skill-level beginner

# Install error-management rules
ep install add --tool agents --use-case error-management

# Combine filters
ep install add --tool goose --skill-level intermediate --use-case concurrency
```

**Development Workflow:**
```bash
# Create new pattern
ep pattern new

# Validate changes
ep admin validate

# Run tests
ep admin test

# Generate docs
ep admin generate

# Preview release
ep admin release preview

# Create release
ep admin release create
```

### ✅ Checklist for Users

After upgrading to this version:

- [ ] Run `bun install` to get latest dependencies
- [ ] Run `bun link` to enable global `ep` command
- [ ] Update any scripts using old command names
- [ ] Test `ep --help` to verify installation
- [ ] Review new filtering options with `ep install --help`
- [ ] Update CI/CD workflows if applicable

---

For detailed information, see:
- [SETUP.md](./SETUP.md) - Complete setup guide
- [TESTING.md](./TESTING.md) - Testing documentation
- [README.md](./README.md) - Quick start guide
