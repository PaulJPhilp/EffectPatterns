# Effect Patterns Plugin

A Claude Code plugin providing Effect-TS patterns, code generation, and search capabilities.

## Features

### 🔍 Commands

- `/search` - Search Effect patterns by keyword
- `/explain` - Get detailed explanations of Effect patterns (coming soon)

### 🎓 Bundled Skills

This plugin includes **24 Claude Code skills** covering Effect-TS patterns across all skill levels.

#### Categories

The skills cover comprehensive Effect-TS pattern categories:

- **Core Concepts** (49 patterns) - Fundamentals, pipes, generators, dependencies
- **Concurrency** (20 patterns) - Parallel execution, fibers, coordination primitives
- **Error Management** (15 patterns) - Error handling, retries, recovery strategies
- **Domain Modeling** (15 patterns) - Branded types, schemas, validation
- **Building Data Pipelines** (14 patterns) - Stream processing, transformations
- **Observability** (13 patterns) - Logging, tracing, metrics
- **Building APIs** (13 patterns) - HTTP servers, routing, middleware
- **Testing** (10 patterns) - Testing Effect applications
- **Making HTTP Requests** (10 patterns) - HTTP clients, retries, caching
- **Tooling and Debugging** (8 patterns) - Development tools, debugging techniques
- **Streams** (8 patterns) - Stream operations and patterns
- **Resource Management** (8 patterns) - Scoped resources, lifecycle management
- **Platform** (6 patterns) - Filesystem, commands, environment
- **Getting Started** (6 patterns) - First steps with Effect
- **Scheduling** (6 patterns) - Scheduled execution, periodic tasks
- Plus 9 more specialized categories...

#### Using Skills

Skills are automatically available after plugin installation. Claude will invoke them when relevant to your task.

**See available skills:**
```
/skills list
```

**Manually invoke a skill:**
```
/skill effect-patterns-error-handling
```

**Skills are context-aware:**
- Claude automatically selects relevant skills based on your task
- Progressive disclosure: only loads skills when needed
- Each skill contains beginner → intermediate → advanced patterns

### 🔧 MCP Server

The plugin connects to the Effect Patterns MCP server providing:

- Pattern search API
- Pattern details retrieval
- Code snippet generation

## Installation

### From Repository

```bash
# Clone or pull the repository
git clone https://github.com/PaulJPhilp/EffectPatterns
cd EffectPatterns

# Install in Claude Code
/plugin install .claude-plugin/plugins/effect-patterns
```

### Configuration

The plugin will connect to the MCP server at the configured endpoint. API key authentication is required for production use.

## For Contributors

### Regenerating Skills

Skills are generated from pattern files in `content/published/patterns/`. To regenerate after pattern updates:

```bash
bun run generate:skills
```

This will:
1. Read all patterns from `content/published/patterns/`
2. Group patterns by category (applicationPatternId)
3. Generate skills in both:
   - `content/published/skills/claude/` (gitignored artifacts)
   - `.claude-plugin/plugins/effect-patterns/skills/` (committed for distribution)

### Workflow

```bash
# 1. Edit patterns
vim content/published/patterns/error-management/handle-errors-with-catch.mdx

# 2. Regenerate skills
bun run generate:skills

# 3. Commit updated plugin skills
git add .claude-plugin/plugins/effect-patterns/skills/
git commit -m "Update error-handling skill with improved examples"

# 4. Push to distribute
git push
```

## Architecture

- **Plugin System**: Claude Code plugin architecture
- **Skills**: 24 auto-generated skills from pattern library
- **Commands**: Markdown-based slash commands
- **MCP Server**: HTTP-based Model Context Protocol server
- **Backend**: Next.js API on Vercel (for MCP endpoints)

## License

MIT
