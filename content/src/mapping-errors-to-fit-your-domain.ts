import { Effect, Data } from "effect";

// Low-level, specific errors from the database layer
class ConnectionError extends Data.TaggedError("ConnectionError") {}
class QueryError extends Data.TaggedError("QueryError") {}

// A generic error for the repository layer
class RepositoryError extends Data.TaggedError("RepositoryError")<{
  readonly cause: unknown;
}> {}

// The inner service
const dbQuery = (): Effect.Effect<
  { name: string },
  ConnectionError | QueryError
> => Effect.fail(new ConnectionError());

// The outer service uses `mapError` to create a clean boundary.
// Its public signature only exposes `RepositoryError`.
const findUser = (): Effect.Effect<{ name: string }, RepositoryError> =>
  dbQuery().pipe(
    Effect.mapError(
      (error) => new RepositoryError({ cause: error }),
    ),
  );