# Reddit Announcement Posts

## For r/typescript

### Title
Effect Patterns Hub CLI v0.4.0 - Install Effect-TS coding rules into your AI tools (Cursor, Windsurf, etc.)

### Post Body

Hey r/typescript! 👋

I'm excited to share **Effect Patterns Hub CLI v0.4.0** - a production-ready CLI tool that brings Effect-TS best practices directly into your AI development workflow.

## 🎯 The Problem

AI coding assistants like Cursor, Windsurf, and GitHub Copilot are incredibly powerful, but they often struggle with Effect-TS patterns. They might suggest imperative code when you want functional composition, or miss opportunities to use Effect's powerful error handling.

## 💡 The Solution

The Effect Patterns Hub CLI lets you **install Effect-TS coding rules directly into your AI tool's configuration**. Once installed, your AI assistant understands Effect patterns and can help you write better Effect code.

## ✨ Key Features

### 🤖 AI Tool Integration

Install rules with a single command:

```bash
ep install add --tool cursor
```

**Supported tools:**
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
# Install only beginner-level patterns
ep install add --tool cursor --skill-level beginner

# Install only error-management patterns
ep install add --tool agents --use-case error-management

# Combine filters
ep install add --tool goose --skill-level intermediate --use-case concurrency
```

### 📦 Pattern Management

Create, validate, and test Effect-TS patterns:

```bash
ep pattern new              # Interactive wizard
ep admin validate           # Validate all patterns
ep admin test               # Test all examples
ep admin pipeline           # Run full pipeline
```

### 🚀 Release Automation

Built-in release management with conventional commits:

```bash
ep admin release preview    # Preview next release
ep admin release create     # Auto-version & changelog
```

## 📊 What's Included

- **88+ Effect-TS patterns** covering:
  - Error management (Option, Either, typed errors)
  - Resource management (Scope, acquire/release)
  - Concurrency (fibers, parallel, sequential)
  - Testing (Effect.gen, layers, mocking)
  - Services & dependency injection
  - Streams & data pipelines
  - And much more!

- **73 automated tests** (100% passing)
- **Comprehensive documentation** (5 detailed guides)
- **15 CLI commands** for complete workflow management

## 🏗️ Built With Effect

The CLI itself is built entirely with Effect and demonstrates real-world Effect patterns:

- **@effect/cli** - Type-safe, composable CLI framework
- **@effect/platform** - Cross-platform file system and HTTP
- **@effect/schema** - Runtime type validation
- **Effect** - Core functional effects

Key patterns demonstrated:
- Service layers and dependency injection
- Resource management with Scope
- Error handling with typed errors
- Effect composition and pipelines
- Testing with Effect.gen

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/PaulJPhilp/EffectPatterns.git
cd EffectPatterns

# Install dependencies
bun install

# Link CLI globally
bun link

# Verify installation
ep --version  # Should show 0.4.0

# Install rules into your AI tool
ep install add --tool cursor
```

That's it! Your AI assistant now understands Effect-TS patterns.

## 📚 Documentation

- **GitHub**: https://github.com/PaulJPhilp/EffectPatterns
- **Setup Guide**: https://github.com/PaulJPhilp/EffectPatterns/blob/main/SETUP.md
- **Testing Guide**: https://github.com/PaulJPhilp/EffectPatterns/blob/main/TESTING.md
- **Changelog**: https://github.com/PaulJPhilp/EffectPatterns/blob/main/CHANGELOG-CLI.md
- **Roadmap**: https://github.com/PaulJPhilp/EffectPatterns/blob/main/ROADMAP.md

## 🔮 What's Next

Planned features:
- npm/pnpm support (currently Bun only)
- Interactive rule selection with checkboxes
- Support for more AI tools (Codeium, Tabnine, etc.)
- Rule update notifications
- Pattern templates for quick starts

## 🙏 Feedback Welcome

I'd love to hear:
- What patterns you'd like to see added
- Which AI tools you use
- Ideas for new features
- Any issues you encounter

The codebase is open source and contributions are welcome!

---

**TL;DR**: CLI tool that installs Effect-TS coding rules into AI tools like Cursor, so your AI assistant understands Effect patterns. 88+ patterns, 73 tests, 100% passing. Built entirely with Effect.

**GitHub**: https://github.com/PaulJPhilp/EffectPatterns

---

## For r/functionalprogramming

### Title
Effect Patterns Hub CLI - Teach your AI assistant functional programming patterns (Effect-TS)

### Post Body

Hey r/functionalprogramming! 👋

I built a CLI tool that helps AI coding assistants understand functional programming patterns, specifically for Effect-TS (a TypeScript library for functional effect systems).

## 🎯 The Problem

AI assistants are great at imperative code, but often struggle with functional patterns. They might:
- Suggest imperative error handling instead of using algebraic data types
- Miss opportunities for composition
- Not understand effect systems and resource management
- Propose mutable state when immutable patterns would be better

## 💡 The Solution

**Effect Patterns Hub CLI** lets you install functional programming rules directly into your AI tool's configuration. It's like giving your AI assistant a functional programming education.

## 🧠 What It Teaches

The CLI includes **88+ patterns** covering:

**Algebraic Data Types:**
- Option for safe null handling
- Either for error handling
- Tagged unions for domain modeling

**Effect Systems:**
- Effect composition and pipelines
- Resource management with Scope
- Dependency injection with services
- Concurrent and parallel execution

**Functional Patterns:**
- Pure functions and referential transparency
- Immutable data structures
- Function composition
- Lazy evaluation
- Type-safe error handling

**Advanced Concepts:**
- Monad transformers
- Free monads
- Tagless final
- Streaming data pipelines

## ✨ Features

### Install Rules into AI Tools

```bash
ep install add --tool cursor
```

Supports: Cursor, Windsurf, VS Code, Goose, and more.

### Filter by Complexity

```bash
# Start with beginner patterns
ep install add --tool cursor --skill-level beginner

# Advanced patterns only
ep install add --tool cursor --skill-level advanced
```

### Filter by Domain

```bash
# Error handling patterns
ep install add --tool cursor --use-case error-management

# Concurrency patterns
ep install add --tool cursor --use-case concurrency
```

## 🏗️ Built Functionally

The CLI itself is a showcase of functional programming:

- **Pure functions** throughout
- **Immutable data structures**
- **Algebraic effects** for side effects
- **Type-safe error handling** (no exceptions)
- **Dependency injection** via service layers
- **Resource safety** with automatic cleanup

Built with:
- Effect (functional effect system)
- @effect/cli (composable CLI framework)
- @effect/schema (runtime type validation)
- @effect/platform (cross-platform effects)

## 📊 Real-World FP

This isn't just academic - it's production-ready:
- ✅ 73 automated tests (100% passing)
- ✅ Zero runtime exceptions (all errors typed)
- ✅ Automatic resource cleanup
- ✅ Type-safe throughout
- ✅ Composable and extensible

## 🚀 Quick Start

```bash
git clone https://github.com/PaulJPhilp/EffectPatterns.git
cd EffectPatterns
bun install
bun link
ep install add --tool cursor
```

Now your AI assistant understands functional patterns!

## 💭 Why This Matters

AI assistants are becoming essential development tools. Teaching them functional programming patterns means:

1. **Better code suggestions** - FP patterns instead of imperative hacks
2. **Safer code** - Type-safe error handling, no nulls
3. **More composable** - Suggestions that fit functional architectures
4. **Educational** - Learn FP patterns from AI suggestions

## 🔗 Links

- **GitHub**: https://github.com/PaulJPhilp/EffectPatterns
- **Documentation**: https://github.com/PaulJPhilp/EffectPatterns/blob/main/SETUP.md
- **Effect-TS**: https://effect.website

## 🙏 Feedback

Would love to hear from the FP community:
- What patterns should be added?
- How can we make this more useful?
- Ideas for other FP libraries (fp-ts, Ramda, etc.)?

The project is open source and contributions are welcome!

---

**TL;DR**: CLI that installs functional programming patterns into AI tools. Teaches your AI assistant about algebraic data types, effect systems, and FP best practices. Built with Effect-TS, 88+ patterns, production-ready.

**GitHub**: https://github.com/PaulJPhilp/EffectPatterns

---

## For r/programming (if cross-posting)

### Title
[Show] Effect Patterns Hub CLI - Install coding patterns into AI assistants

### Post Body

I built a CLI tool that installs coding patterns directly into AI development tools like Cursor and GitHub Copilot.

## The Idea

AI coding assistants are powerful but often don't understand library-specific patterns. This CLI bridges that gap by installing pattern libraries into your AI tool's configuration.

## What It Does

```bash
# Install Effect-TS patterns into Cursor
ep install add --tool cursor

# Filter by skill level
ep install add --tool cursor --skill-level beginner

# Filter by use case
ep install add --tool cursor --use-case error-management
```

## Current Features

- **88+ Effect-TS patterns** (functional TypeScript library)
- **10 AI tools supported** (Cursor, Windsurf, VS Code, etc.)
- **Smart filtering** by skill level and use case
- **Pattern management** (create, validate, test)
- **Release automation** with conventional commits

## Built With

- Effect-TS (functional effect system)
- TypeScript
- Bun runtime
- 73 automated tests (100% passing)

## Why This Matters

As AI assistants become essential dev tools, they need to understand the patterns and libraries we use. This is a first step toward making AI assistants library-aware.

## Future Plans

- Support for more libraries (React, Vue, etc.)
- npm/pnpm support (currently Bun only)
- Interactive pattern selection
- Community pattern contributions

## Links

- **GitHub**: https://github.com/PaulJPhilp/EffectPatterns
- **Docs**: https://github.com/PaulJPhilp/EffectPatterns/blob/main/SETUP.md

Open to feedback and contributions!

---

## Posting Tips

### For r/typescript
- **Flair**: Project / Show & Tell
- **Best time**: Tuesday-Thursday, 9-11 AM EST
- **Engage**: Respond to all comments within first 2 hours
- **Cross-post**: Can cross-post to r/node after 24 hours

### For r/functionalprogramming  
- **Flair**: Project / Discussion
- **Best time**: Weekday mornings
- **Engage**: Be ready for deep technical discussions
- **Tone**: Academic but accessible

### For r/programming
- **Flair**: [Show]
- **Best time**: Tuesday-Thursday, 8-10 AM EST
- **Note**: More competitive, needs strong hook
- **Engage**: Expect critical feedback, stay professional

### General Reddit Tips

1. **Title is crucial** - Make it clear and compelling
2. **First paragraph** - Hook readers immediately
3. **Format well** - Use headers, code blocks, bullet points
4. **TL;DR** - Always include at the end
5. **Respond quickly** - First 2 hours are critical
6. **Be humble** - "I built" not "Check out this amazing"
7. **No self-promotion** - Focus on value, not marketing
8. **Cross-posting** - Wait 24 hours between related subreddits
9. **Timing** - Avoid weekends, late nights
10. **Engage authentically** - Answer questions, take feedback seriously

### Response Templates

**If someone asks "Why Effect-TS?"**
```
Great question! Effect-TS is a functional effect system for TypeScript that provides:
- Type-safe error handling (no exceptions)
- Automatic resource management
- Dependency injection
- Concurrent/parallel execution
- Composable effects

It's like having Haskell's IO monad in TypeScript. The patterns are applicable beyond Effect too - many translate to other FP libraries.
```

**If someone asks "Does this work with [other tool]?"**
```
Currently supports 10 tools (Cursor, Windsurf, VS Code, etc.). Adding new tools is straightforward - it's just a matter of knowing where each tool reads its configuration.

If you use [tool], I'd be happy to add support! Just need to know:
1. Where it reads coding rules from
2. What format it expects

Feel free to open an issue or PR!
```

**If someone criticizes Bun-only support:**
```
You're absolutely right - npm/pnpm support is high priority on the roadmap. The CLI uses Bun for development speed, but there's no technical reason it can't support other runtimes.

Planning to add npm/pnpm support in the next release. Would you be interested in testing it when available?
```

**If someone asks about other languages:**
```
Great idea! The architecture is extensible. Currently focused on TypeScript/Effect-TS, but the pattern is:
1. Define patterns in a structured format
2. Inject into AI tool configs
3. AI reads and applies patterns

This could work for any language/library. If there's interest, I'd love to collaborate on expanding it!
```
