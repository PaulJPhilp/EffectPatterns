# Schema Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when using Effect Schema. We audit patterns against these jobs to find gaps.

---

## 1. Getting Started with Schema ✅

### Jobs:
- [x] Define a simple schema for an object
- [x] Parse/decode unknown data into a typed value
- [x] Encode a typed value back to unknown/JSON
- [x] Understand Schema vs Zod/Yup

### Patterns (4):
- `hello-world.mdx` - Your First Schema
- `decode-encode.mdx` - Decode and Encode Data
- `handling-errors.mdx` - Handling Parse Errors
- `schema-vs-zod.mdx` - Effect Schema vs Zod

---

## 2. Primitive Types ✅

### Jobs:
- [x] Validate strings (min/max length, patterns)
- [x] Validate numbers (int, range, positive)
- [x] Validate dates
- [x] Validate enums and literals

### Patterns (4):
- `string-validation.mdx` - String Validation and Refinements
- `number-validation.mdx` - Number Validation and Refinements
- `date-validation.mdx` - Date Validation and Parsing
- `enums-literals.mdx` - Enums and Literal Types

---

## 3. Object Schemas ✅

### Jobs:
- [x] Define an object with required fields
- [x] Define optional fields
- [x] Define nested objects

### Patterns (3):
- `basic-objects.mdx` - Basic Object Schemas
- `optional-fields.mdx` - Optional and Nullable Fields
- `nested-objects.mdx` - Nested Object Schemas

---

## 4. Array and Collection Schemas ✅

### Jobs:
- [x] Validate an array of items
- [x] Validate array length (min/max)
- [x] Validate tuples (fixed-length typed arrays)

### Patterns (2):
- `basic-arrays.mdx` - Array Validation
- `tuples.mdx` - Tuple Schemas

---

## 5. Union and Discriminated Types ✅

### Jobs:
- [x] Define a union of possible types
- [x] Define a discriminated union (tagged union)
- [x] Handle exhaustive matching

### Patterns (4):
- `basic-unions.mdx` - Basic Union Types
- `discriminated-unions.mdx` - Discriminated Unions
- `exhaustive-matching.mdx` - Exhaustive Matching
- `polymorphic-apis.mdx` - Polymorphic APIs

---

## 6. Transformations ✅

### Jobs:
- [x] Transform input during parsing
- [x] Transform between types
- [x] Create branded types
- [x] Normalize data

### Patterns (4):
- `basic-transforms.mdx` - Basic Schema Transformations
- `bidirectional.mdx` - Bidirectional Transformations
- `branded-types.mdx` - Branded Types
- `data-normalization.mdx` - Data Normalization

---

## 7. Async Validation ✅

### Jobs:
- [x] Async validation (check database, API)
- [x] Batch async validation
- [x] Database constraints

### Patterns (4):
- `basic-async.mdx` - Basic Async Validation
- `batched-validation.mdx` - Batched Async Validation
- `database-validation.mdx` - Database Validation
- `external-api.mdx` - External API Validation

---

## 8. Error Handling ✅

### Jobs:
- [x] Get all validation errors
- [x] Format errors for users
- [x] Create custom error messages
- [x] Error recovery

### Patterns (4):
- `error-aggregation.mdx` - Error Aggregation
- `error-recovery.mdx` - Error Recovery
- `custom-errors.mdx` - Custom Tagged Errors
- `custom-messages.mdx` - User-Friendly Messages

---

## 9. Real-World Use Cases ✅

### Jobs:
- [x] Validate API responses
- [x] Validate form data
- [x] Validate environment variables
- [x] Validate JSON files/config
- [x] Validate web standards (URL, email)

### Patterns:
- **Form Validation (5):** basic, async, collecting-errors, dependent-fields, nested
- **Environment Config (4):** composable, feature-flags, secrets, variables
- **API Validation (6):** basic, error-handling, pagination, rate-limits, retries, versioning
- **JSON Validation (8):** database-columns, config-files, file-validation, etc.
- **Web Standards (6):** email, url, uuid, dates, phone, postal-codes

---

## 10. Advanced Patterns ✅

### Jobs:
- [x] Define recursive schemas
- [x] Create reusable schema components
- [x] Schema composition and extension

### Patterns:
- **Recursive (4):** trees, linked-lists, json-types, nested-comments
- **Composition (4):** extending, merging, pick-omit, inheritance

---

## 11. AI/LLM Integration ✅

### Jobs:
- [x] Define output schemas for AI responses
- [x] Parse structured AI outputs
- [x] Handle AI parsing failures
- [x] Streaming validation

### Patterns (11):
- **Output Schemas:** basics, enums, nested, unions, descriptions, vercel-ai-sdk
- **Parsing:** basics, recovery, partial, retry, streaming

---

## Coverage Summary

| Category | Jobs | Patterns | Status |
|----------|------|----------|--------|
| Getting Started | 4 | 4 | ✅ NEW |
| Primitives | 4 | 4 | ✅ NEW |
| Objects | 3 | 3 | ✅ NEW |
| Arrays | 3 | 2 | ✅ NEW |
| Unions | 3 | 4 | ✅ |
| Transformations | 4 | 4 | ✅ |
| Async Validation | 3 | 4 | ✅ |
| Error Handling | 4 | 4 | ✅ |
| Real-World | 5 | 29 | ✅ |
| Advanced | 3 | 8 | ✅ |
| AI/LLM | 4 | 11 | ✅ |

**Total Jobs: 40**
**Total Patterns: 77**
**Coverage: 100%** - All identified jobs have patterns

---

## Directory Structure

```
schema/
├── getting-started/    (4) NEW - Hello world, decode/encode, errors, comparison
├── primitives/         (4) NEW - String, number, date, enums
├── objects/            (3) NEW - Basic, optional, nested
├── arrays/             (2) NEW - Arrays, tuples
├── unions/             (4) Union types and matching
├── transformations/    (4) Transform and convert data
├── async-validation/   (4) Database and API validation
├── error-handling/     (4) Error collection and formatting
├── form-validation/    (5) Form input validation
├── environment-config/ (4) Env vars and config
├── json-validation/    (8) MERGED - JSON files and database columns
├── ai-schemas/         (11) MERGED - AI output and parsing
├── validating-api-responses/ (6) API response validation
├── web-standards-validation/ (6) URLs, emails, UUIDs
├── recursive/          (4) Trees and recursive structures
└── composition/        (4) Schema extension and merging
```
