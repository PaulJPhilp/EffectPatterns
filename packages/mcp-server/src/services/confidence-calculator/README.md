# Confidence Calculator Service

Confidence scoring for code findings.

## Overview

The `ConfidenceCalculatorService` calculates confidence levels (high/medium/low) for code findings based on detection method, code complexity, pattern specificity, and rule category.

## API

### Methods

#### `calculate(finding: Finding, sourceCode: string, rule: RuleDefinition): Effect<ConfidenceScore>`

Calculate confidence score for a finding.

```typescript
const score = yield* calculator.calculate(
  {
    id: "finding-1",
    range: { startLine: 5, endLine: 5, startChar: 0, endChar: 10 },
    message: "Generic error type",
    ruleId: "errors/generic-error",
    severity: "high"
  },
  sourceCode,
  {
    id: "errors/generic-error",
    name: "Avoid generic error",
    category: "errors",
    message: "Use domain-specific error types",
    enabled: true,
    severity: "high"
  }
);

console.log(score.level);    // "high", "medium", or "low"
console.log(score.score);    // 0.0 - 1.0
console.log(score.factors);  // ["AST-based detection", ...]
```

#### `calculateFromInput(input: CalculateConfidenceInput): Effect<ConfidenceScore>`

Calculate from structured input object.

```typescript
const score = yield* calculator.calculateFromInput({
  finding: { ... },
  sourceCode: "const x = 1;",
  rule: { ... }
});
```

## Scoring Factors

Confidence score (0.0 - 1.0) is calculated from:

### Base Score
- AST-based detection: **0.9** (very reliable)

### Complexity Penalty
- Nesting level: **-0.1** per level (max -0.3)
- Nested code is harder to analyze reliably

### Specificity Bonus
- Type patterns (Effect<>, Schema, Tagged): **+0.1**
- Very specific patterns (Promise.all, throw, console): **+0.1**
- Max bonus: **+0.2**

### Category Modifier
- High impact (errors, async, concurrency): **+0.1**
- Medium impact (validation, DI, resources): **+0.05**
- Low impact (style): **-0.1**

### Thresholds
- High confidence: **≥ 0.8**
- Medium confidence: **≥ 0.6**
- Low confidence: **< 0.6**

## Example

```typescript
import { Effect } from "effect";
import { ConfidenceCalculatorService } from "./services/confidence-calculator";

const program = Effect.gen(function* () {
  const calc = yield* ConfidenceCalculatorService;
  
  const score = yield* calc.calculate(
    finding,
    sourceCode,
    rule
  );
  
  console.log(`Confidence: ${score.level} (${score.score})`);
  console.log("Factors:");
  score.factors.forEach(f => console.log(`  - ${f}`));
});

Effect.runPromise(program);
```

## Types

```typescript
interface ConfidenceScore {
  readonly level: "high" | "medium" | "low";
  readonly score: number;      // 0.0 - 1.0
  readonly factors: readonly string[];
}

interface ConfidenceConfig {
  readonly baseScore: number;           // 0.9
  readonly complexityPenaltyFactor: number;  // 0.1
  readonly maxComplexityPenalty: number;    // 0.3
  readonly maxSpecificityBonus: number;     // 0.2
  readonly minScore: number;            // 0
  readonly maxScore: number;            // 1
  readonly highThreshold: number;       // 0.8
  readonly mediumThreshold: number;     // 0.6
}
```

## Configuration

Confidence scoring uses sensible defaults defined in `helpers.ts`:

```typescript
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  baseScore: 0.9,
  complexityPenaltyFactor: 0.1,
  maxComplexityPenalty: 0.3,
  maxSpecificityBonus: 0.2,
  minScore: 0,
  maxScore: 1,
  highThreshold: 0.8,
  mediumThreshold: 0.6,
};
```

## Testing

Run confidence calculator tests:
```bash
bun run test src/services/confidence-calculator/__tests__
```

## See Also

- [Code Review Service](../review-code) - Uses confidence scores
- [Finding Schemas](../../tools/schemas) - Finding and Rule types
