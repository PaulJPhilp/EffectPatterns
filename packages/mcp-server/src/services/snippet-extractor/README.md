# Snippet Extractor Service

Extract code snippets with context around issues.

## Overview

The `SnippetExtractorService` extracts portions of source code showing the problematic lines with before/after context for clear issue visualization.

## API

### Methods

#### `extract(finding: Finding, source: string, contextLines?: number): Effect<CodeSnippet>`

Extract a code snippet centered on a finding.

```typescript
const snippet = yield* extractor.extract(
  {
    id: "finding-1",
    range: { startLine: 15, endLine: 15, startChar: 0, endChar: 20 },
    message: "Generic error type",
    ruleId: "errors/generic",
    severity: "high"
  },
  sourceCode,
  2  // Show 2 lines before and after
);

console.log("Before context:", snippet.beforeContext);
console.log("Target lines:", snippet.targetLines);
console.log("After context:", snippet.afterContext);
```

#### `extractFromInput(input: ExtractSnippetInput): Effect<CodeSnippet>`

Extract from structured input.

```typescript
const snippet = yield* extractor.extractFromInput({
  finding: { ... },
  source: sourceCode,
  contextLines: 2
});
```

## Snippet Structure

Returns the problematic code in context:

```typescript
interface CodeSnippet {
  beforeContext: readonly string[];   // Lines before issue
  targetLines: readonly string[];     // The problematic lines
  afterContext: readonly string[];    // Lines after issue
  startLine: number;                  // 1-based line number
  endLine: number;                    // 1-based line number
}
```

## Context Management

- **Default context**: 2 lines before/after
- **Auto-trimming**: If total > 15 lines, reduces to 1 line each side
- **Boundary handling**: Respects file start/end

## Example

```typescript
import { Effect } from "effect";
import { SnippetExtractorService } from "./services/snippet-extractor";

const program = Effect.gen(function* () {
  const extractor = yield* SnippetExtractorService;
  
  const snippet = yield* extractor.extract(
    finding,
    sourceCode,
    3  // Show 3 lines of context
  );
  
  // Display in markdown
  console.log("```typescript");
  snippet.beforeContext.forEach(line => console.log(line));
  console.log("// ⬇️ ISSUE HERE:");
  snippet.targetLines.forEach(line => console.log(line));
  snippet.afterContext.forEach(line => console.log(line));
  console.log("```");
  
  console.log(
    `_Lines ${snippet.startLine}-${snippet.endLine}_`
  );
});

Effect.runPromise(program);
```

## Formatted Output

Perfect for markdown/HTML display:

```typescript
const formatSnippet = (s: CodeSnippet) => {
  const lines = [
    "```typescript",
    ...s.beforeContext,
    "// ⬇️ Issue here:",
    ...s.targetLines,
    ...s.afterContext,
    "```",
    `_Lines ${s.startLine}-${s.endLine}_`
  ];
  return lines.join("\n");
};
```

## Configuration

Snippet extraction uses defaults:

```typescript
export const DEFAULT_SNIPPET_CONFIG: SnippetConfig = {
  defaultContextLines: 2,        // Lines before/after
  maxSnippetLines: 15,           // Max total lines
  minContextLinesWhenTrimming: 1 // Min when over limit
};
```

## Types

```typescript
interface CodeSnippet {
  readonly beforeContext: readonly string[];
  readonly targetLines: readonly string[];
  readonly afterContext: readonly string[];
  readonly startLine: number;
  readonly endLine: number;
}

interface ExtractSnippetInput {
  readonly finding: Finding;
  readonly source: string;
  readonly contextLines?: number;
}

interface SnippetConfig {
  readonly defaultContextLines: number;
  readonly maxSnippetLines: number;
  readonly minContextLinesWhenTrimming: number;
}
```

## Testing

Run snippet extractor tests:
```bash
bun run test src/services/snippet-extractor/__tests__
```

## See Also

- [Code Review Service](../review-code) - Uses snippets in recommendations
- [Finding Schemas](../../tools/schemas) - Finding type
