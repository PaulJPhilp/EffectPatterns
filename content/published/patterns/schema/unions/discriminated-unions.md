---
id: schema-discriminated-unions
title: Discriminated Unions with Type Narrowing
category: unions
skill: intermediate
tags:
  - schema
  - discriminated-unions
  - tagged-unions
  - type-narrowing
  - pattern-matching
---

# Problem

You have a union of different event types. Without a discriminator field, checking which type it is means examining multiple fields or using instanceof checks. With a `_tag` or `type` discriminator, the compiler can automatically narrow types. You need elegant, type-safe discrimination that makes pattern matching trivial and exhaustiveness checking automatic.

# Solution

```typescript
import { Schema, Effect } from "effect"

// ============================================
// 1. Define discriminated union with _tag
// ============================================

const UserCreatedEvent = Schema.Struct({
  _tag: Schema.Literal("UserCreated"),
  userId: Schema.String,
  email: Schema.String,
  createdAt: Schema.Date,
})

const UserDeletedEvent = Schema.Struct({
  _tag: Schema.Literal("UserDeleted"),
  userId: Schema.String,
  deletedAt: Schema.Date,
  reason: Schema.String,
})

const UserEmailChangedEvent = Schema.Struct({
  _tag: Schema.Literal("UserEmailChanged"),
  userId: Schema.String,
  oldEmail: Schema.String,
  newEmail: Schema.String,
  verificationRequired: Schema.Boolean,
})

const UserEvent = Schema.Union(
  UserCreatedEvent,
  UserDeletedEvent,
  UserEmailChangedEvent
)

type UserEvent = typeof UserEvent.Type

// ============================================
// 2. More complex discriminated unions
// ============================================

const OrderPlacedEvent = Schema.Struct({
  _tag: Schema.Literal("OrderPlaced"),
  orderId: Schema.String,
  customerId: Schema.String,
  items: Schema.Array(
    Schema.Struct({
      productId: Schema.String,
      quantity: Schema.Number,
      price: Schema.Number,
    })
  ),
  totalAmount: Schema.Number,
  timestamp: Schema.Date,
})

const OrderShippedEvent = Schema.Struct({
  _tag: Schema.Literal("OrderShipped"),
  orderId: Schema.String,
  trackingNumber: Schema.String,
  carrier: Schema.String,
  estimatedDelivery: Schema.Date,
})

const OrderCancelledEvent = Schema.Struct({
  _tag: Schema.Literal("OrderCancelled"),
  orderId: Schema.String,
  reason: Schema.String,
  refundAmount: Schema.Number,
  refundProcessedAt: Schema.Date,
})

const OrderEvent = Schema.Union(
  OrderPlacedEvent,
  OrderShippedEvent,
  OrderCancelledEvent
)

type OrderEvent = typeof OrderEvent.Type

// ============================================
// 3. Type-safe event handling
// ============================================

const handleUserEvent = (event: UserEvent): string => {
  // After switch on _tag, TypeScript narrows the type automatically
  switch (event._tag) {
    case "UserCreated":
      // event is now UserCreatedEvent
      return `👤 User created: ${event.email} (${event.userId})`

    case "UserDeleted":
      // event is now UserDeletedEvent
      return `🗑️ User deleted: ${event.userId}. Reason: ${event.reason}`

    case "UserEmailChanged":
      // event is now UserEmailChangedEvent
      const verify = event.verificationRequired ? " (verification required)" : ""
      return `📧 Email changed: ${event.oldEmail} → ${event.newEmail}${verify}`
  }
}

const handleOrderEvent = (event: OrderEvent): string => {
  switch (event._tag) {
    case "OrderPlaced":
      const itemCount = event.items.length
      return `📦 Order placed: ${event.orderId} ($${event.totalAmount}) - ${itemCount} items`

    case "OrderShipped":
      return `🚚 Shipped via ${event.carrier}: ${event.trackingNumber}`

    case "OrderCancelled":
      return `❌ Cancelled - Refund $${event.refundAmount}`
  }
}

// ============================================
// 4. Effect-based event processing
// ============================================

const processUserEventEffect = (
  event: UserEvent
): Effect.Effect<void> =>
  Effect.gen(function* () {
    switch (event._tag) {
      case "UserCreated":
        yield* Effect.log(`Creating user ${event.userId}`)
        yield* Effect.log(`Sending welcome email to ${event.email}`)
        break

      case "UserDeleted":
        yield* Effect.log(`Archiving user data for ${event.userId}`)
        yield* Effect.log(`Reason: ${event.reason}`)
        break

      case "UserEmailChanged":
        yield* Effect.log(`Updating email in database`)
        if (event.verificationRequired) {
          yield* Effect.log(`Sending verification email to ${event.newEmail}`)
        } else {
          yield* Effect.log(`Email verified during signup`)
        }
        break
    }
  })

// ============================================
// 5. Event sourcing with discriminated unions
// ============================================

class EventStore {
  private events: UserEvent[] = []

  append(event: UserEvent): void {
    this.events.push(event)
    console.log(`📝 Event recorded: ${handleUserEvent(event)}`)
  }

  getByTag(tag: UserEvent["_tag"]): UserEvent[] {
    return this.events.filter((e) => e._tag === tag)
  }

  getUserHistory(userId: string): UserEvent[] {
    return this.events.filter((e) => {
      switch (e._tag) {
        case "UserCreated":
          return e.userId === userId
        case "UserDeleted":
          return e.userId === userId
        case "UserEmailChanged":
          return e.userId === userId
      }
    })
  }

  replay(): Effect.Effect<void> {
    return Effect.gen(function* () {
      for (const event of this.events) {
        yield* processUserEventEffect(event)
      }
    })
  }
}

// ============================================
// 6. Parsing discriminated unions
// ============================================

const parseEvent = (
  raw: unknown,
  eventType: "user" | "order"
): Effect.Effect<UserEvent | OrderEvent, Error> =>
  Effect.tryPromise({
    try: async () => {
      const schema = eventType === "user" ? UserEvent : OrderEvent
      return await Schema.decodeUnknown(schema)(raw)
    },
    catch: (error) => {
      const msg = error instanceof Error ? error.message : String(error)
      return new Error(`Failed to parse event: ${msg}`)
    },
  })

// ============================================
// 7. Application logic
// ============================================

const appLogic = Effect.gen(function* () {
  console.log("=== User Events ===\n")

  // Create and process user events
  const store = new EventStore()

  const userCreated: UserEvent = {
    _tag: "UserCreated",
    userId: "user_123",
    email: "alice@example.com",
    createdAt: new Date("2025-12-01"),
  }

  store.append(userCreated)
  yield* processUserEventEffect(userCreated)

  const emailChanged: UserEvent = {
    _tag: "UserEmailChanged",
    userId: "user_123",
    oldEmail: "alice@example.com",
    newEmail: "alice.smith@example.com",
    verificationRequired: true,
  }

  store.append(emailChanged)
  yield* processUserEventEffect(emailChanged)

  const userDeleted: UserEvent = {
    _tag: "UserDeleted",
    userId: "user_123",
    deletedAt: new Date(),
    reason: "User requested account deletion",
  }

  store.append(userDeleted)
  yield* processUserEventEffect(userDeleted)

  console.log("\n=== Order Events ===\n")

  // Parse order events
  const orderPlacedData = {
    _tag: "OrderPlaced",
    orderId: "ord_456",
    customerId: "cust_789",
    items: [
      { productId: "prod_1", quantity: 2, price: 49.99 },
      { productId: "prod_2", quantity: 1, price: 99.99 },
    ],
    totalAmount: 199.97,
    timestamp: new Date(),
  }

  const orderPlaced = yield* parseEvent(orderPlacedData, "order")
  console.log(handleOrderEvent(orderPlaced as OrderEvent))

  const orderShippedData = {
    _tag: "OrderShipped",
    orderId: "ord_456",
    trackingNumber: "1Z999AA10123456784",
    carrier: "UPS",
    estimatedDelivery: new Date("2025-12-25"),
  }

  const orderShipped = yield* parseEvent(orderShippedData, "order")
  console.log(handleOrderEvent(orderShipped as OrderEvent))

  console.log("\n=== Event History ===\n")

  // Show history for user
  const history = store.getUserHistory("user_123")
  console.log(`Events for user_123: ${history.length}`)
  for (const event of history) {
    console.log(`  - ${handleUserEvent(event)}`)
  }

  return { store, history }
})

// Run application
Effect.runPromise(appLogic)
  .then(() => console.log("\n✅ Event sourcing complete"))
  .catch((error) => console.error(`Error: ${error.message}`))
```

# Why This Works

| Concept | Explanation |
|---------|-------------|
| **Discriminator field** | `_tag` or `type` identifies which variant without inspection |
| **Type narrowing** | After switch/if on discriminator, TypeScript knows exact type |
| **Exhaustiveness** | Missing case in switch → TypeScript error |
| **Event sourcing** | Natural fit for storing and replaying discriminated events |
| **Single switch** | One switch on discriminator; no multi-field checks needed |
| **Pattern matching** | Works seamlessly with Effect.match, switch statements |
| **Schema validation** | Each variant validated independently during decode |
| **Self-documenting** | Discriminator makes intent clear to readers |

# When to Use

- Event sourcing systems (UserCreated, OrderPlaced, PaymentProcessed)
- Message queues with multiple message types
- State machines with distinct states
- Webhook payloads with different schemas
- Domain events in DDD
- Command handling (CreateUser, DeleteUser, UpdateEmail)
- API responses with variants (Success/Error/Pending)
- Feature flag feature-specific payloads

# Related Patterns

- [Basic Unions](./basic-unions.md)
- [Polymorphic APIs](./polymorphic-apis.md)
- [Exhaustive Matching](./exhaustive-matching.md)
- [Tagged Errors](../error-handling/tagged-errors.md)
