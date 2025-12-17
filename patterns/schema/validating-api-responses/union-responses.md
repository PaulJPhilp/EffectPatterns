---
id: schema-api-response-union
title: Handling Union/Discriminated Responses
category: validating-api-responses
skill: intermediate
tags:
  - schema
  - api
  - union-types
  - discriminated-unions
  - polymorphism
---

# Problem

APIs often return different response shapes based on success or failure. A user creation endpoint might return:
- `{ success: true, data: User }` on success
- `{ success: false, error: string }` on failure
- `{ status: "pending", jobId: string }` for async operations

You need to validate that the response matches one of the expected shapes, then handle each case differently. Type assertions (`as Success`) won't catch mismatches—you need runtime validation of which variant you actually received.

# Solution

```typescript
import { Effect, Schema } from "effect"

// Define each response variant as a separate schema

const SuccessResponse = Schema.Struct({
  status: Schema.Literal("success"),
  data: Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    email: Schema.String,
  }),
})

const ErrorResponse = Schema.Struct({
  status: Schema.Literal("error"),
  code: Schema.Number,
  message: Schema.String,
})

const PendingResponse = Schema.Struct({
  status: Schema.Literal("pending"),
  jobId: Schema.String,
  checkAfterSeconds: Schema.Number,
})

// Union: Response is one of these three shapes
const Response = Schema.Union(
  SuccessResponse,
  ErrorResponse,
  PendingResponse
)

type Response = typeof Response.Type

const parseResponse = Schema.decodeUnknown(Response)

// Use in a pipeline with pattern matching
const createUser = (name: string, email: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() =>
      fetch("https://api.example.com/users", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      }).then((r) => r.json())
    )

    const result = yield* parseResponse(response)

    // Pattern match on the discriminator
    if (result.status === "success") {
      yield* Effect.log(`User created: ${result.data.name}`)
      return { ok: true as const, user: result.data }
    }

    if (result.status === "error") {
      yield* Effect.log(
        `API error (${result.code}): ${result.message}`
      )
      return { ok: false as const, error: result.message }
    }

    if (result.status === "pending") {
      yield* Effect.log(
        `Processing: check back in ${result.checkAfterSeconds}s (job: ${result.jobId})`
      )
      return { ok: false as const, pending: result.jobId }
    }

    // TypeScript: impossible branch (exhaustive check)
    const _exhaustive: never = result
    return _exhaustive
  })

// Alternative: Use Schema.match for cleaner code
const createUserWithMatch = (name: string, email: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() =>
      fetch("https://api.example.com/users", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      }).then((r) => r.json())
    )

    const result = yield* parseResponse(response)

    // More idiomatic Effect approach
    return yield* Effect.cond(
      () => result.status === "success",
      () =>
        Effect.succeed({
          ok: true as const,
          user: (result as typeof SuccessResponse.Type).data,
        }),
      () => {
        if (result.status === "error") {
          return Effect.fail(
            new Error((result as typeof ErrorResponse.Type).message)
          )
        }

        return Effect.succeed({
          ok: false as const,
          pending: (result as typeof PendingResponse.Type).jobId,
        })
      }
    )
  })

// Handling discriminated unions with explicit discriminator
const PaymentResult = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("approved"),
    transactionId: Schema.String,
    amount: Schema.Number,
  }),
  Schema.Struct({
    type: Schema.Literal("declined"),
    reason: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("requires-auth"),
    authUrl: Schema.String,
  })
)

type PaymentResult = typeof PaymentResult.Type

const parsePayment = Schema.decodeUnknown(PaymentResult)

const processPayment = (amount: number) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() =>
      fetch("https://api.example.com/pay", {
        method: "POST",
        body: JSON.stringify({ amount }),
      }).then((r) => r.json())
    )

    const result = yield* parsePayment(response)

    // Discriminated union: type field guides the match
    switch (result.type) {
      case "approved":
        yield* Effect.log(`Payment approved: ${result.transactionId}`)
        return { success: true, transactionId: result.transactionId }

      case "declined":
        yield* Effect.log(`Payment declined: ${result.reason}`)
        return { success: false, reason: result.reason }

      case "requires-auth":
        yield* Effect.log(`Redirect to: ${result.authUrl}`)
        return { success: false, authRequired: true, url: result.authUrl }
    }
  })

// Execute example
const main = Effect.gen(function* () {
  const result = yield* createUser("Alice", "alice@example.com")

  if (result.ok) {
    yield* Effect.log(`Welcome, ${result.user.name}!`)
  } else {
    yield* Effect.log(`Failed: ${result.error}`)
  }
})

await Effect.runPromise(main)
```

# Why This Works

| Concept | Explanation |
|---------|-------------|
| **Schema.Union** | Validates data against multiple schemas; succeeds if any match |
| **Discriminated fields** | `status` or `type` field tells you which variant you have (required for type narrowing) |
| **Literal types** | `Schema.Literal("success")` ensures the discriminator value is exactly what you expect |
| **Type narrowing** | TypeScript knows the exact shape after the `if` or `switch` on the discriminator |
| **Exhaustiveness checking** | `const _exhaustive: never = result` catches missing cases at compile time |

# When to Use

- APIs with success/error/retry response patterns
- Polymorphic endpoints (create returns different shapes than fetch)
- APIs that support multiple versions with different response structures
- When responses have different required fields based on status
- Webhook payloads that vary by event type

# Related Patterns

- [Basic API Response Decoding](./basic.md) — Simpler cases with single response type
- [Decoding Nested API Responses](./nested-responses.md) — Complex nested structures
- [Handling Decode Failures](./error-handling.md) — How to handle validation errors
- [Full Pipeline with @effect/platform](./with-http-client.md) — Complete HTTP workflow
