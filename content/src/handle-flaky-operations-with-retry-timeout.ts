import { Effect, Schedule, Duration } from "effect";

// A flaky API call that might fail or be slow
const flakyApiCall = Effect.tryPromise({
  try: async () => {
    if (Math.random() > 0.3) {
      console.log("API call failed, will retry...");
      throw new Error("API Error");
    }
    await new Promise((res) => setTimeout(res, Math.random() * 3000)); // Slow call
    return { data: "some important data" };
  },
  catch: () => "ApiError" as const,
});

// Define a retry policy: exponential backoff, up to 3 retries
const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.compose(Schedule.recurs(3)),
);

const program = flakyApiCall.pipe(
  // Apply the timeout to each individual attempt
  Effect.timeout("2 seconds"),
  // Apply the retry policy to the entire timed-out effect
  Effect.retry(retryPolicy),
);

Effect.runPromise(program).then(console.log).catch(console.error);