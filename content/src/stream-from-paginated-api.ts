import { Effect, Stream, Chunk, Option } from 'effect';

// --- Mock Paginated API ---
interface User {
  id: number;
  name: string;
}

// Define FetchError as a class with a literal type tag
class FetchError {
  readonly _tag = 'FetchError' as const;
  constructor(readonly message: string) {}
}

// Helper to create FetchError instances
const fetchError = (message: string): FetchError => new FetchError(message);

const allUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

// This function simulates fetching a page of users from an API.
const fetchUsersPage = (
  page: number
): Effect.Effect<[Chunk.Chunk<User>, Option.Option<number>], FetchError> =>
  Effect.gen(function* () {
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // Simulate potential API errors
    if (page < 1) {
      return yield* Effect.fail(fetchError('Invalid page number'));
    }

    const users = Chunk.fromIterable(allUsers.slice(offset, offset + pageSize));

    const nextPage =
      Chunk.isNonEmpty(users) && allUsers.length > offset + pageSize
        ? Option.some(page + 1)
        : Option.none();

    yield* Effect.log(`Fetched page ${page}`);
    return [users, nextPage];
  });

// --- The Pattern ---
// Use paginateEffect, providing an initial state (page 1) and the fetch function.
const userStream = Stream.paginateEffect(1, fetchUsersPage);

const program = userStream.pipe(
  Stream.runCollect,
  Effect.map((users) => users.length),
  Effect.tap((totalUsers) => 
    Effect.log(`Total users fetched: ${totalUsers}`)
  ),
  Effect.catchTag('FetchError', (error) => 
    Effect.succeed(`Error fetching users: ${error.message}`)
  )
);

// Run the program
Effect.runPromise(program).then(console.log);

/*
Output:
... level=INFO msg="Fetched page 1"
... level=INFO msg="Fetched page 2"
... level=INFO msg="Fetched page 3"
... level=INFO msg="Total users fetched: 25"
25
*/