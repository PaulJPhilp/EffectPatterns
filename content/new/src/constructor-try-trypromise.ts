import { Effect } from "effect";

// Synchronous: Wrap code that may throw
const effectSync = Effect.try({
  try: () => JSON.parse("{ invalid json }"),
  catch: (error) => `Parse error: ${String(error)}`
}); // Effect<string, never, never>

// Asynchronous: Wrap a promise that may reject
const effectAsync = Effect.tryPromise({
  try: () => fetch("https://api.example.com/data").then(res => res.json()),
  catch: (error) => `Network error: ${String(error)}`
}); // Effect<string, any, never>