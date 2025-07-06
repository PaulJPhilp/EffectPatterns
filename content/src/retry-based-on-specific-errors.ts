import { Effect, Data, Schedule, Duration } from "effect";

// Define specific, tagged errors for our API client
class ServerBusyError extends Data.TaggedError("ServerBusyError") {}
class NotFoundError extends Data.TaggedError("NotFoundError") {}

// A flaky API call that can fail in different ways
const flakyApiCall = Effect.try({
  try: () => {
    const random = Math.random();
    if (random < 0.5) {
      console.log("API call failed: Server is busy. Retrying...");
      throw new ServerBusyError();
    }
    if (random < 0.8) {
      console.log("API call failed: Resource not found. Not retrying.");
      throw new NotFoundError();
    }
    return { data: "success" };
  },
  catch: (e) => e as ServerBusyError | NotFoundError,
});

// A predicate that returns true only for the error we want to retry
const isRetryableError = (e: ServerBusyError | NotFoundError) =>
  e._tag === "ServerBusyError";

// A policy that retries 3 times, but only if the error is retryable
const selectiveRetryPolicy = Schedule.recurs(3).pipe(
  Schedule.whileInput(isRetryableError),
  Schedule.addDelay(() => "100 millis"),
);

const program = flakyApiCall.pipe(Effect.retry(selectiveRetryPolicy));

Effect.runPromise(program);