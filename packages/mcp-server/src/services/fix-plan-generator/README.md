# Fix Plan Generator Service

Generate actionable fix plans for code findings.

## Overview

The `FixPlanGeneratorService` creates detailed fix plans for code issues, including step-by-step actions, change descriptions, and risk warnings.

## API

### Methods

#### `generate(finding: Finding, rule: RuleDefinition, allFixes: FixDefinition[]): Effect<FixPlan>`

Generate a fix plan for a finding.

```typescript
const plan = yield* generator.generate(
  finding,
  rule,
  availableFixes
);

console.log("Steps:");
plan.steps.forEach(s => console.log(`  ${s.order}. ${s.action}`));

console.log("Changes:");
plan.changes.forEach(c => console.log(`  - ${c.type}: ${c.description}`));

console.log("Risks:");
plan.risks.forEach(r => console.log(`  ⚠ ${r}`));
```

#### `generateFromInput(input: GenerateFixPlanInput): Effect<FixPlan>`

Generate from structured input.

```typescript
const plan = yield* generator.generateFromInput({
  finding: { ... },
  rule: { ... },
  allFixes: [ ... ]
});
```

## Plan Structure

Each plan includes:

### Steps (3-5 action items)
Concrete steps to fix the issue:
1. Define X
2. Replace Y with Z
3. Update error handling
4. Test changes
5. Deploy

### Changes (2-4 descriptions)
What will change in the codebase:
- Type: add/modify/remove/refactor
- Scope: e.g., "This file", "3 imports", "Service layer"
- Description: what changes

### Risks (1-3 warnings)
Things to watch out for:
- "Downstream code may expect old pattern"
- "Breaking change if consumers expect Promise"
- "Resource cleanup becomes stricter"

## Category-Specific Plans

Plans are tailored to rule categories:

### Errors
- Define domain-specific error types
- Replace generic Error type
- Update error handling with catchTag
- Check downstream code

### Async
- Replace async/await with Effect
- Update error handling
- Test async behavior
- Verify concurrency safety

### Validation
- Import Schema
- Define validation schema
- Apply at boundaries
- Test validation

### Dependency Injection
- Define Effect.Service
- Provide implementation
- Update consumers
- Coordinate changes

### Resources
- Identify lifecycle
- Use acquireRelease
- Test cleanup
- Verify safety

## Example

```typescript
import { Effect } from "effect";
import { FixPlanGeneratorService } from "./services/fix-plan-generator";

const program = Effect.gen(function* () {
  const generator = yield* FixPlanGeneratorService;
  
  const plan = yield* generator.generate(
    finding,
    rule,
    availableFixes
  );
  
  // Display plan
  console.log("FIX PLAN: " + rule.message);
  console.log("\nSTEPS:");
  plan.steps.forEach(step => {
    console.log(`${step.order}. ${step.action}`);
    console.log(`   ${step.detail}`);
  });
  
  console.log("\nCHANGES:");
  plan.changes.forEach(change => {
    console.log(`- [${change.type}] ${change.description}`);
    console.log(`  Scope: ${change.scope}`);
  });
  
  if (plan.risks.length > 0) {
    console.log("\nRISKS:");
    plan.risks.forEach(risk => {
      console.log(`⚠ ${risk}`);
    });
  }
});

Effect.runPromise(program);
```

## Types

```typescript
interface FixPlan {
  readonly steps: readonly FixStep[];
  readonly changes: readonly ChangeDescription[];
  readonly risks: readonly string[];
}

interface FixStep {
  readonly order: number;
  readonly action: string;      // e.g., "Define domain-specific error types"
  readonly detail: string;      // Additional explanation
}

interface ChangeDescription {
  readonly type: "add" | "modify" | "remove" | "refactor";
  readonly scope: string;       // e.g., "This file", "3 imports"
  readonly description: string; // What changes
}

interface GenerateFixPlanInput {
  readonly finding: Finding;
  readonly rule: RuleDefinition;
  readonly allFixes: readonly FixDefinition[];
}
```

## Testing

Run fix plan generator tests:
```bash
bun run test src/services/fix-plan-generator/__tests__
```

## See Also

- [Code Review Service](../review-code) - Uses fix plans
- [Rule Definitions](../../tools/schemas) - RuleDefinition type
- [Finding Schemas](../../tools/schemas) - Finding type
