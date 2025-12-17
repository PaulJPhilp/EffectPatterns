import { Effect, Option, Either } from "effect";

// Example 1: Option.match for user lookup
const getUserName = (id: number): Option.Option<string> => {
  return id === 1 ? Option.some("Alice") : Option.none();
};

const displayUser = (id: number) =>
  getUserName(id).pipe(
    Option.match({
      onNone: () => "Guest User",
      onSome: (name) => `Hello, ${name}!`,
    })
  );

// Example 2: Either.match for validation
const validateAge = (age: number): Either.Either<number, string> => {
  return age >= 18
    ? Either.right(age)
    : Either.left("Must be 18 or older");
};

const processAge = (age: number) =>
  validateAge(age).pipe(
    Either.match({
      onLeft: (error) => `Validation failed: ${error}`,
      onRight: (validAge) => `Age ${validAge} is valid`,
    })
  );

// Example 3: Nested matching
interface UserProfile {
  name: string;
  age: number;
}

const getUserProfile = (
  id: number
): Option.Option<Either.Either<UserProfile, string>> => {
  // Simulates looking up user and validating their profile
  if (id === 0) return Option.none(); // User not found
  if (id === 1) return Option.some(Either.left({ name: "Unknown", age: 0 }));
  return Option.some(Either.right("Success"));
};

const displayProfile = (id: number) =>
  getUserProfile(id).pipe(
    Option.match({
      onNone: () => "User not found",
      onSome: (result) =>
        result.pipe(
          Either.match({
            onLeft: (profile: UserProfile) => `${profile.name} (${profile.age})`,
            onRight: (msg: string) => `Message: ${msg}`,
          })
        ),
    })
  );

// Run examples
Effect.runPromise(
  Effect.gen(function* () {
    console.log("=== Example 1: Option.match ===");
    console.log("User 1:", displayUser(1)); // "Hello, Alice!"
    console.log("User 999:", displayUser(999)); // "Guest User"

    console.log("\n=== Example 2: Either.match ===");
    console.log("Age 25:", processAge(25)); // "Age 25 is valid"
    console.log("Age 15:", processAge(15)); // "Validation failed: Must be 18 or older"

    console.log("\n=== Example 3: Nested matching ===");
    console.log("Profile 0:", displayProfile(0)); // "User not found"
    console.log("Profile 1:", displayProfile(1)); // "Error: Profile incomplete"
    console.log("Profile 2:", displayProfile(2)); // "Bob (25)"
  })
);
