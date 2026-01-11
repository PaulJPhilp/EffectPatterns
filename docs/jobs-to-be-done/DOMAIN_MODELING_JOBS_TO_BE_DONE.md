# Domain Modeling Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when modeling their domain with Effect. We audit patterns against these jobs to find gaps.

---

## 1. Getting Started ✅

### Jobs:
- [x] Create basic domain models with interfaces
- [x] Use Effect.gen for business logic
- [x] Understand when to use Effect vs plain functions

### Patterns (2):
- `domain-modeling-hello-world.mdx` - Your First Domain Model
- `use-effect-gen.mdx` - Use Effect.gen for Business Logic

---

## 2. Optional Values ✅

### Jobs:
- [x] Model optional values with Option
- [x] Handle None and Some cases
- [x] Chain operations on Options

### Patterns (2):
- `domain-modeling-option-basics.mdx` - Handle Missing Values with Option
- `model-optional-values.mdx` - Model Optional Values Safely with Option

---

## 3. Error Modeling ✅

### Jobs:
- [x] Create tagged errors for your domain
- [x] Distinguish "not found" from other errors
- [x] Accumulate multiple errors

### Patterns (4):
- `domain-modeling-tagged-errors.mdx` - Create Type-Safe Errors
- `define-tagged-errors.mdx` - Define Type-Safe Errors with Data.TaggedError
- `distinguish-not-found.mdx` - Distinguish 'Not Found' from Errors
- `accumulate-errors-either.mdx` - Accumulate Multiple Errors with Either

---

## 4. Branded Types ✅

### Jobs:
- [x] Create branded types for domain concepts
- [x] Validate branded type values
- [x] Parse strings into branded types

### Patterns (3):
- `brand-model-domain-type.mdx` - Modeling Validated Domain Types with Brand
- `brand-validate-parse.mdx` - Validating and Parsing Branded Types
- `brand-model-validated.mdx` - Model Validated Domain Types with Brand

---

## 5. Validation with Schema ✅

### Jobs:
- [x] Define contracts upfront with Schema
- [x] Parse and validate domain data
- [x] Transform data during validation

### Patterns (3):
- `define-contracts-schema.mdx` - Define Contracts Upfront with Schema
- `parse-validate-schema.mdx` - Parse and Validate Data with Schema.decode
- `transform-data-schema.mdx` - Transform Data During Validation with Schema

---

## 6. Code Style ✅

### Jobs:
- [x] Avoid long chains of andThen
- [x] Use generators for readability

### Patterns (1):
- `avoid-long-chains.mdx` - Avoid Long Chains of .andThen; Use Generators Instead

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Getting Started | 3 | 2 | 0 |
| Optional Values | 3 | 2 | 0 |
| Error Modeling | 3 | 3 | 0 |
| Branded Types | 3 | 3 | 0 |
| Validation with Schema | 3 | 3 | 0 |
| Code Style | 2 | 1 | 0 |
| **Total** | **17** | **14** | **0** |

### Coverage: 100%

Domain modeling is well covered with 15 patterns across all key areas.

