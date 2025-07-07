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
  console.log("=== Transform Effect Values Demo ===");

  // 1. Basic transformation with map
  console.log("\n1. Transform with map:");
  const userWithUpperName = yield* getUser(123).pipe(
    Effect.map((user) => ({ ...user, name: user.name.toUpperCase() }))
  );
  console.log("Transformed user:", userWithUpperName);

  // 2. Chain effects with flatMap
  console.log("\n2. Chain effects with flatMap:");
  const posts = yield* userPosts;
  console.log("User posts:", posts);

  // 3. Transform and combine multiple effects
  console.log("\n3. Transform and combine multiple effects:");
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
  console.log("User with posts:", userWithPosts);

  // 4. Transform with tap for side effects
  console.log("\n4. Transform with tap for side effects:");
  const result = yield* getUser(789).pipe(
    Effect.tap((user) =>
      Effect.sync(() => console.log(`Processing user: ${user.name}`))
    ),
    Effect.map((user) => `Hello, ${user.name}!`)
  );
  console.log("Final result:", result);

  console.log("\n✅ All transformations completed successfully!");
});

Effect.runPromise(program);
