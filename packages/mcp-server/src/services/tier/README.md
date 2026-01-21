# Tier Service

Tier management and feature authorization for Free/Paid tiers.

## Overview

The `MCPTierService` manages tier-based access control, determining which features and endpoints are available for Free vs Paid tier users.

## API

### Tier Detection

#### `getTierMode(): Effect<TierMode, ConfigurationError>`
Get the current tier mode (free or paid).

```typescript
const mode = yield* tier.getTierMode();
console.log(mode); // "free" or "paid"
```

#### `isFreeTier(): Effect<boolean>`
Check if running in Free tier.

```typescript
const isFree = yield* tier.isFreeTier();
```

#### `isPaidTier(): Effect<boolean>`
Check if running in Paid tier.

```typescript
const isPaid = yield* tier.isPaidTier();
```

### Feature Access

#### `isEndpointAllowed(path: string): Effect<boolean>`
Check if endpoint is available in current tier.

```typescript
const allowed = yield* tier.isEndpointAllowed("/api/generate");
```

#### `isFeatureAvailable(featureName: string): Effect<boolean>`
Check if a feature is available.

```typescript
const available = yield* tier.isFeatureAvailable("Code Generation");
```

### Metadata

#### `getFeatureCategories(): Effect<FeatureCategory[]>`
Get all feature categories for current tier.

```typescript
const categories = yield* tier.getFeatureCategories();
categories.forEach(cat => {
  console.log(`${cat.name}: ${cat.features.length} features`);
  cat.features.forEach(f => console.log(`  - ${f}`));
});
```

#### `getUpgradeMessage(): Effect<string>`
Get tier-appropriate message (upgrade or all-features).

```typescript
const message = yield* tier.getUpgradeMessage();
console.log(message);
```

## Configuration

Set tier mode via environment:

```bash
# Free tier
TIER_MODE=free

# Paid tier
TIER_MODE=paid
```

## Free Tier Endpoints

Available:
- `/api/health` - Health check
- `/api/patterns` - Pattern search
- `/api/patterns/:id` - Pattern retrieval
- `/api/analyze-code` - Code analysis
- `/api/list-rules` - List rules

Blocked:
- `/api/generate` - Code generation
- `/api/analyze-consistency` - Consistency analysis
- `/api/apply-refactoring` - Refactoring
- `/api/trace-wiring` - Dependency tracing

## Free Tier Features

- Pattern Search
- Pattern Retrieval  
- Read-Only Analysis
- Code Review
- Infrastructure

## Paid Tier Features

All features above plus:
- Code Generation
- Consistency Analysis
- Refactoring Engine
- Dependency Tracing
- Workspace Management
- Multi-language Support
- Advanced Caching

## Example

```typescript
import { Effect } from "effect";
import { MCPTierService } from "./services/tier";

const program = Effect.gen(function* () {
  const tier = yield* MCPTierService;
  
  // Check tier
  const isFree = yield* tier.isFreeTier();
  
  // Check endpoint access
  const canGenerate = yield* tier.isEndpointAllowed("/api/generate");
  if (!canGenerate && isFree) {
    yield* logger.info("Feature requires paid tier");
    const message = yield* tier.getUpgradeMessage();
    console.log(message);
  }
  
  // Get available features
  const categories = yield* tier.getFeatureCategories();
  categories.forEach(cat => {
    console.log(`${cat.name}:`);
    cat.features.forEach(f => console.log(`  ✓ ${f}`));
  });
});

Effect.runPromise(program);
```

## Types

```typescript
type TierMode = "free" | "paid";

interface FeatureCategory {
  readonly name: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly tier: TierMode;
}

interface TierConfig {
  readonly mode: TierMode;
  readonly allowedEndpoints: readonly string[];
  readonly features: readonly FeatureCategory[];
}
```

## Testing

Run tier service tests:
```bash
bun run test src/services/tier/__tests__
```

## See Also

- [Configuration Service](../config) - For TIER_MODE configuration
- [Rate Limit Service](../rate-limit) - Additional Free tier restriction
