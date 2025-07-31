import { Brand, Schema, Effect } from "effect";

export type Email = string & Brand.Brand<"Email">;
export const Email = Brand.nominal<Email>();

export const EmailSchema = Schema.String.pipe(
  Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/),
  Schema.brand("Email")
);

function parseEmail(input: string) {
  return Schema.decodeUnknown(EmailSchema)(input);
}

const program = Effect.gen(function* () {
  yield* Effect.log("Parsing a valid email...");
  const valid = yield* parseEmail("user@example.com");
  yield* Effect.log(`Successfully parsed: ${valid}`);

  yield* Effect.log("\nParsing an invalid email...");
  const invalid = yield* Effect.either(parseEmail("not-an-email"));
  yield* Effect.log(`Result of parsing invalid email: ${JSON.stringify(invalid)}`);
});

Effect.runPromise(program);
