---
name: effect-patterns-value-handling
description: Effect-TS patterns for Value Handling. Use when working with value handling in Effect-TS applications.
---
# Effect-TS Patterns: Value Handling
This skill provides 2 curated Effect-TS patterns for value handling.
Use this skill when working on tasks related to:
- value handling
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟡 Intermediate Patterns

### Optional Pattern 1: Handling None and Some Values

**Rule:** Use Option to represent values that may not exist, replacing null/undefined with type-safe Option that forces explicit handling.

**Good Example:**

This example demonstrates Option handling patterns.

```typescript
import { Effect, Option } from "effect";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Profile {
  bio: string;
  website?: string;
  location?: string;
}

const program = Effect.gen(function* () {
  console.log(
    `\n[OPTION HANDLING] None/Some values and pattern matching\n`
  );

  // Example 1: Creating Options
  console.log(`[1] Creating Option values:\n`);

  const someValue: Option.Option<string> = Option.some("data");
  const noneValue: Option.Option<string> = Option.none();

  const displayOption = <T,>(opt: Option.Option<T>, label: string) =>
    Effect.gen(function* () {
      if (Option.isSome(opt)) {
        yield* Effect.log(`${label}: Some(${opt.value})`);
      } else {
        yield* Effect.log(`${label}: None`);
      }
    });

  yield* displayOption(someValue, "someValue");
  yield* displayOption(noneValue, "noneValue");

  // Example 2: Creating from nullable values
  console.log(`\n[2] Converting nullable to Option:\n`);

  const possiblyNull = (shouldExist: boolean): string | null =>
    shouldExist ? "found" : null;

  const toOption = (value: string | null | undefined): Option.Option<string> =>
    value ? Option.some(value) : Option.none();

  const opt1 = toOption(possiblyNull(true));
  const opt2 = toOption(possiblyNull(false));

  yield* displayOption(opt1, "toOption(found)");
  yield* displayOption(opt2, "toOption(null)");

  // Example 3: Pattern matching on Option
  console.log(`\n[3] Pattern matching with match():\n`);

  const userId: Option.Option<string> = Option.some("user-123");

  const message = Option.match(userId, {
    onSome: (id) => `User ID: ${id}`,
    onNone: () => "No user found",
  });

  yield* Effect.log(`[MATCH] ${message}`);

  const emptyUserId: Option.Option<string> = Option.none();

  const emptyMessage = Option.match(emptyUserId, {
    onSome: (id) => `User ID: ${id}`,
    onNone: () => "No user found",
  });

  yield* Effect.log(`[MATCH] ${emptyMessage}\n`);

  // Example 4: Transforming with map
  console.log(`[4] Transforming values with map():\n`);

  const userCount: Option.Option<number> = Option.some(42);

  const doubled = Option.map(userCount, (count) => count * 2);

  yield* displayOption(doubled, "doubled");

  // Chaining maps
  const email: Option.Option<string> = Option.some("user@example.com");

  const domain = Option.map(email, (e) =>
    e.split("@")[1] ?? "unknown"
  );

  yield* displayOption(domain, "email domain");

  // Example 5: Chaining with flatMap
  console.log(`\n[5] Chaining operations with flatMap():\n`);

  const findUser = (id: string): Option.Option<User> =>
    id === "user-1"
      ? Option.some({ id, name: "Alice", email: "alice@example.com" })
      : Option.none();

  const getProfile = (userId: string): Option.Option<Profile> =>
    userId === "user-1"
      ? Option.some({ bio: "Developer", website: "alice.dev" })
      : Option.none();

  const userId2 = Option.some("user-1");

  // Chained operations: userId -> user -> profile
  const profileChain = Option.flatMap(userId2, (id) =>
    Option.flatMap(findUser(id), (user) =>
      getProfile(user.id)
    )
  );

  const profileResult = Option.match(profileChain, {
    onSome: (profile) => `Bio: ${profile.bio}, Website: ${profile.website}`,
    onNone: () => "No profile found",
  });

  yield* Effect.log(`[CHAIN] ${profileResult}\n`);

  // Example 6: Fallback values with getOrElse
  console.log(`[6] Default values with getOrElse():\n`);

  const optionalStatus: Option.Option<string> = Option.none();

  const status = Option.getOrElse(optionalStatus, () => "unknown");

  yield* Effect.log(`[DEFAULT] Status: ${status}`);

  // Real value
  const knownStatus: Option.Option<string> = Option.some("active");

  const realStatus = Option.getOrElse(knownStatus, () => "unknown");

  yield* Effect.log(`[VALUE] Status: ${realStatus}\n`);

  // Example 7: Filter with predicate
  console.log(`[7] Filtering with conditions:\n`);

  const ageOption: Option.Option<number> = Option.some(25);

  const isAdult = Option.filter(ageOption, (age) => age >= 18);

  yield* displayOption(isAdult, "Adult check (25)");

  const ageOption2: Option.Option<number> = Option.some(15);

  const isAdult2 = Option.filter(ageOption2, (age) => age >= 18);

  yield* displayOption(isAdult2, "Adult check (15)");

  // Example 8: Multiple Options (all present?)
  console.log(`\n[8] Combining multiple Options:\n`);

  const firstName: Option.Option<string> = Option.some("John");
  const lastName: Option.Option<string> = Option.some("Doe");
  const middleName: Option.Option<string> = Option.none();

  // All three present?
  const allPresent = Option.all([firstName, lastName, middleName]);

  yield* displayOption(allPresent, "All present");

  // Just two
  const twoPresent = Option.all([firstName, lastName]);

  yield* displayOption(twoPresent, "Two present");

  // Example 9: Converting Option to Error
  console.log(`\n[9] Converting Option to Result/Error:\n`);

  const optionalConfig: Option.Option<{ apiKey: string }> = Option.none();

  const configOrError = Option.match(optionalConfig, {
    onSome: (config) => config,
    onNone: () => {
      throw new Error("Configuration not found");
    },
  });

  // In real code, would catch error
  const result = Option.match(optionalConfig, {
    onSome: (config) => ({ success: true, value: config }),
    onNone: () => ({ success: false, error: "config-not-found" }),
  });

  yield* Effect.log(`[CONVERT] ${JSON.stringify(result)}\n`);

  // Example 10: Option in business logic
  console.log(`[10] Practical: Optional user settings:\n`);

  const userSettings: Option.Option<{
    theme: string;
    notifications: boolean;
  }> = Option.some({
    theme: "dark",
    notifications: true,
  });

  const getTheme = Option.map(userSettings, (s) => s.theme);
  const theme = Option.getOrElse(getTheme, () => "light"); // Default

  yield* Effect.log(`[SETTING] Theme: ${theme}`);

  // No settings
  const noSettings: Option.Option<{ theme: string; notifications: boolean }> =
    Option.none();

  const noTheme = Option.map(noSettings, (s) => s.theme);
  const defaultTheme = Option.getOrElse(noTheme, () => "light");

  yield* Effect.log(`[DEFAULT] Theme: ${defaultTheme}`);
});

Effect.runPromise(program);
```

---

**Rationale:**

Option enables null-safe programming:

- **Some(value)**: Value exists
- **None**: Value doesn't exist
- **Pattern matching**: Handle both cases
- **Chaining**: Compose operations safely
- **Fallbacks**: Default values
- **Conversions**: Option ↔ Error

Pattern: Use `Option.isSome()`, `Option.isNone()`, `match()`, `map()`, `flatMap()`

---


Null/undefined causes widespread bugs:

**Problem 1: Billion-dollar mistake**
- Tony Hoare invented null in ALGOL in 1965
- Created "billion-dollar mistake"
- 90% of security vulnerabilities involve null handling

**Problem 2: Undefined behavior**
- `user.profile.name` - any property could be null
- Runtime error: "Cannot read property 'name' of undefined"
- No compile-time warning
- Production crash

**Problem 3: Silent failures**
- Function returns null on failure
- Caller doesn't check
- Uses null as if it's a value
- Corrupts state downstream

**Problem 4: Conditional hell**
```javascript
if (user !== null && user.profile !== null && user.profile.name !== null) {
  // Do thing
}
```

Solutions:

**Option type**:
- `Some(value)` = value exists
- `None` = value doesn't exist
- Type system forces checking
- No silent null checks possible

**Pattern matching**:
- `Option.match()`
- Handle both cases explicitly
- Compiler warns if you miss one

**Chaining**:
- `option.map().flatMap().match()`
- Pipeline of operations
- Null-safe by design

---

---


## 🟠 Advanced Patterns

### Optional Pattern 2: Optional Chaining and Composition

**Rule:** Use Option combinators (map, flatMap, ap) to compose operations that may fail, creating readable and maintainable pipelines.

**Good Example:**

This example demonstrates optional chaining patterns.

```typescript
import { Effect, Option, pipe } from "effect";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Profile {
  bio: string;
  website?: string;
  avatar?: string;
}

interface Settings {
  theme: "light" | "dark";
  notifications: boolean;
  language: string;
}

const program = Effect.gen(function* () {
  console.log(`\n[OPTIONAL CHAINING] Composing Option operations\n`);

  // Example 1: Simple chain with map
  console.log(`[1] Chaining transformations with map():\n`);

  const userId: Option.Option<string> = Option.some("user-42");

  const userDisplayId = Option.map(userId, (id) => `User#${id}`);

  const idMessage = Option.match(userDisplayId, {
    onSome: (display) => display,
    onNone: () => "No user ID",
  });

  yield* Effect.log(`[CHAIN 1] ${idMessage}`);

  // Chained maps
  const email: Option.Option<string> = Option.some("alice@example.com");

  const emailParts = pipe(
    email,
    Option.map((e) => e.toLowerCase()),
    Option.map((e) => e.split("@")),
    Option.map((parts) => parts[0]) // username
  );

  const username = Option.getOrElse(emailParts, () => "unknown");

  yield* Effect.log(`[USERNAME] ${username}\n`);

  // Example 2: FlatMap for chaining operations that return Option
  console.log(`[2] Chaining operations with flatMap():\n`);

  const findUser = (id: string): Option.Option<User> =>
    id === "user-42"
      ? Option.some({
          id,
          name: "Alice",
          email: "alice@example.com",
        })
      : Option.none();

  const getProfile = (userId: string): Option.Option<Profile> =>
    userId === "user-42"
      ? Option.some({
          bio: "Software engineer",
          website: "alice.dev",
          avatar: "https://example.com/avatar.jpg",
        })
      : Option.none();

  const userProfile = pipe(
    Option.some("user-42"),
    Option.flatMap((id) => findUser(id)),
    Option.flatMap((user) => getProfile(user.id))
  );

  const profileInfo = Option.match(userProfile, {
    onSome: (profile) => `Bio: ${profile.bio}, Website: ${profile.website}`,
    onNone: () => "Profile not found",
  });

  yield* Effect.log(`[PROFILE] ${profileInfo}\n`);

  // Example 3: Complex pipeline
  console.log(`[3] Complex pipeline (user → profile → settings → theme):\n`);

  const getSettings = (userId: string): Option.Option<Settings> =>
    userId === "user-42"
      ? Option.some({
          theme: "dark",
          notifications: true,
          language: "en",
        })
      : Option.none();

  const userTheme = pipe(
    Option.some("user-42"),
    Option.flatMap((id) => findUser(id)),
    Option.flatMap((user) => getSettings(user.id)),
    Option.map((settings) => settings.theme)
  );

  const theme = Option.getOrElse(userTheme, () => "light");

  yield* Effect.log(`[THEME] ${theme}`);

  // Even if any step is None, result is None
  const invalidUserTheme = pipe(
    Option.some("invalid-user"),
    Option.flatMap((id) => findUser(id)),
    Option.flatMap((user) => getSettings(user.id)),
    Option.map((settings) => settings.theme)
  );

  const invalidTheme = Option.getOrElse(invalidUserTheme, () => "light");

  yield* Effect.log(`[DEFAULT THEME] ${invalidTheme}\n`);

  // Example 4: Apply (ap) for combining independent Options
  console.log(`[4] Combining values with ap():\n`);

  const firstName: Option.Option<string> = Option.some("John");
  const lastName: Option.Option<string> = Option.some("Doe");

  // Create a function wrapped in Option
  const combineNames = (first: string) => (last: string) =>
    `${first} ${last}`;

  const fullName = pipe(
    Option.some(combineNames),
    Option.ap(firstName),
    Option.ap(lastName)
  );

  const name = Option.getOrElse(fullName, () => "Unknown");

  yield* Effect.log(`[COMBINED] ${name}`);

  // If any is None
  const noLastName: Option.Option<string> = Option.none();

  const incompleteName = pipe(
    Option.some(combineNames),
    Option.ap(firstName),
    Option.ap(noLastName)
  );

  const incompleteFull = Option.getOrElse(incompleteName, () => "Incomplete");

  yield* Effect.log(`[INCOMPLETE] ${incompleteFull}\n`);

  // Example 5: Traverse for mapping over collections
  console.log(`[5] Working with collections (traverse):\n`);

  const userIds: string[] = ["user-42", "user-99", "user-1"];

  // Try to load all users
  const allUsers = Option.all(
    userIds.map((id) => findUser(id))
  );

  const usersMessage = Option.match(allUsers, {
    onSome: (users) => `Loaded ${users.length} users`,
    onNone: () => "Some users not found",
  });

  yield* Effect.log(`[TRAVERSE] ${usersMessage}\n`);

  // Example 6: Or/recovery with multiple options
  console.log(`[6] Fallback chains with orElse():\n`);

  const getPrimaryEmail = (): Option.Option<string> => Option.none();
  const getSecondaryEmail = (): Option.Option<string> =>
    Option.some("backup@example.com");
  const getTertiaryEmail = (): Option.Option<string> =>
    Option.some("tertiary@example.com");

  const email1 = pipe(
    getPrimaryEmail(),
    Option.orElse(() => getSecondaryEmail()),
    Option.orElse(() => getTertiaryEmail())
  );

  const contactEmail = Option.getOrElse(email1, () => "no-email@example.com");

  yield* Effect.log(`[FALLBACK] Using email: ${contactEmail}\n`);

  // Example 7: Filtering options
  console.log(`[7] Filtering with predicates:\n`);

  const age: Option.Option<number> = Option.some(25);

  const canVote = pipe(
    age,
    Option.filter((a) => a >= 18)
  );

  const voteStatus = Option.match(canVote, {
    onSome: () => "Can vote",
    onNone: () => "Too young to vote",
  });

  yield* Effect.log(`[FILTER] ${voteStatus}`);

  // Multiple filters in chain
  const score: Option.Option<number> = Option.some(85);

  const isAGrade = pipe(
    score,
    Option.filter((s) => s >= 80),
    Option.filter((s) => s < 90)
  );

  const grade = Option.match(isAGrade, {
    onSome: () => "Grade A",
    onNone: () => "Not in A range",
  });

  yield* Effect.log(`[GRADES] ${grade}\n`);

  // Example 8: Practical: Database query chain
  console.log(`[8] Real-world: Database record chain:\n`);

  const getRecord = (id: string): Option.Option<{ data: string; nested: { value: number } }> =>
    id === "rec-1"
      ? Option.some({
          data: "content",
          nested: { value: 42 },
        })
      : Option.none();

  const recordValue = pipe(
    Option.some("rec-1"),
    Option.flatMap((id) => getRecord(id)),
    Option.map((rec) => rec.nested),
    Option.map((nested) => nested.value),
    Option.map((value) => value * 2)
  );

  const finalValue = Option.getOrElse(recordValue, () => 0);

  yield* Effect.log(`[VALUE] ${finalValue}`);

  // Missing record
  const missingValue = pipe(
    Option.some("rec-999"),
    Option.flatMap((id) => getRecord(id)),
    Option.map((rec) => rec.nested),
    Option.map((nested) => nested.value),
    Option.map((value) => value * 2)
  );

  const defaultValue = Option.getOrElse(missingValue, () => 0);

  yield* Effect.log(`[DEFAULT] ${defaultValue}\n`);

  // Example 9: Conditional chaining
  console.log(`[9] Conditional paths:\n`);

  const loadUserWithFallback = (id: string) =>
    pipe(
      findUser(id),
      Option.flatMap((user) =>
        // Only get premium features if user exists
        user.name.includes("Alice")
          ? Option.some({ ...user, isPremium: true })
          : Option.none()
      ),
      Option.orElse(() =>
        // Fallback: return basic user
        findUser(id)
      )
    );

  const result1 = loadUserWithFallback("user-42");
  const result2 = loadUserWithFallback("user-99");

  yield* Effect.log(
    `[CONDITIONAL 1] ${Option.match(result1, { onSome: (u) => `${u.name}`, onNone: () => "Not found" })}`
  );

  yield* Effect.log(
    `[CONDITIONAL 2] ${Option.match(result2, { onSome: (u) => `${u.name}`, onNone: () => "Not found" })}`
  );
});

Effect.runPromise(program);
```

---

**Rationale:**

Option chaining enables elegant data flows:

- **map**: Transform value if present
- **flatMap**: Chain operations that return Option
- **ap**: Apply functions wrapped in Option
- **traverse**: Map over collections with Option
- **composition**: Combine multiple chains
- **recovery**: Provide fallbacks

Pattern: Use `Option.map()`, `flatMap()`, `ap()`, pipe operators

---


Nested option handling becomes complex:

**Problem 1: Pyramid of doom**
```typescript
if (user !== null) {
  if (user.profile !== null) {
    if (user.profile.preferences !== null) {
      if (user.profile.preferences.theme !== null) {
        // Finally do thing
      }
    }
  }
}
```

**Problem 2: Repeated null checks**
- Every step needs its own check
- Code duplicates
- Hard to refactor
- Bugs easy to introduce

**Problem 3: Logic scattered**
- Transformation logic mixed with null checks
- Hard to understand intent
- Error-prone

Solutions:

**Option chaining**:
- `None` flows through automatically
- Transform only if `Some`
- No intermediate checks needed

**Composition**:
- Combine functions cleanly
- Separate concerns
- Reusable pieces

**Fallbacks**:
- `orElse()` for recovery
- Chain multiple alternatives
- Graceful degradation

---

---


