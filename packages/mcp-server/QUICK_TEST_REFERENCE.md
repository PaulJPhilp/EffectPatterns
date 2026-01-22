# Severity Signaling - Quick Test Reference

## 🚀 The Fastest Way to Test

### Copy-Paste Ready: Test #1 (Start Here)

```
Analyze this TypeScript code for Effect-TS anti-patterns and violations. 
Show me the findings with clear severity indicators so I can prioritize fixes:

```typescript
export const getUserService = () => {
  return Effect.gen(function* () {
    // Promise.all instead of Effect.all
    const [user, posts] = yield* Promise.all([
      fetchUser(123),
      fetchPosts(123)
    ]);

    // Untyped Error
    if (!user) {
      yield* Effect.fail(new Error("User not found"));
    }

    // Try/catch in Effect
    try {
      const result = yield* validateUser(user);
      return result;
    } catch (error) {
      console.error("Validation failed", error);
      return null;
    }
  });
};
```
```

**Expected Output:**
- Findings grouped by severity
- Headers like: `## [🔴 HIGH SEVERITY] Issue Title`
- Blockquoted descriptions: `> **Issue:** Description`
- Structured sections: `### Problematic Pattern`
- Item counts: `### 🔴 High Severity (X)`

---

## ✅ What You Should See

### Good Output Pattern:

```
## Findings Summary (N total)

### 🔴 High Severity (2)

#### [🔴 HIGH SEVERITY] Promise.all in Effect Logic
> **Issue:** Using Promise.all breaks supervision

**Example:**
```typescript
const [user, posts] = yield* Promise.all([...])
```

#### [🔴 HIGH SEVERITY] Untyped Error
> **Issue:** All Effect.fail must use Data.TaggedError

### 🟡 Advisory (1)

#### [🟡 ADVISORY] Try/Catch in Effect
> **Issue:** Use Effect error handling instead

### 🔵 Info (0)
```

### Key Markers to Look For:

- ✅ `[🔴 HIGH SEVERITY]` - Red, urgent
- ✅ `[🟡 ADVISORY]` - Yellow, important
- ✅ `[🔵 INFO]` - Blue, nice-to-have
- ✅ `> **Issue:**` - Blockquoted emphasis
- ✅ `### Severity Group (X)` - Item counts
- ✅ Grouped findings - High first, then medium, then low

---

## 🎯 5-Test Quick Tour (20 minutes total)

| Test | Code | Time | What You're Testing |
|------|------|------|---------------------|
| 1 | Copy above | 3m | Basic severity grouping |
| 2 | See full prompt | 5m | Architecture findings |
| 3 | See full prompt | 3m | Migration diffs |
| 4 | See full prompt | 5m | Multiple findings |
| 5 | See full prompt | 4m | Visual rendering |

**Full prompt location:** `packages/mcp-server/TEST_SEVERITY_SIGNALING_PROMPT.md`

---

## 🐛 Troubleshooting (If Something Looks Wrong)

| Problem | Check |
|---------|-------|
| No severity headers | Look for `[🔴 HIGH SEVERITY]` in output |
| Emoji not showing | May be IDE font - still works |
| Not grouped | Should see `### 🔴 High Severity (X)` section |
| Wrong counts | Count items per severity manually |
| No blockquotes | Look for `> ` prefix in output |
| Crash/Error | Run `bun run test:mcp` to verify tests pass |

---

## 📊 Success Checklist

- [ ] Severity headers visible (H2/H3)
- [ ] Emoji render (🔴 🟡 🔵)
- [ ] Blockquotes show `> ` prefix
- [ ] Findings grouped by severity
- [ ] Counts match actual items
- [ ] Code blocks highlighted
- [ ] No errors in output
- [ ] Renders in Cursor IDE
- [ ] Easy to scan findings
- [ ] High-severity items first

**All checked? You're done! ✅**

---

## 🎓 Understanding the Output

### When You See This:

```
## Findings Summary (3 total)

### 🔴 High Severity (2)
#### [🔴 HIGH SEVERITY] Promise.all in Effect Logic
#### [🔴 HIGH SEVERITY] Untyped Error

### 🟡 Advisory (1)
#### [🟡 ADVISORY] Try/Catch in Effect
```

### It Means:

✅ **3 total findings found**
✅ **2 are critical** (must fix before shipping)
✅ **1 is advisory** (should fix before shipping)
✅ **0 are just info** (nice-to-have improvements)

### The User Can Immediately:

1. See there are 3 findings
2. Know 2 are urgent (red)
3. Prioritize fixing high severity first
4. Plan time for advisory items
5. Scan all in < 10 seconds

---

## 🚀 After Testing Works

These are now production-ready:

- `createSeverityBlock()` - Individual finding blocks
- `createFindingsSummary()` - Grouped findings
- `buildViolationContent()` - Enhanced violations
- `generateMigrationDiff()` - Enhanced migrations

Ready to integrate into:
- Code review tools
- Architecture analysis
- Migration guides
- Any code finding output

---

## 📚 Full Documentation

- **Complete API:** `SEVERITY_SIGNALING.md`
- **Visual Guide:** `SEVERITY_VISUAL_GUIDE.md`
- **Test Prompts:** `TEST_SEVERITY_SIGNALING_PROMPT.md`

---

## ⏱️ Time Estimates

| Activity | Time |
|----------|------|
| Copy & run Test 1 | 3 min |
| Review output | 2 min |
| Run remaining tests | 15 min |
| Verify checklist | 5 min |
| **Total** | **~25 min** |

---

## 🎯 One-Liner Success Criteria

**"User can see severity at a glance without reading full blocks"** ✅
