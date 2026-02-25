# Pattern Generator Service

Code generation from Effect patterns.

## Overview

The `PatternGeneratorService` generates Effect code from hardcoded templates with variable substitution and validation.

## API

### Methods

#### `generate(input: GenerateFromTemplateInput): Effect<GeneratePatternOutput, Error>`

Generate code from a template with variables.

```typescript
const result = yield* generator.generate({
  patternId: "validation-filter-or-fail",
  variables: {
    Name: "FilePath",
    paramName: "filePath",
    paramType: "string",
    shortName: "p",
    condition: "p.length > 0",
    errorMessage: "Invalid file path"
  }
});

console.log(result.code);      // Generated TypeScript code
console.log(result.imports);   // Import statements
```

#### `generateFromTemplate(input: GenerateFromTemplateInput): Effect<GeneratePatternOutput, Error>`

Same as `generate`, but explicit for template-based generation.

#### `listTemplates(): Effect<PatternTemplate[]>`

List all available template patterns.

```typescript
const templates = yield* generator.listTemplates();
templates.forEach(t => {
  console.log(`${t.id}: ${t.name}`);
  console.log(`  Variables: ${t.variables.join(", ")}`);
});
```

## Pattern Templates

Available patterns with required variables:

### `validation-filter-or-fail`
Filter validation with custom error.

Variables:
- `Name` - Class/function name
- `paramName` - Parameter name
- `paramType` - Parameter type
- `shortName` - Short variable alias
- `condition` - Validation condition
- `errorMessage` - Error message

### `service-effect-service`
Effect.Service definition skeleton.

Variables:
- `ServiceName` - Service class name
- `methodName` - First method name
- `methodReturnType` - Return type

### See `helpers.ts` for complete template list.

## Error Handling

```typescript
import { Either } from "effect";

const result = yield* generator.generate({
  patternId: "unknown-pattern",
  variables: {}
}).pipe(Effect.either);

if (Either.isLeft(result)) {
  const error = result.left;
  console.log(error.message); // "Unknown patternId"
}
```

## Example

```typescript
import { Effect } from "effect";
import { PatternGeneratorService } from "./services/pattern-generator";

const program = Effect.gen(function* () {
  const generator = yield* PatternGeneratorService;
  
  // List available templates
  const templates = yield* generator.listTemplates();
  console.log(`${templates.length} patterns available`);
  
  // Generate code
  const result = yield* generator.generate({
    patternId: "validation-filter-or-fail",
    variables: {
      Name: "Port",
      paramName: "port",
      paramType: "number",
      shortName: "p",
      condition: "p > 0 && p <= 65535",
      errorMessage: "Invalid port number"
    }
  });
  
  console.log(result.code);
  // Output:
  // const validatePort = Schema.refine(
  //   Schema.Number,
  //   (p) => p > 0 && p <= 65535,
  //   { issue: { message: "Invalid port number" } }
  // );
});

Effect.runPromise(program);
```

## Types

```typescript
interface GenerateFromTemplateInput {
  readonly patternId: string;
  readonly variables: Record<string, string>;
}

interface GeneratePatternOutput {
  readonly patternId: string;
  readonly name: string;
  readonly imports: readonly string[];
  readonly code: string;
  readonly source: "template";
}

interface PatternTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly variables: readonly string[];
  readonly template: string;
  readonly imports: readonly string[];
}
```

## Testing

Run pattern generator tests:
```bash
bun run test src/services/pattern-generator/__tests__
```

## See Also

- [Pattern Library](../../../docs/patterns) - Effect pattern documentation
- [Toolkit](../../packages/toolkit) - @effect-patterns/toolkit for database patterns
