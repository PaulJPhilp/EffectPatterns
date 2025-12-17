---
id: schema-external-api-validation
title: External API Validation During Schema Parsing
category: async-validation
skill: intermediate
tags:
  - schema
  - async-validation
  - external-api
  - integration
  - third-party
---

# Problem

Your system integrates with external APIs (payment processor, geocoding, IP reputation). You need to validate user input against those services during parsing. A card must be valid with the payment processor. A shipping address must be valid per geocoding API. An IP must not be flagged as malicious.

# Solution

```typescript
import { Schema, Effect } from "effect"

// ============================================
// 1. Simulated external APIs
// ============================================

class PaymentGateway {
  async validateCard(cardNumber: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    // Simulate: cards starting with 4 are valid
    return cardNumber.startsWith("4")
  }

  async checkCardBalance(cardNumber: string): Promise<number> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    return 5000
  }
}

class GeocodingService {
  async validateAddress(address: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    // Simulate: addresses with "St." are valid
    return address.includes("St.")
  }
}

class SecurityService {
  async checkIPReputation(ip: string): Promise<{ safe: boolean; score: number }> {
    await new Promise((resolve) => setTimeout(resolve, 250))
    // Simulate: IPs starting with 192 are suspicious
    return {
      safe: !ip.startsWith("192"),
      score: ip.startsWith("192") ? 80 : 20,
    }
  }
}

// ============================================
// 2. Create service instances
// ============================================

const paymentGateway = new PaymentGateway()
const geocoding = new GeocodingService()
const security = new SecurityService()

// ============================================
// 3. Schemas with external validation
// ============================================

const ValidCreditCard = Schema.String.pipe(
  Schema.regex(/^\d{16}$/),
  Schema.filterEffect((cardNumber) =>
    Effect.gen(function* () {
      const isValid = yield* Effect.tryPromise({
        try: () => paymentGateway.validateCard(cardNumber),
        catch: () => false,
      })

      if (!isValid) {
        return yield* Effect.fail(
          new Error(`Credit card is invalid or not supported`)
        )
      }

      return cardNumber
    })
  )
)

const ValidShippingAddress = Schema.String.pipe(
  Schema.minLength(10),
  Schema.filterEffect((address) =>
    Effect.gen(function* () {
      const isValid = yield* Effect.tryPromise({
        try: () => geocoding.validateAddress(address),
        catch: () => false,
      })

      if (!isValid) {
        return yield* Effect.fail(
          new Error(`Address could not be validated by geocoding service`)
        )
      }

      return address
    })
  )
)

const SafeIPAddress = Schema.String.pipe(
  Schema.regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/),
  Schema.filterEffect((ip) =>
    Effect.gen(function* () {
      const reputation = yield* Effect.tryPromise({
        try: () => security.checkIPReputation(ip),
        catch: () => ({ safe: false, score: 100 }),
      })

      if (!reputation.safe) {
        return yield* Effect.fail(
          new Error(
            `IP address flagged as suspicious (score: ${reputation.score}/100)`
          )
        )
      }

      return ip
    })
  )
)

// ============================================
// 4. Forms with external validation
// ============================================

const PaymentForm = Schema.Struct({
  cardNumber: ValidCreditCard,
  amount: Schema.Number.pipe(Schema.greaterThan(0)),
  shippingAddress: ValidShippingAddress,
})

const LoginForm = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
  userIp: SafeIPAddress,
})

// ============================================
// 5. Application logic
// ============================================

const appLogic = Effect.gen(function* () {
  console.log("=== External API Validation ===\n")

  console.log("1. Valid payment (card + address):\n")

  const validPayment = {
    cardNumber: "4532123456789012",
    amount: 99.99,
    shippingAddress: "123 Main St.",
  }

  const payment = yield* Effect.tryPromise({
    try: () => Schema.decodeUnknown(PaymentForm)(validPayment),
    catch: (e) => new Error(String(e)),
  })

  console.log(`✓ Payment processed`)
  console.log(`  Card: ****${payment.cardNumber.slice(-4)}`)
  console.log(`  Amount: $${payment.amount}`)
  console.log(`  Address: ${payment.shippingAddress}`)

  console.log("\n2. Invalid credit card:\n")

  const invalidCard = {
    cardNumber: "5532123456789012",
    amount: 50.0,
    shippingAddress: "456 Oak St.",
  }

  const payment2 = yield* Effect.tryPromise({
    try: () => Schema.decodeUnknown(PaymentForm)(invalidCard),
    catch: (e) => new Error(String(e)),
  }).pipe(Effect.either)

  if (payment2._tag === "Left") {
    console.log(`✗ Error: ${payment2.left.message}`)
  }

  console.log("\n3. Valid login (safe IP):\n")

  const validLogin = {
    email: "user@example.com",
    password: "password123",
    userIp: "203.0.113.45",
  }

  const login = yield* Effect.tryPromise({
    try: () => Schema.decodeUnknown(LoginForm)(validLogin),
    catch: (e) => new Error(String(e)),
  })

  console.log(`✓ Login successful`)
  console.log(`  User: ${login.email}`)
  console.log(`  IP: ${login.userIp}`)

  console.log("\n4. Suspicious IP:\n")

  const suspiciousLogin = {
    email: "attacker@example.com",
    password: "wrong",
    userIp: "192.168.1.1",
  }

  const login2 = yield* Effect.tryPromise({
    try: () => Schema.decodeUnknown(LoginForm)(suspiciousLogin),
    catch: (e) => new Error(String(e)),
  }).pipe(Effect.either)

  if (login2._tag === "Left") {
    console.log(`✗ Error: ${login2.left.message}`)
  }

  return { payment, login }
})

// Run application
Effect.runPromise(appLogic)
  .then(() => console.log("\n✅ External API validation complete"))
  .catch((error) => console.error(`Error: ${error.message}`))
```

# Why This Works

| Concept | Explanation |
|---------|-------------|
| **API calls during parse** | Validate against external services |
| **Error propagation** | API errors become validation errors |
| **Type safety** | Decoded value guaranteed valid by API |
| **Declarative** | Validation logic with schema definition |
| **Composable** | Chain with other validators |

# When to Use

- Payment card validation
- Geocoding/address validation
- IP reputation checks
- Email verification APIs
- Rate limit checking
- License validation
- Third-party authentication

# Related Patterns

- [Basic Async](./basic-async.md)
- [Database Checks](./database-checks.md)
- [Batched Async](./batched-async.md)
