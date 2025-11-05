# SM-CLI Interactive Dialog - Memory Management

## Overview

The `memories add` command now features an interactive dialog-based interface instead of command-line flags. This provides a more user-friendly experience for creating new memories.

## Usage

### Basic Command
```bash
$ memories add
```

### Interactive Workflow

The command walks you through creating a memory step-by-step:

#### 1. Title Prompt
```
╔═══════════════════════════════╗
║  Create New Memory             ║
╚═══════════════════════════════╝

Memory Title: My Effect Pattern Guide
```

#### 2. Memory Type Selection
```
Memory Type:
  1. pattern_note
  2. reference
  3. learning
  4. other
Choose (1-4): 1
```

#### 3. Content Input (Multiline)
```
Memory Content:
(Type END on a new line to finish)
This is a comprehensive guide to Effect patterns.
It covers the best practices and common pitfalls.
...
END
```

#### 4. Success Confirmation
```
╔════════════════════════════════════════╗
║ Memory Created                         ║
║ ID: KxCVZtv8Hgy2jF6YDjigmd           ║
╚════════════════════════════════════════╝

┌─────────────────────────────────────────┐
│ Memory ID → KxCVZtv8Hgy2jF6YDjigmd     │
│ Title     → My Effect Pattern Guide    │
│ Type      → pattern_note               │
│ Status    → Created ✓                  │
└─────────────────────────────────────────┘
```

## Dialog Components

### `prompt(question: string): Effect<string>`
Simple text input prompt
```
title = await prompt("Memory Title")
```

### `promptChoice(question: string, options: string[]): Effect<string>`
Choose from predefined options
```
type = await promptChoice("Memory Type", ["pattern_note", "reference", "learning", "other"])
```

### `promptMultiline(question: string): Effect<string>`
Multi-line text input (type 'END' to finish)
```
content = await promptMultiline("Memory Content")
```

### `promptConfirm(question: string): Effect<boolean>`
Yes/No confirmation
```
confirmed = await promptConfirm("Are you sure?")
```

## Features

✅ **No External Dependencies**
- Uses Node.js built-in `readline` module
- Works with any terminal that supports TTY

✅ **Effect-TS Integration**
- All prompts return `Effect<T>` for functional composition
- Proper error handling with typed errors
- Composable with other Effect operations

✅ **Input Validation**
- Title cannot be empty
- Content cannot be empty
- Type choices default to first option if invalid

✅ **Beautiful TUI Formatting**
- Cyan colored prompts
- Gray informational text
- Consistent styling with TUI formatter
- Formatted success messages with memory details

✅ **Terminal Detection**
- Auto-detects TTY for interactive mode
- Handles piped input gracefully
- Works with both interactive terminals and scripts

## Architecture

### Dialog Service (`src/services/dialog.ts`)
- Pure Effect-TS wrappers around readline
- No side effects outside of Effect runtime
- Reusable for other CLI commands

### Add Command (`src/commands/memories.ts`)
- Orchestrates dialog flow
- Validates user input
- Integrates with Supermemory service
- Provides beautiful output formatting

## Memory Type Options

The predefined memory types help organize your memories:

| Type | Use Case |
|------|----------|
| **pattern_note** | Document Effect patterns and best practices |
| **reference** | Quick reference materials and links |
| **learning** | Learning notes and study materials |
| **other** | Miscellaneous memories |

## Future Enhancements

- [ ] Search within existing memories
- [ ] Edit existing memories interactively
- [ ] Delete memories with confirmation
- [ ] Batch import memories
- [ ] Custom memory type definitions
- [ ] Template-based memory creation

---

**Date**: 2025-11-04
**Status**: Production Ready ✅
