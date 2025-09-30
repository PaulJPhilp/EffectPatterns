# Duration Patterns

## Representing Time Spans with Duration

Use Duration to model and manipulate time spans, enabling safe and expressive time-based logic.

### Example

```typescript
import { Duration } from "effect";

// Create durations using helpers
const oneSecond = Duration.seconds(1);
const fiveMinutes = Duration.minutes(5);
const twoHours = Duration.hours(2);

// Add, subtract, and compare durations
const total = Duration.sum(oneSecond, fiveMinutes); // 5 min 1 sec
const isLonger = Duration.greaterThan(twoHours, fiveMinutes); // true

// Convert to milliseconds or human-readable format
const ms = Duration.toMillis(fiveMinutes); // 300000
const readable = Duration.format(oneSecond); // "1s"

```

**Explanation:**  
- `Duration` is immutable and type-safe.
- Use helpers for common intervals and arithmetic for composition.
- Prefer `Duration` over raw numbers for all time-based logic.

---

