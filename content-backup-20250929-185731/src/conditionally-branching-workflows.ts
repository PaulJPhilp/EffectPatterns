import { Effect } from "effect";

interface User {
  id: number;
  status: "active" | "inactive";
  roles: string[];
}

type UserError = "DbError" | "UserIsInactive" | "UserIsNotAdmin";

const findUser = (id: number): Effect.Effect<User, "DbError"> =>
  Effect.succeed({ id, status: "active", roles: ["admin"] });

// Reusable, testable predicates that document business rules.
const isActive = (user: User): Effect.Effect<boolean> =>
  Effect.succeed(user.status === "active");

const isAdmin = (user: User): Effect.Effect<boolean> =>
  Effect.succeed(user.roles.includes("admin"));

const program = (id: number): Effect.Effect<string, UserError> =>
  Effect.gen(function* () {
    // Find the user
    const user = yield* findUser(id);

    // Check if user is active
    const active = yield* isActive(user);
    if (!active) {
      return yield* Effect.fail("UserIsInactive" as const);
    }

    // Check if user is admin
    const admin = yield* isAdmin(user);
    if (!admin) {
      return yield* Effect.fail("UserIsNotAdmin" as const);
    }

    // Success case
    return `Welcome, admin user #${user.id}!`;
  });

// We can then handle the specific failures in a type-safe way.
const handled = program(123).pipe(
  Effect.match({
    onFailure: (error) => {
      switch (error) {
        case "UserIsNotAdmin":
          return "Access denied: requires admin role.";
        case "UserIsInactive":
          return "Access denied: user is not active.";
        case "DbError":
          return "Error: could not find user.";
        default:
          return `Unknown error: ${error}`;
      }
    },
    onSuccess: (result) => result
  })
);

// Run the program
const programWithLogging = Effect.gen(function* () {
  const result = yield* handled;
  yield* Effect.log(result);
  return result;
});

Effect.runPromise(programWithLogging);