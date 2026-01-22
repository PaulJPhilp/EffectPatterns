# Simple Test Prompt for Severity Signaling

Copy and paste this into Claude Code to test the new severity signaling features:

---

## One Simple Prompt

```
Analyze this code for Effect-TS anti-patterns:

```typescript
const service = Effect.gen(function* () {
  const data = yield* Promise.all([fetch('/a'), fetch('/b')]);
  if (!data) yield* Effect.fail(new Error('bad'));
  try { return yield* process(data); } catch(e) {}
});
```
```

---

## What You Should See

Output grouped by severity with emoji headers:

```
## Findings Summary (3 total)

### 🔴 High Severity (2)
#### [🔴 HIGH SEVERITY] Promise.all in Effect
> **Issue:** Use Effect.all instead

#### [🔴 HIGH SEVERITY] Untyped Error
> **Issue:** Use Data.TaggedError

### 🟡 Advisory (1)
#### [🟡 ADVISORY] Try/Catch in Effect
> **Issue:** Use Effect error handling
```

---

**That's it. Paste the prompt above into Claude Code and you'll see the severity signaling in action.**
