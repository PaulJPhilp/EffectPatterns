import { Effect, Stream } from "effect";

interface User {
  id: number;
  name: string;
}
interface PaginatedResponse {
  users: User[];
  nextPage: number | null;
}

// A mock API call that returns a page of users
const fetchUserPage = (
  page: number,
): Effect.Effect<PaginatedResponse, "ApiError"> =>
  Effect.succeed(
    page < 3
      ? {
          users: [
            { id: page * 2 + 1, name: `User ${page * 2 + 1}` },
            { id: page * 2 + 2, name: `User ${page * 2 + 2}` },
          ],
          nextPage: page + 1,
        }
      : { users: [], nextPage: null },
  ).pipe(Effect.delay("50 millis"));

// Stream.paginateEffect creates a stream from a paginated source
const userStream = Stream.paginateEffect(0, (page) =>
  fetchUserPage(page).pipe(
    Effect.map((response) => [response.users, response.nextPage]),
  ),
).pipe(
  // Flatten the stream of user arrays into a stream of individual users
  Stream.flatten,
);

// We can now process the stream of users.
// Stream.runForEach will pull from the stream until it's exhausted.
const program = Stream.runForEach(userStream, (user) =>
  Effect.log(`Processing user: ${user.name}`),
);

Effect.runPromise(program);