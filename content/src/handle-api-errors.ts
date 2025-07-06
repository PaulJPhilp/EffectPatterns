import { Effect, Data } from 'effect';

// Define our domain types
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
};

// Define specific, typed errors for our domain
export class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{
  readonly id: string;
}> {}

export class InvalidIdError extends Data.TaggedError('InvalidIdError')<{
  readonly id: string;
  readonly reason: string;
}> {}

export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{
  readonly action: string;
  readonly role: string;
}> {}

// Define UserRepository service
export class UserRepository extends Effect.Service<UserRepository>()(
  'UserRepository',
  {
    sync: () => {
      const users = new Map<string, User>([
        ['user_123', { id: 'user_123', name: 'Paul', email: 'paul@example.com', role: 'admin' }],
        ['user_456', { id: 'user_456', name: 'Alice', email: 'alice@example.com', role: 'user' }]
      ]);

      return {
        // Get user by ID
        getUser: (id: string): Effect.Effect<User, UserNotFoundError | InvalidIdError> => {
        // Validate ID format
        if (!id.match(/^user_\d+$/)) {
          return Effect.fail(new InvalidIdError({
            id,
            reason: 'ID must be in format user_<number>'
          }));
        }

        const user = users.get(id);
        if (user === undefined) {
          return Effect.fail(new UserNotFoundError({ id }));
        }

          return Effect.succeed(user);
        },

        // Check if user has required role
        checkRole: (user: User, requiredRole: 'admin' | 'user'): Effect.Effect<void, UnauthorizedError> => {
        if (user.role !== requiredRole && user.role !== 'admin') {
          return Effect.fail(new UnauthorizedError({
            action: 'access_user',
            role: user.role
          }));
        }
          return Effect.succeed(undefined);
        }
      };
    }
  }
) {}

type ApiResponse = {
  error?: string;
  message?: string;
  data?: User;
};

// Create routes
const createRoutes = () => Effect.gen(function* (_) {
  const repo = yield* UserRepository;
  const userId = 'user_123';
  const user = yield* repo.getUser(userId);
  
  // Only admins can see email addresses
  const safeUser = {
    ...user,
    email: user.role === 'admin' ? user.email : '[hidden]'
  };
  
  return { data: safeUser } as ApiResponse;
});

// Create error handler
const createErrorHandler = (error: unknown): ApiResponse => {
  if (error instanceof UserNotFoundError) {
    return { error: 'Not Found', message: `User ${error.id} not found` };
  }
  if (error instanceof InvalidIdError) {
    return { error: 'Bad Request', message: error.reason };
  }
  if (error instanceof UnauthorizedError) {
    return { error: 'Unauthorized', message: `Role ${error.role} cannot ${error.action}` };
  }
  return { error: 'Internal Error', message: 'An unexpected error occurred' };
};

// Create program
const program = Effect.gen(function* (_) {
  const handler = createRoutes();
  return yield* Effect.provide(handler, UserRepository.Default);
});

// Run the program
Effect.runPromise(
  Effect.catchAll(
    program,
    error => Effect.succeed(createErrorHandler(error))
  )
);