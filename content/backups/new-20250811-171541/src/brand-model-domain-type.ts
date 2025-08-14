import { Brand, Effect } from "effect";

type Email = string & Brand.Brand<"Email">;
const Email = Brand.nominal<Email>();

function sendWelcome(email: Email) {
  return Effect.log(`Welcome email sent to: ${email}`);
}

const email = Email("user@example.com");

const program = Effect.gen(function* () {
  yield* Effect.log("Demonstrating branded type Email:");
  yield* sendWelcome(email);
  return email;
});

Effect.runPromise(program);
