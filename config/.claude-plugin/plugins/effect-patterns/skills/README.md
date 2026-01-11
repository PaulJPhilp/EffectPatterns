# Effect Patterns Skills

This directory contains 24 auto-generated Claude Code skills for Effect-TS patterns.

## Skills Included

All skills are organized by category and include beginner, intermediate, and advanced patterns:

- `effect-patterns-error-handling` - Error handling and recovery patterns
- `effect-patterns-concurrency` - Concurrent and parallel execution patterns
- `effect-patterns-core-concepts` - Fundamental Effect-TS concepts
- `effect-patterns-streams` - Stream processing patterns
- `effect-patterns-domain-modeling` - Domain modeling with branded types
- `effect-patterns-building-apis` - HTTP API development patterns
- `effect-patterns-resource-management` - Resource lifecycle management
- `effect-patterns-testing` - Testing Effect applications
- `effect-patterns-observability` - Logging, tracing, and metrics
- `effect-patterns-platform` - Platform operations (filesystem, commands, etc.)
- And 14 more categories...

## For Developers

### Regenerating Skills

When patterns in `content/published/patterns/` are updated:

```bash
bun run generate:skills
```

This regenerates all skills in both:
- `content/published/skills/claude/` (gitignored dev artifacts)
- `.claude-plugin/plugins/effect-patterns/skills/` (committed for plugin distribution)

### Skill Structure

Each skill follows the format:
```
effect-patterns-{category}/
└── SKILL.md              # YAML frontmatter + pattern content
```

Skills are auto-discovered by Claude Code from this directory.

### Skill Content

Each SKILL.md file contains:
- **YAML frontmatter**: name, description
- **Pattern sections**: Organized by skill level (beginner → intermediate → advanced)
- **For each pattern**:
  - Rule/guideline
  - Good example
  - Anti-pattern
  - Rationale/explanation
