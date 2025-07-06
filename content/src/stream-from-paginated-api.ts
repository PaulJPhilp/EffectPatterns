import { Effect, Stream, Chunk, Option } from 'effect';

// --- Mock Paginated API ---
interface User {
  id: number;
  name: string;
}

const allUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

// This function simulates fetching a page of users from an API.
const fetchUsersPage = (
  page: number
): Effect.Effect<[Chunk.Chunk<User>, Option.Option<number>], Error> => {
  const pageSize = 10;
  const offset = (page - 1) * pageSize;
  const users = Chunk.fromIterable(allUsers.slice(offset, offset + pageSize));

  const nextPage =
    Chunk.isNonEmpty(users) && allUsers.length > offset + pageSize
      ? Option.some(page + 1)
      : Option.none();

  return Effect.succeed([users, nextPage]).pipe(
    Effect.tap(() => Effect.log(`Fetched page ${page}`))
  );
};

// --- The Pattern ---
// Use paginateEffect, providing an initial state (page 1) and the fetch function.
const userStream = Stream.paginateEffect(1, fetchUsersPage);

const program = userStream.pipe(
  Stream.runCollect,
  Effect.map((users) => users.length)
);

Effect.runPromise(program).then((totalUsers) => {
  console.log(`Total users fetched from all pages: ${totalUsers}`);
});
/*
Output:
... level=INFO msg="Fetched page 1"
... level=INFO msg="Fetched page 2"
... level=INFO msg="Fetched page 3"
Total users fetched from all pages: 25
*/