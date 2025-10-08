# Effect Patterns Hub CLI - Release Announcement

## 🎉 Announcing the Effect Patterns Hub CLI

We're excited to announce the official release of the Effect Patterns Hub CLI - a powerful command-line tool that brings Effect-TS best practices directly into your AI development workflow!

## What is it?

The Effect Patterns Hub CLI (`ep`) is a comprehensive tool that:

- **Installs coding rules** into 10 popular AI development tools
- **Manages Effect-TS patterns** with validation and testing
- **Automates releases** with conventional commits and changelog generation
- **Provides smart filtering** by skill level and use case

## Key Features

### 🤖 AI Tool Integration

Install Effect-TS coding rules directly into your favorite AI tools:

```bash
ep install add --tool cursor
```

**Supported Tools:**
- Cursor IDE
- Windsurf IDE
- VS Code / Continue.dev
- Goose AI
- Kilo, Kira, Trae IDEs
- AGENTS.md standard
- Gemini AI
- Claude AI

### 🎯 Smart Filtering

Filter rules by skill level or use case:

```bash
# Install only beginner-level rules
ep install add --tool cursor --skill-level beginner

# Install only error-management rules
ep install add --tool agents --use-case error-management

# Combine filters
ep install add --tool goose --skill-level intermediate --use-case concurrency
```

### 📦 Pattern Management

Create, validate, and test Effect-TS patterns:

```bash
# Create new pattern with interactive wizard
ep pattern new

# Validate all patterns
ep admin validate

# Test all examples
ep admin test

# Run full pipeline
ep admin pipeline
```

### 🚀 Release Management

Automated versioning with conventional commits:

```bash
# Preview next release
ep admin release preview

# Create release with automatic versioning
ep admin release create
```

## Installation

### Prerequisites

- **Bun** v1.0+ ([Install Bun](https://bun.sh))
- **Git**

### Quick Start

```bash
# Clone the repository
git clone https://github.com/patrady/effect-patterns.git
cd effect-patterns

# Install dependencies
bun install

# Link CLI globally
bun link

# Verify installation
ep --help

# Install rules into your AI tool
ep install add --tool cursor
```

## Documentation

Comprehensive documentation is available:

- **[README.md](./README.md)** - Overview and pattern catalog
- **[SETUP.md](./SETUP.md)** - Complete setup and usage guide
- **[TESTING.md](./TESTING.md)** - Testing documentation
- **[CHANGELOG-CLI.md](./CHANGELOG-CLI.md)** - Detailed changelog
- **[ROADMAP.md](./ROADMAP.md)** - Planned features

## Testing

The CLI includes comprehensive test coverage:

- **73 automated tests** covering all functionality
- **100% test pass rate**
- Integration tests with Pattern Server
- Command structure validation
- Error handling tests

Run tests with:
```bash
bun run test:cli
```

## What's Next?

See our [ROADMAP.md](./ROADMAP.md) for planned features:

- **npm/pnpm support** - Use with npm or pnpm in addition to Bun
- **Interactive rule selection** - Choose specific rules with checkboxes
- **More AI tools** - Codeium, Tabnine, and more
- **Rule update notifications** - Get notified when new rules are available
- **Pattern templates** - Quick-start templates for common patterns

## Contributing

We welcome contributions! Here's how to get started:

1. Check existing issues or create a new one
2. Fork the repository
3. Create a feature branch
4. Submit a pull request

See the main [README.md](./README.md) for contribution guidelines.

## Community

- **GitHub Issues**: https://github.com/patrady/effect-patterns/issues
- **Discussions**: https://github.com/patrady/effect-patterns/discussions

## Statistics

- **Commands**: 15 total commands
- **Supported Tools**: 10
- **Test Coverage**: 73 tests
- **Documentation**: 5 comprehensive guides
- **Patterns**: 88+ Effect-TS patterns

## Example Workflow

Here's a typical workflow using the CLI:

```bash
# 1. Install rules into Cursor IDE
ep install add --tool cursor

# 2. Create a new pattern
ep pattern new

# 3. Validate your pattern
ep admin validate

# 4. Test the example code
ep admin test

# 5. Generate updated README
ep admin generate

# 6. Preview release
ep admin release preview

# 7. Create release
ep admin release create
```

## Feedback

We'd love to hear from you! Please:

- ⭐ Star the repository if you find it useful
- 🐛 Report bugs via GitHub Issues
- 💡 Suggest features in GitHub Discussions
- 📝 Contribute patterns or improvements

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

Built with:
- [Effect-TS](https://effect.website/) - The Effect ecosystem
- [@effect/cli](https://effect.website/docs/cli) - CLI framework
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [Vitest](https://vitest.dev/) - Testing framework

---

**Get started today:**

```bash
git clone https://github.com/patrady/effect-patterns.git
cd effect-patterns
bun install
bun link
ep install add --tool cursor
```

Happy coding with Effect! 🚀
