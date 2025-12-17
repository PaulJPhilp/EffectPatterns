import { Brand, Schema, Effect } from "effect";

// Define a branded type for Email
type Email = Brand.Brand<string, "Email">;

// Create a Schema for Email validation
const EmailSchema = Schema.String.pipe(
  Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/)
).pipe(
  Schema.brand("Email")
);

// Parse and validate an email at runtime
const parseEmail = (input: string) =>
  Effect.tryPromise({
    try: () => Promise.resolve(Schema.decodeSync(EmailSchema)(input)),
    catch: (err) => new Error(`Invalid email: ${String(err)}`),
  });

// Usage
parseEmail("user@example.com").pipe(
  Effect.match({
    onSuccess: (email) => console.log("Valid email:", email),
    onFailure: (err) => console.error(err),
  })
);