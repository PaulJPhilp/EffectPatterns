import { Effect } from "effect";

const getUser = (id: number): Effect.Effect<{ id: number; name: string }> =>
  Effect.succeed({ id, name: "Paul" });

const getPosts = (userId: number): Effect.Effect<{ title: string }[]> =>
  Effect.succeed([{ title: "My First Post" }, { title: "Second Post" }]);

const userPosts = getUser(123).pipe(
  Effect.flatMap((user) => getPosts(user.id))
);

// Demonstrate transforming Effect values
const program = Effect.gen(function* () {
  yield* Effect.log("=== Transform Effect Values Demo ===");

  // 1. Basic transformation with map
  yield* Effect.log("\n1. Transform with map:");
  const userWithUpperName = yield* getUser(123).pipe(
    Effect.map((user) => ({ ...user, name: user.name.toUpperCase() }))
  );
  yield* Effect.log("Transformed user:", userWithUpperName);

  // 2. Chain effects with flatMap
  yield* Effect.log("\n2. Chain effects with flatMap:");
  const posts = yield* userPosts;
  yield* Effect.log("User posts:", posts);

  // 3. Transform and combine multiple effects
  yield* Effect.log("\n3. Transform and combine multiple effects:");
  const userWithPosts = yield* getUser(456).pipe(
    Effect.flatMap((user) =>
      getPosts(user.id).pipe(
        Effect.map((posts) => ({
          user: user.name,
          postCount: posts.length,
          titles: posts.map((p) => p.title),
        }))
      )
    )
  );
  yield* Effect.log("User with posts:", userWithPosts);

  // 4. Transform with tap for side effects
  yield* Effect.log("\n4. Transform with tap for side effects:");
  const result = yield* getUser(789).pipe(
    Effect.tap((user) => Effect.log(`Processing user: ${user.name}`)),
    Effect.map((user) => `Hello, ${user.name}!`)
  );
  yield* Effect.log("Final result:", result);

  yield* Effect.log("\n✅ All transformations completed successfully!");
});

Effect.runPromise(program);
