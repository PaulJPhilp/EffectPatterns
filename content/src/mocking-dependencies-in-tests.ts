import { Effect, Layer } from "effect";
import { describe, it, expect } from "vitest";

// --- The Services ---
class EmailClient extends Effect.Tag("EmailClient")<
  EmailClient,
  { readonly send: (address: string, body: string) => Effect.Effect<void, "SendError"> }
>() {}

class Notifier extends Effect.Tag("Notifier")<
  Notifier,
  { readonly notifyUser: (userId: number, message: string) => Effect.Effect<void, "SendError"> }
>() {}

// The "Live" Notifier implementation, which depends on EmailClient
const NotifierLive = Layer.effect(
  Notifier,
  Effect.gen(function* () {
    const emailClient = yield* EmailClient;
    return Notifier.of({
      notifyUser: (userId, message) =>
        emailClient.send(`user-${userId}@example.com`, message),
    });
  }),
);

// --- The Test ---
describe("Notifier", () => {
  it("should call the email client with the correct address", () =>
    Effect.gen(function* () {
      // 1. Get the service we want to test
      const notifier = yield* Notifier;
      // 2. Run its logic
      yield* notifier.notifyUser(123, "Your invoice is ready.");
    }).pipe(
      // 3. Provide a mock implementation for its dependency
      Effect.provide(
        Layer.succeed(
          EmailClient,
          EmailClient.of({
            send: (address, body) =>
              Effect.sync(() => {
                // 4. Make assertions on the mock's behavior
                expect(address).toBe("user-123@example.com");
                expect(body).toBe("Your invoice is ready.");
              }),
          }),
        ),
      ),
      // 5. Provide the layer for the service under test
      Effect.provide(NotifierLive),
      // 6. Run the test
      Effect.runPromise,
    ));
});