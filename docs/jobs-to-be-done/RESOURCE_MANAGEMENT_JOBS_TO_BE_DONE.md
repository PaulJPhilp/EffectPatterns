# Resource Management Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when managing resources (files, connections, etc.) in Effect. We audit patterns against these jobs to find gaps.

---

## 1. Basic Resource Management ✅

### Jobs:
- [x] Safely acquire and release a resource
- [x] Understand the acquire/use/release pattern
- [x] Ensure cleanup even when errors occur

### Patterns (1):
- `bracket-acquire-release.mdx` - Safely Bracket Resource Usage with acquireRelease

---

## 2. Scope and Lifecycle ✅

### Jobs:
- [x] Manually manage resource lifecycles
- [x] Create scoped resources
- [x] Compose multiple resource lifecycles

### Patterns (2):
- `manual-scope.mdx` - Manually Manage Lifecycles with Scope
- `compose-lifecycles.mdx` - Compose Resource Lifecycles with Layer.merge

---

## 3. Layers and Resources ✅

### Jobs:
- [x] Create a service layer from a managed resource
- [x] Create a runtime with scoped resources

### Patterns (2):
- `service-layer-resource.mdx` - Create a Service Layer from a Managed Resource
- `managed-runtime.mdx` - Create a Managed Runtime for Scoped Resources

---

## 4. Advanced Resource Patterns ✅

### Jobs:
- [x] Pool resources for reuse
- [x] Handle resource timeouts
- [x] Manage hierarchical resource trees

### Patterns (3):
- `resource-pooling.mdx` - Pool Resources for Reuse
- `resource-timeouts.mdx` - Handle Resource Timeouts
- `resource-hierarchies.mdx` - Manage Hierarchical Resources

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Basic Resource Management | 3 | 1 | 0 |
| Scope and Lifecycle | 3 | 2 | 0 |
| Layers and Resources | 2 | 2 | 0 |
| Advanced Resource Patterns | 3 | 3 | 0 |
| **Total** | **11** | **8** | **0** |

### Coverage: 100%

Resource management is now fully covered.

