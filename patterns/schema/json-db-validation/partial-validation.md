---
id: schema-json-db-partial-validation
title: Validating Partial Documents
category: json-db-validation
skill: intermediate
tags:
  - schema
  - database
  - json
  - partial
  - patch
---

# Problem

REST APIs support PATCH requests that update only specific fields—users don't send the entire document, just the fields they want to change. But you still need to validate those fields against your schema. Using the same schema for PATCH and PUT leads to "field is required" errors on optional updates. You need a way to validate only the fields that are present, ignoring missing ones, while still enforcing constraints on the fields that are included.

# Solution

```typescript
import { Schema, Effect } from "effect";

// 1. Define full document schema
const ProductSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1)),
  description: Schema.String.pipe(Schema.minLength(10)),
  price: Schema.Number.pipe(Schema.positive()),
  stock: Schema.Number.pipe(Schema.int(), Schema.between(0, 10000)),
  category: Schema.Literal(
    "electronics",
    "clothing",
    "books",
    "other"
  ),
  active: Schema.Boolean,
});

type Product = typeof ProductSchema.Type;

// 2. Create partial schema (all fields optional)
const ProductPatchSchema = Schema.partial(ProductSchema);

type ProductPatch = typeof ProductPatchSchema.Type;

// 3. Validate full product (PUT)
const validateFullProduct = (input: unknown) =>
  Effect.gen(function* () {
    const product = yield* Schema.decodeUnknown(ProductSchema)(
      input
    ).pipe(
      Effect.mapError((error) => ({
        _tag: "ProductValidationError" as const,
        message: `Product data invalid: ${error.message}`,
      }))
    );

    return product;
  });

// 4. Validate partial product (PATCH)
const validateProductPatch = (input: unknown) =>
  Effect.gen(function* () {
    const patch = yield* Schema.decodeUnknown(
      ProductPatchSchema
    )(input).pipe(
      Effect.mapError((error) => ({
        _tag: "PatchValidationError" as const,
        message: `Patch data invalid: ${error.message}`,
      }))
    );

    // Ensure at least one field is present
    if (Object.keys(patch).length === 0) {
      return yield* Effect.fail({
        _tag: "EmptyPatchError" as const,
        message: "Patch must include at least one field",
      });
    }

    return patch;
  });

// 5. Apply patch to existing product
const applyProductPatch = (
  existing: Product,
  patch: ProductPatch
) =>
  Effect.gen(function* () {
    // Merge patch with existing (only override provided fields)
    const updated: Product = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(patch).filter(
          ([, v]) => v !== undefined
        )
      ),
    };

    // Re-validate full product after patch
    const validated = yield* validateFullProduct(updated);

    return validated;
  });

// 6. Database operations with partial validation
const updateProductInDb = (
  productId: string,
  patch: unknown
) =>
  Effect.gen(function* () {
    console.log(`📝 Validating PATCH for product ${productId}`);

    // 1. Validate patch structure
    const validatedPatch = yield* validateProductPatch(patch);

    // 2. Fetch existing product (simulated)
    const existing: Product = {
      id: productId,
      name: "Original Product",
      description:
        "This is the original product description",
      price: 99.99,
      stock: 100,
      category: "electronics",
      active: true,
    };

    // 3. Apply patch
    const updated = yield* applyProductPatch(
      existing,
      validatedPatch
    );

    console.log(`✅ Patch applied successfully`);
    return updated;
  });

// 7. Batch partial updates with error handling
const batchUpdateProducts = (
  updates: Array<{ id: string; patch: unknown }>
) =>
  Effect.gen(function* () {
    console.log(`\n🔄 Processing ${updates.length} updates...\n`);

    const results = yield* Effect.all(
      updates.map(({ id, patch }) =>
        updateProductInDb(id, patch).pipe(
          Effect.catchAll((error) =>
            Effect.succeed({
              id,
              success: false,
              error: error.message,
            } as const)
          )
        )
      )
    );

    const successful = results.filter(
      (r) => "name" in r
    );
    const failed = results.filter((r) => !("name" in r));

    return { successful, failed };
  });

// 8. Selective field updates
const updateProductName = (
  productId: string,
  newName: string
) =>
  Effect.gen(function* () {
    // Minimal patch - only one field
    const patch = { name: newName };

    const updated = yield* updateProductInDb(
      productId,
      patch
    );
    return updated;
  });

// 9. Complex partial update with validation
const complexProductUpdate = (
  productId: string,
  patch: unknown
) =>
  Effect.gen(function* () {
    // 1. Validate patch format
    const validated = yield* validateProductPatch(patch);

    // 2. Log what's changing
    const changedFields = Object.keys(validated);
    console.log(
      `📋 Fields to update: ${changedFields.join(", ")}`
    );

    // 3. Check for conflicting updates
    if (
      validated.stock !== undefined &&
      validated.stock < 0
    ) {
      return yield* Effect.fail({
        _tag: "BusinessLogicError" as const,
        message: "Stock cannot be negative",
      });
    }

    // 4. Apply patch
    const existing: Product = {
      id: productId,
      name: "Product",
      description: "A great product",
      price: 49.99,
      stock: 50,
      category: "other",
      active: true,
    };

    const updated = yield* applyProductPatch(
      existing,
      validated
    );

    console.log(`✅ Product updated successfully`);
    return updated;
  });

// 10. Usage: Different types of patches
Effect.runPromise(
  Effect.gen(function* () {
    console.log(
      "🛍️  Product PATCH Validation\n"
    );

    // Update just the name
    yield* updateProductName("prod-1", "New Product Name");

    // Complex update with multiple fields
    yield* complexProductUpdate("prod-2", {
      price: 79.99,
      stock: 150,
      category: "books",
    });

    // Batch updates with partial data
    const results = yield* batchUpdateProducts([
      { id: "prod-3", patch: { price: 49.99 } },
      { id: "prod-4", patch: { active: false } },
      { id: "prod-5", patch: { name: "", description: "x" } }, // This will fail validation
      { id: "prod-6", patch: {} }, // Empty patch (will fail)
    ]);

    console.log(
      `\n✅ Updated ${results.successful.length} products`
    );
    if (results.failed.length > 0) {
      console.log(
        `⚠️  ${results.failed.length} updates failed`
      );
    }
  })
)
  .catch((error) => {
    console.error(
      `❌ Error: ${error.message}`
    );
  });
```

# Why This Works

| Concept | Explanation |
|---------|-------------|
| `Schema.partial()` | Makes all fields optional while keeping type constraints |
| PATCH vs PUT | Different validation strategies for full vs partial updates |
| Field merging | Only updated fields override existing values |
| Re-validation | Full document valid after patch applied |
| Empty guard | Prevent meaningless empty patches |
| Batch operations | Handle multiple partial updates efficiently |
| Error granularity | Know exactly which fields failed validation |
| Type-safe merging | Updated document has full type after validation |

# When to Use

- REST APIs supporting PATCH requests
- Partial document updates (not full replacements)
- Form submissions that update only changed fields
- Database PATCH operations on JSON columns
- Gradual data updates where only some fields change
- User preference updates (only changed settings)
- Configuration updates (only modified settings)
- Preventing unnecessary database writes (only changed fields)

# Related Patterns

- [Validating JSON Database Columns](./basic.md)
- [PostgreSQL JSONB Validation](./postgres-jsonb.md)
- [Handling Schema Evolution](./schema-evolution.md)
- [Dependent Field Validation](../form-validation/dependent-fields.md)
