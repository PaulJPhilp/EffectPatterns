import { Brand, Schema, Effect } from "effect";

// Define a branded type for Email
type Email = Brand.Branded<string, "Email">;

// Create a Schema for Email validation
const EmailSchema = Schema.string.pipe(
  Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/), // Simple email regex
  Brand.schema<Email>() // Attach the brand
);

// Parse and validate an email at runtime
const parseEmail = (input: string) =>
  Effect.try({
    try: () => Schema.decodeSync(EmailSchema)(input),
    catch: (err) => `Invalid email: ${String(err)}`
  });

// Usage
parseEmail("user@example.com").pipe(
  Effect.match({
    onSuccess: (email) => console.log("Valid email:", email),
    onFailure: (err) => console.error(err)
  })
);