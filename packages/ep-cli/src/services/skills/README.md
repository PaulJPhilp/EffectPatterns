# Skills Service

Service for managing and validating Claude Skills within the Effect Patterns project.

## Features

- **Skill Discovery**: Automatically lists skills from the project directory.
- **Validation**: Ensures skills follow the required structure and contain mandatory sections.
- **Statistics**: Provides insights into skill coverage and complexity.

## Usage

```typescript
import { Skills } from "./services/skills/index.js";

const program = Effect.gen(function*() {
  const skills = yield* Skills;
  const allSkills = yield* skills.listAll;
  const stats = yield* skills.getStats;
});
```
