---
id: schema-inheritance-patterns
title: Schema Inheritance and Specialization
category: composition
skill: intermediate
tags:
  - schema
  - composition
  - inheritance
  - specialization
  - polymorphism
---

# Problem

Your domain has a base entity (Product) with common fields and many specializations (PhysicalProduct, DigitalProduct, ServiceProduct). Each has unique fields. You need a type hierarchy where specializations inherit base fields but add their own, with type-safe discrimination and exhaustive handling.

# Solution

```typescript
import { Schema, Effect } from "effect"

// ============================================
// 1. Base schema
// ============================================

const BaseProduct = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  price: Schema.Number,
  currency: Schema.Enum({ usd: "USD", eur: "EUR", gbp: "GBP" }),
  createdAt: Schema.Date,
  tags: Schema.Array(Schema.String),
})

type BaseProduct = typeof BaseProduct.Type

// ============================================
// 2. Specializations with inheritance
// ============================================

const PhysicalProduct = Schema.extend(
  BaseProduct,
  Schema.Struct({
    type: Schema.Literal("physical"),
    weight: Schema.Number,
    dimensions: Schema.Struct({
      length: Schema.Number,
      width: Schema.Number,
      height: Schema.Number,
    }),
    warehouse: Schema.String,
    stock: Schema.Number,
  })
)

type PhysicalProduct = typeof PhysicalProduct.Type

const DigitalProduct = Schema.extend(
  BaseProduct,
  Schema.Struct({
    type: Schema.Literal("digital"),
    downloadUrl: Schema.String,
    fileSize: Schema.Number,
    licenseType: Schema.Enum({
      single: "single",
      site: "site",
      enterprise: "enterprise",
    }),
    deliveryMethod: Schema.Enum({
      email: "email",
      download: "download",
      cloud: "cloud",
    }),
  })
)

type DigitalProduct = typeof DigitalProduct.Type

const ServiceProduct = Schema.extend(
  BaseProduct,
  Schema.Struct({
    type: Schema.Literal("service"),
    duration: Schema.Number, // in minutes
    serviceCategory: Schema.String,
    includesSupport: Schema.Boolean,
    maxParticipants: Schema.Optional(Schema.Number),
  })
)

type ServiceProduct = typeof ServiceProduct.Type

// ============================================
// 3. Union of specializations
// ============================================

const Product = Schema.Union(PhysicalProduct, DigitalProduct, ServiceProduct)

type Product = typeof Product.Type

// ============================================
// 4. Utility functions
// ============================================

const getProductDescription = (product: Product): string => {
  const base = `${product.name} - $${product.price}${product.currency}`

  switch (product.type) {
    case "physical":
      return `${base} (Physical: ${product.weight}kg, Stock: ${product.stock})`

    case "digital":
      return `${base} (Digital: ${product.fileSize}MB, ${product.licenseType})`

    case "service":
      return `${base} (Service: ${product.duration}min, Support: ${product.includesSupport ? "Yes" : "No"})`
  }
}

const calculateTax = (product: Product, taxRate: number): number => {
  // Different tax rules for different product types
  switch (product.type) {
    case "physical":
      return product.price * taxRate

    case "digital":
      // Digital products may have different tax
      return product.price * (taxRate * 0.5)

    case "service":
      // Services might be tax-exempt in some regions
      return product.price * (taxRate * 0.7)
  }
}

const validateInventory = (product: Product): boolean => {
  // Only physical products need inventory checks
  if (product.type === "physical") {
    return product.stock > 0
  }
  // Digital and services always available
  return true
}

// ============================================
// 5. Processing specializations
// ============================================

const parseProduct = (raw: unknown): Effect.Effect<Product, Error> =>
  Effect.tryPromise({
    try: () => Schema.decodeUnknown(Product)(raw),
    catch: (error) => new Error(String(error)),
  })

const processProductEffect = (product: Product): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`Product: ${getProductDescription(product)}`)

    const tax = calculateTax(product, 0.1)
    yield* Effect.log(`Tax (10%): $${tax.toFixed(2)}`)

    const inStock = validateInventory(product)
    yield* Effect.log(`Available: ${inStock ? "Yes" : "No"}`)

    switch (product.type) {
      case "physical":
        yield* Effect.log(`Warehouse: ${product.warehouse}`)
        break

      case "digital":
        yield* Effect.log(
          `License: ${product.licenseType}, Delivery: ${product.deliveryMethod}`
        )
        break

      case "service":
        yield* Effect.log(`Duration: ${product.duration} minutes`)
        break
    }
  })

// ============================================
// 6. Application logic
// ============================================

const appLogic = Effect.gen(function* () {
  console.log("=== Schema Inheritance ===\n")

  const products: Product[] = [
    {
      id: "prod_1",
      type: "physical",
      name: "Laptop Stand",
      description: "Ergonomic aluminum laptop stand",
      price: 49.99,
      currency: "USD",
      createdAt: new Date("2025-01-01"),
      tags: ["office", "electronics"],
      weight: 0.5,
      dimensions: { length: 30, width: 25, height: 10 },
      warehouse: "US-East",
      stock: 150,
    },
    {
      id: "prod_2",
      type: "digital",
      name: "Effect-TS eBook",
      description: "Comprehensive guide to Effect-TS",
      price: 29.99,
      currency: "USD",
      createdAt: new Date("2025-02-01"),
      tags: ["ebook", "programming"],
      downloadUrl: "https://example.com/effect-ebook.pdf",
      fileSize: 15,
      licenseType: "single",
      deliveryMethod: "email",
    },
    {
      id: "prod_3",
      type: "service",
      name: "Consulting Session",
      description: "1-on-1 Effect-TS consulting",
      price: 199.99,
      currency: "USD",
      createdAt: new Date("2025-03-01"),
      tags: ["consulting", "training"],
      duration: 60,
      serviceCategory: "consulting",
      includesSupport: true,
      maxParticipants: 1,
    },
  ]

  console.log("Processing product specializations:\n")

  for (const product of products) {
    yield* processProductEffect(product)
    yield* Effect.log("")
  }

  console.log("=== Summary ===\n")
  console.log("Base fields shared by all specializations:")
  console.log([
    "id",
    "name",
    "description",
    "price",
    "currency",
    "createdAt",
    "tags",
  ].join(", "))

  console.log("\nSpecialization-specific fields:")
  console.log("Physical: weight, dimensions, warehouse, stock")
  console.log("Digital: downloadUrl, fileSize, licenseType, deliveryMethod")
  console.log("Service: duration, serviceCategory, includesSupport, maxParticipants")

  return products
})

// Run application
Effect.runPromise(appLogic)
  .then(() => console.log("✅ Inheritance patterns complete"))
  .catch((error) => console.error(`Error: ${error.message}`))
```

# Why This Works

| Concept | Explanation |
|---------|-------------|
| **Base schema** | Common fields defined once |
| **Extension** | Specializations add unique fields |
| **Discrimination** | `type` field identifies specialization |
| **Type union** | All specializations as single type |
| **Exhaustive handling** | Switch ensures all specializations handled |
| **DRY** | Base fields not repeated |
| **Scalable** | Add new specializations without changing base |

# When to Use

- Products (physical/digital/service)
- Entities (user/admin/guest)
- Payments (card/bank/crypto)
- Content (article/video/podcast)
- Events (UserCreated/UserDeleted/UserUpdated)
- Documents (public/private/draft)
- Any domain with base + specializations

# Related Patterns

- [Extend Schemas](./extend-schemas.md)
- [Pick/Omit](./pick-omit.md)
- [Merge Schemas](./merge-schemas.md)
