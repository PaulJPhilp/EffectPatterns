---
"@effect-patterns/ep-cli": patch
---

Feature: Enabled `ep admin lint` command
- Scans `content/new/src` for TypeScript patterns.
- Validates against Effect-TS best practices (concurrency, tapError, deprecated APIs).
- Provides detailed error reporting with line/column and fix suggestions.
