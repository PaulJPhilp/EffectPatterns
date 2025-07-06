import { Effect, Schema, Data } from "effect";

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
  console.log("Validating users...\n");
  
  for (const input of invalidInputs) {
    const result = yield* Effect.either(validateUser(input));
    
    console.log(`Validating user: ${input.name} <${input.email}>`);
    
    yield* Effect.match(result, {
      onFailure: (error) => Effect.sync(() => {
        console.log("❌ Validation failed:");
        console.log(error.message);
        console.log(); // Empty line for readability
      }),
      onSuccess: (user) => Effect.sync(() => {
        console.log("✅ User is valid:", user);
        console.log(); // Empty line for readability
      })
    });
  }
});

// Run the program
Effect.runSync(program);