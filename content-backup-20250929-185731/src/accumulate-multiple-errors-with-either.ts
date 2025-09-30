import { Effect, Schema, Data, Either } from "effect";

// Define validation error type
class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

// Define user type
type User = {
  name: string;
  email: string;
};

// Define schema with custom validation
const UserSchema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(3),
    Schema.filter((name) => /^[A-Za-z\s]+$/.test(name), {
      message: () => "name must contain only letters and spaces"
    })
  ),
  email: Schema.String.pipe(
    Schema.pattern(/@/),
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "email must be a valid email address"
    })
  ),
});

// Example inputs
const invalidInputs: User[] = [
  {
    name: "Al", // Too short
    email: "bob-no-at-sign.com", // Invalid pattern
  },
  {
    name: "John123", // Contains numbers
    email: "john@incomplete", // Invalid email
  },
  {
    name: "Alice Smith", // Valid
    email: "alice@example.com", // Valid
  }
];

// Validate a single user
const validateUser = (input: User) =>
  Effect.gen(function* () {
    const result = yield* Schema.decode(UserSchema)(input, { errors: "all" });
    return result;
  });

// Process multiple users and accumulate all errors
const program = Effect.gen(function* () {
  yield* Effect.log("Validating users...\n");
  
  for (const input of invalidInputs) {
    const result = yield* Effect.either(validateUser(input));
    
    yield* Effect.log(`Validating user: ${input.name} <${input.email}>`);
    
    // Handle success and failure cases separately for clarity
    // Using Either.match which is the idiomatic way to handle Either values
    yield* Either.match(result, {
      onLeft: (error) => Effect.gen(function* () {
        yield* Effect.log("❌ Validation failed:");
        yield* Effect.log(error.message);
        yield* Effect.log(""); // Empty line for readability
      }),
      onRight: (user) => Effect.gen(function* () {
        yield* Effect.log(`✅ User is valid: ${JSON.stringify(user)}`);
        yield* Effect.log(""); // Empty line for readability
      })
    })
  }
});

// Run the program
Effect.runSync(program);