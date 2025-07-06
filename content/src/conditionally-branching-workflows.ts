import { Effect } from "effect";

interface User {
  id: number;
  status: "active" | "inactive";
  roles: string[];
}

const findUser = (id: number): Effect.Effect<User, "DbError"> =>
  Effect.succeed({ id, status: "active", roles: ["admin"] });

// Reusable, testable predicates that document business rules.
const isActive = (user: User) => user.status === "active";
const isAdmin = (user: User) => user.roles.includes("admin");

const program = (id: number) =>
  findUser(id).pipe(
    // If this predicate is false, the effect fails.
    Effect.filter(isActive, () => "UserIsInactive" as const),
    // If this one is false, the effect fails.
    Effect.filter(isAdmin, () => "UserIsNotAdmin" as const),
    // This part only runs if both filters pass.
    Effect.map((user) => `Welcome, admin user #${user.id}!`),
  );

// We can then handle the specific failures in a type-safe way.
const handled = program(123).pipe(
  Effect.catchTag("UserIsNotAdmin", () =>
    Effect.succeed("Access denied: requires admin role."),
  ),
);