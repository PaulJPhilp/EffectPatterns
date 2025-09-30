import { Effect, Layer } from "effect";

// --- The Services ---
interface EmailClientService {
  send: (address: string, body: string) => Effect.Effect<void>
}

class EmailClient extends Effect.Service<EmailClientService>()(
  "EmailClient",
  {
    sync: () => ({
      send: (address: string, body: string) => 
        Effect.sync(() => Effect.log(`Sending email to ${address}: ${body}`))
    })
  }
) {}

interface NotifierService {
  notifyUser: (userId: number, message: string) => Effect.Effect<void>
}

class Notifier extends Effect.Service<NotifierService>()(
  "Notifier",
  {
    effect: Effect.gen(function* () {
      const emailClient = yield* EmailClient;
      return {
        notifyUser: (userId: number, message: string) =>
          emailClient.send(`user-${userId}@example.com`, message)
      };
    }),
    dependencies: [EmailClient.Default]
  }
) {}

// Create a program that uses the Notifier service
const program = Effect.gen(function* () {
  yield* Effect.log("Using default EmailClient implementation...");
  const notifier = yield* Notifier;
  yield* notifier.notifyUser(123, "Your invoice is ready.");

  // Create mock EmailClient that logs differently
  yield* Effect.log("\nUsing mock EmailClient implementation...");
  const mockEmailClient = Layer.succeed(
    EmailClient,
    {
      send: (address: string, body: string) =>
        // Directly return the Effect.log without nesting it in Effect.sync
        Effect.log(`MOCK: Would send to ${address} with body: ${body}`)
    } as EmailClientService
  );

  // Run the same notification with mock client
  yield* Effect.gen(function* () {
    const notifier = yield* Notifier;
    yield* notifier.notifyUser(123, "Your invoice is ready.");
  }).pipe(
    Effect.provide(mockEmailClient)
  );
});

// Run the program
Effect.runPromise(
  Effect.provide(program, Notifier.Default)
);