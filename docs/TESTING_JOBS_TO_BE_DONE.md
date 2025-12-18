# Testing Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when testing Effect applications. We audit patterns against these jobs to find gaps.

---

## 1. Getting Started ✅

### Jobs:
- [x] Write a basic test for an Effect
- [x] Test success and failure cases
- [x] Use Effect.runPromise in tests

### Patterns (1):
- `testing-hello-world.mdx` - Your First Effect Test

---

## 2. Testing with Services ✅

### Jobs:
- [x] Provide test implementations of services
- [x] Mock dependencies for testing
- [x] Create in-memory test doubles

### Patterns (2):
- `testing-with-services.mdx` - Test Effects with Services
- `mock-dependencies.mdx` - Mocking Dependencies in Tests

---

## 3. Test Infrastructure ✅

### Jobs:
- [x] Use auto-generated .Default layers
- [x] Organize layers for tests
- [x] Write adaptable tests

### Patterns (3):
- `default-layer-tests.mdx` - Use the Auto-Generated .Default Layer in Tests
- `organize-layers.mdx` - Organize Layers into Composable Modules
- `adaptable-tests.mdx` - Write Tests That Adapt to Application Code

---

## 4. Test Services ✅

### Jobs:
- [x] Control time in tests with TestClock

### Patterns (1):
- `test-clock.mdx` - Accessing the Current Time with Clock

---

## 5. Advanced Testing

### Jobs:
- [ ] Test concurrent code
- [ ] Test streaming effects
- [ ] Property-based testing with Effect

### Gap Analysis:
These advanced patterns would be useful:
- Testing race conditions and concurrent behavior
- Testing Stream operations
- Using fast-check with Effect

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Getting Started | 3 | 1 | 0 |
| Testing with Services | 3 | 2 | 0 |
| Test Infrastructure | 3 | 3 | 0 |
| Test Services | 1 | 1 | 0 |
| Advanced Testing | 3 | 0 | 3 |
| **Total** | **13** | **7** | **3** |

### Coverage: 77%

Core testing patterns are covered. Advanced patterns (concurrency, streams, property-based) could be added.

