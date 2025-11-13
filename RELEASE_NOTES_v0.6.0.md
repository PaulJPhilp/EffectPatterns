# Release Notes - v0.6.0

**Release Date:** November 13, 2025

## 🎉 Major Features

### Standalone CLI Package
The `ep` CLI is now available as a standalone npm package (`@effect-patterns/cli`), allowing users to install it globally without cloning the repository.

**Installation:**
```bash
bun install -g @effect-patterns/cli
# or
npm install -g @effect-patterns/cli
```

**Usage from anywhere:**
```bash
ep search "error handling"
ep install add --tool cursor
ep list --skill-level intermediate
```

### Automatic Project Root Resolution
The CLI now automatically detects the Effect-Patterns project root, enabling seamless usage from any directory.

## 🐛 Bug Fixes

- **#107**: Fixed CLI installation issue - users can now install globally without errors
- Updated documentation with correct installation instructions

## 📦 Dependencies Updated

- `@ai-sdk/openai` 2.0.64 → 2.0.65
- `@biomejs/biome` 2.3.4 → 2.3.5
- `@effect/language-service` 0.55.3 → 0.55.4
- `@types/node` 22.19.0 → 22.19.1
- `@typescript-eslint/eslint-plugin` 8.46.3 → 8.46.4
- `@typescript-eslint/parser` 8.46.3 → 8.46.4
- `@vercel/node` 5.5.5 → 5.5.6
- `ai` 5.0.90 → 5.0.93
- `turbo` 2.6.0 → 2.6.1
- `@effect/platform` 0.93.0 → 0.93.1
- `js-yaml` 4.1.0 → 4.1.1
- `vercel` 48.9.0 → 48.9.2

## 📚 Documentation

- Updated ABOUT.md with new CLI installation instructions
- Added comprehensive README for @effect-patterns/cli package

## 🔧 Technical Changes

- Extracted CLI into standalone package structure
- Added TypeScript configuration for CLI package
- Implemented PROJECT_ROOT resolution for cross-directory usage
- All path references updated to support global installation

## Upgrade Guide

### For CLI Users

If you have the repository cloned and were using `bun run ep`, you can now:

1. Install globally:
   ```bash
   bun install -g @effect-patterns/cli
   ```

2. Use from any directory:
   ```bash
   ep --version
   ```

### For Developers

Local development mode still works:
```bash
bun run ep search "patterns"
```

## Links

- [GitHub Release](https://github.com/PaulJPhilp/EffectPatterns/releases/tag/v0.6.0)
- [CLI Package](https://www.npmjs.com/package/@effect-patterns/cli)
- [Documentation](https://github.com/PaulJPhilp/EffectPatterns)
