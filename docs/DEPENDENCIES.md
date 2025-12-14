# Dependencies

Complete reference of all project dependencies and their purposes.

---

## Core Dependencies

### Effect-TS Ecosystem

| Package | Version | Purpose |
|---------|---------|---------|
| `effect` | 3.18+ | Core Effect-TS framework |
| `@effect/schema` | Latest | Runtime validation and schema management |
| `@effect/cli` | Latest | CLI framework for command parsing |
| `@effect/platform` | Latest | Platform abstractions (file, network, etc.) |
| `@effect/platform-node` | Latest | Node.js specific platform integrations |
| `@effect/ai` | Latest | AI integrations and utilities |

### Build & Development

| Package | Version | Purpose |
|---------|---------|---------|
| `bun` | 1.0+ | JavaScript runtime (recommended) |
| `typescript` | 5.8+ | Type checking and compilation |
| `@biomejs/biome` | Latest | Fast linter and formatter |
| `vitest` | Latest | Testing framework |
| `tsx` | Latest | TypeScript execution in Node.js |

### Web Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.3+ | React framework for web apps |
| `react` | 19.0+ | UI library |
| `react-dom` | 19.0+ | React DOM rendering |
| `tailwindcss` | Latest | CSS utility framework |

### Data & Validation

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | Latest | Schema validation (minimal use) |

### Observability

| Package | Version | Purpose |
|---------|---------|---------|
| `@opentelemetry/sdk-node` | Latest | OpenTelemetry Node.js SDK |
| `@opentelemetry/exporter-trace-otlp-http` | Latest | OTLP HTTP exporter |
| `@opentelemetry/resources` | Latest | Resource management |
| `@opentelemetry/semantic-conventions` | Latest | Standard observability conventions |
| `@opentelemetry/instrumentation-http` | Latest | HTTP tracing |
| `@opentelemetry/instrumentation-fs` | Latest | File system tracing |

### Discord Integration

| Package | Version | Purpose |
|---------|---------|---------|
| `discord.js` | Latest | Discord bot framework (if used) |

### AI & LLM

| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-sdk/sdk` | Latest | Anthropic Claude API |
| `langgraph` | Latest | Agentic workflow orchestration |

---

## Development Dependencies

### Testing

| Package | Purpose |
|---------|---------|
| `@vitest/ui` | UI for test results |
| `@testing-library/react` | React component testing |
| `@testing-library/jest-dom` | DOM matchers |

### Type Checking

| Package | Purpose |
|---------|---------|
| `@types/node` | Node.js type definitions |
| `@types/bun` | Bun type definitions |

### Code Quality

| Package | Purpose |
|---------|---------|
| `eslint` | Code linting (if used) |
| `prettier` | Code formatting (if used with Biome) |

### Build Tools

| Package | Purpose |
|---------|---------|
| `tsup` | TypeScript bundler (if used) |
| `vite` | Build tool (if used) |

---

## Monorepo Workspace Dependencies

### Root Dependencies

All dependencies are defined at root `package.json` and hoisted via Bun workspaces.

**Primary packages:**
- `effect`, `@effect/schema`, `@effect/cli`, `@effect/platform`
- `typescript`, `@biomejs/biome`, `vitest`, `tsx`

### App Workspace Dependencies

**`app/code-assistant/`:**
- `next`, `react`, `react-dom`, `tailwindcss`
- `@anthropic-sdk/sdk` (for Claude integration)
- `@effect-patterns/toolkit` (local package)
- Database libraries: Neon PostgreSQL driver

**`app/chat-assistant/`:**
- `next`, `react`, `react-dom`, `tailwindcss`
- `@effect-patterns/toolkit` (local package)
- Supermemory API client (if integrated)

**`app/web/`:**
- `next`, `react`, `react-dom`, `tailwindcss`
- `@effect-patterns/toolkit` (local package)

### Local Packages

**`packages/toolkit/`:**
- `effect`, `@effect/schema`
- Core Effect ecosystem

**`packages/ep-cli/`:**
- `effect`, `@effect/cli`
- CLI specific libraries

**`packages/ep-admin/`:**
- `effect`, `@effect/cli`
- Admin CLI libraries

**`packages/effect-discord/`:**
- `effect`, `@effect/platform`, `@effect/platform-node`
- Discord-specific: Discord.js or similar

**`packages/design-system/`:**
- `react`, `tailwindcss`
- UI component library

**`packages/shared/`:**
- Common types and utilities
- No external dependencies (pure TypeScript)

**`packages/cli/`:**
- Shared CLI utilities
- `effect`, `@effect/cli`

---

## Installation

### Full Installation

```bash
# Install all dependencies for all workspaces
bun install
```

### Single Package Installation

```bash
# Install dependencies for specific workspace
cd packages/toolkit
bun install

# Or from root with filter
bun install --filter toolkit
```

### Add Dependency

```bash
# Add to root (shared by all workspaces)
bun add lodash

# Add to specific workspace
bun add -W packages/toolkit typescript

# Add as dev dependency
bun add --save-dev @types/node
```

### Update Dependencies

```bash
# Update all dependencies
bun update

# Update specific package
bun update effect

# Check for outdated packages
bun outdated
```

---

## Dependency Management

### Version Constraints

- **Exact versions** for critical dependencies (Effect, TypeScript)
- **Caret ranges** for stable libraries (^1.0.0)
- **Tilde ranges** for bug fixes only (~1.0.0)
- **`latest`** for frequently updated tools (Biome, etc.)

### Workspace Hoisting

Bun automatically hoists common dependencies:
- Dependencies used by multiple workspaces installed once
- Located at root `node_modules/`
- All workspaces can access them
- Reduces disk space and install time

### Lock File

**`bun.lock`**
- Generated automatically
- Tracks exact versions of all dependencies
- Should be committed to git
- Ensures deterministic installs across machines

---

## Security

### Vulnerability Scanning

```bash
# Check for known vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix
```

### Dependency Updates

- Automated Dependabot checks (GitHub)
- Weekly security scans
- Critical vulnerabilities trigger alerts

### Best Practices

1. Keep dependencies updated
2. Audit regularly: `bun audit`
3. Review major version upgrades
4. Test thoroughly after updates
5. Use lock file for reproducibility

---

## Troubleshooting

### Dependency Conflicts

```bash
# Clear cache and reinstall
rm -rf node_modules bun.lock
bun install
```

### Missing Types

```bash
# Install type definitions
bun add --save-dev @types/package-name
```

### Workspace Not Found

```bash
# Ensure package.json exists in workspace directory
# Check workspaces configuration in root package.json
cat package.json | grep -A 10 '"workspaces"'
```

### Version Mismatch

```bash
# Check what version is installed
bun list package-name

# Force specific version
bun add package-name@1.0.0
```

---

## Performance

### Install Time

- Full install: ~1-2 minutes (cached)
- Cached install: ~10-30 seconds

### Disk Space

- All dependencies: ~800MB (node_modules)
- Cache: ~200MB

### Optimization Tips

1. Use `bun install --frozen-lockfile` in CI
2. Cache `node_modules` in CI workflows
3. Use Bun's built-in bundler for app builds
4. Enable monorepo hoisting (automatic with Bun)

---

## Recommended Commands

```bash
# Daily development
bun install              # First time only
bun test                 # Run tests
bun run lint             # Check code quality
bun run typecheck        # Type checking

# Adding features
bun add package-name     # Add production dependency
bun add -D package-name  # Add dev dependency

# Maintenance
bun update               # Update all dependencies
npm audit                # Check security
bun run clean            # Clean build artifacts

# Workspaces
bun --filter toolkit test              # Test specific workspace
bun --filter '!toolkit' test           # Test all except toolkit
bun run -r build                       # Run build in all workspaces
```

---

## See Also

- [Architecture & Monorepo Structure](./ARCHITECTURE.md)
- [CI/CD & Deployment](./CI_CD.md)
