import { Effect } from "effect";

// Trace a database query with a custom span
const fetchUser = Effect.sync(() => {
  // ...fetch user from database
  return { id: 1, name: "Alice" };
}).pipe(Effect.withSpan("db.fetchUser"));

// Trace an HTTP request with additional attributes
const fetchData = Effect.tryPromise({
  try: () => fetch("https://api.example.com/data").then((res) => res.json()),
  catch: (err) => `Network error: ${String(err)}`,
}).pipe(
  Effect.withSpan("http.fetchData", {
    attributes: { url: "https://api.example.com/data" },
  })
);

// Use spans in a workflow
const program = Effect.gen(function* () {
  yield* Effect.log("Starting workflow").pipe(
    Effect.withSpan("workflow.start")
  );
  const user = yield* fetchUser;
  yield* Effect.log(`Fetched user: ${user.name}`).pipe(
    Effect.withSpan("workflow.end")
  );
});
