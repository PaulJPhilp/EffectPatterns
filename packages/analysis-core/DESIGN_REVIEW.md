# Design & Code Review: Analysis Core

## Overview
The `analysis-core` package provides transport-agnostic code analysis for Effect Patterns. It uses `Effect.Service` for architecture and composes multiple analyzers (Code, Consistency) and a Refactoring Engine.

## Strengths
- **Architecture**: The `Effect.Service` pattern is used correctly, allowing for excellent testability, composition, and error handling.
- **Separation of Concerns**: Rules, Detection, and Refactoring are separated into distinct services.
- **Transport Agnostic**: The core logic is decoupled from CLI/MCP, making it portable.
- **Refactoring Potential**: The `RefactoringEngine` usage of the TypeScript Compiler API (`applyWrapEffectMapCallback`) shows the right direction for robust code mods.

## Weaknesses & Risks

### 1. Reliance on Regular Expressions
The current implementation of `CodeAnalyzerService` and parts of `RefactoringEngine` relies heavily on `RegExp` for code detection.
- **Risk**: High rate of false positives (e.g., matching text in comments, string literals, or inactive code branches).
- **Risk**: Brittle matching (whitespace sensitivity, inability to handle aliased imports).
- **Impact**: Rules like `try-catch-in-effect` or `throw-in-effect-code` will trigger incorrectly on non-Effect code or safe contexts.

### 2. "Stringly" Typed Refactoring
Some refactorings (e.g., `replace-node-fs`) use `string.split().join()`.
- **Risk**: Accidental replacement of matching strings in content/comments.
- **Risk**: Inability to handle complex import specifiers (e.g., `import { x as y }`).

### 3. Limited Location/Range Precision
The `ruleIdToRange` function finds only the *first* occurrence using `firstRange`.
- **Impact**: If a file has 10 violations, only the first is reported. Fixing it reveals the next one, creating a frustrating "whack-a-mole" UX.
- **Impact**: `toLineCol` is a manual re-implementation of what TypeScript's `SourceFile.getLineAndCharacterOfPosition` does reliably.

### 4. Missing Type-Awareness
The analysis is currently syntactic (text-based).
- **Impact**: Cannot distinguish between `Effect.map` and `Array.map` reliably without checking imports or types.

### 5. DX / Testing
- **Coverage**: No dedicated tests exist for the rules.
- **Boilerplate**: Adding a new rule requires touching multiple files and manual regex entry.

## Recommendations

### Phase 1: High Value / Low Effort (Immediate)
1.  **Replace Regex with TypeScript AST**:
    - Use `ts.createSourceFile` to parse code into an AST.
    - Traverse the AST to find nodes (CallExpression, ThrowStatement, etc.).
    - Use `ts.SourceFile.getLineAndCharacterOfPosition` for accurate ranges.
    - **Benefit**: Eliminate false positives in comments/strings; find *all* occurrences, not just the first.
2.  **Add Unit Tests**:
    - Create a data-driven test suite where rules can be tested against code snippets (valid vs. invalid).
3.  **Standardize Refactoring**:
    - Move all refactorings to use `ts.transform` or a structured string manipulation based on AST nodes.

### Phase 2: Advanced (Future)
1.  **Project-Level Analysis**: Accept a `ts.Program` to allow type-checker access (e.g., "Is this variable actually an Effect type?").
2.  **TS-Morph**: Consider adopting `ts-morph` to simplify the verbose TS Compiler API code.

## Implementation Plan (DX Update)
1.  **Create `ASTUtils`**: A helper module to abstract common AST traversal tasks.
2.  **Refactor `CodeAnalyzerService`**: Switch detection strategy from `detectRuleIds` (regex) to an AST visitor pattern.
3.  **Add `CodeAnalyzer.test.ts`**: Verify rules against real code samples.
