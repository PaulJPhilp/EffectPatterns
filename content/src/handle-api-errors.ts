import { Effect, Data, Cause } from 'effect';

// Define our domain types
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: 'admin' | 'user';
}

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

// Define error handler service
export class ErrorHandlerService extends Effect.Service<ErrorHandlerService>()(
  'ErrorHandlerService',
  {
    sync: () => ({
      // Handle API errors with proper logging
      handleApiError: <E>(error: E): Effect.Effect<ApiResponse, never, never> =>
        Effect.gen(function* (_) {
          yield* Effect.logError(`API Error: ${JSON.stringify(error)}`);

          if (error instanceof UserNotFoundError) {
            return { error: 'Not Found', message: `User ${error.id} not found` };
          }
          if (error instanceof InvalidIdError) {
            return { error: 'Bad Request', message: error.reason };
          }
          if (error instanceof UnauthorizedError) {
            return { error: 'Unauthorized', message: `${error.role} cannot ${error.action}` };
          }

          return { error: 'Internal Server Error', message: 'An unexpected error occurred' };
        }),

      // Handle unexpected errors
      handleUnexpectedError: (cause: Cause.Cause<unknown>): Effect.Effect<void, never, never> =>
        Effect.gen(function* (_) {
          yield* Effect.logError('Unexpected error occurred');
          
          if (Cause.isDie(cause)) {
            const defect = Cause.failureOption(cause);
            if (defect._tag === 'Some') {
              const error = defect.value as Error;
              yield* Effect.logError(`Defect: ${error.message}`);
              yield* Effect.logError(`Stack: ${error.stack?.split('\n')[1]?.trim() ?? 'N/A'}`);
            }
          }

          return Effect.succeed(void 0);
        })
    })
  }
) {}

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
        // Get user by ID with proper error handling
        getUser: (id: string): Effect.Effect<User, UserNotFoundError | InvalidIdError> =>
          Effect.gen(function* (_) {
            yield* Effect.logInfo(`Attempting to get user with id: ${id}`);
            
            // Validate ID format
            if (!id.match(/^user_\d+$/)) {
              yield* Effect.logWarning(`Invalid user ID format: ${id}`);
              return yield* Effect.fail(new InvalidIdError({
                id,
                reason: 'ID must be in format user_<number>'
              }));
            }

            const user = users.get(id);
            if (user === undefined) {
              yield* Effect.logWarning(`User not found with id: ${id}`);
              return yield* Effect.fail(new UserNotFoundError({ id }));
            }

            yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);
            return user;
          }),

        // Check if user has required role
        checkRole: (user: User, requiredRole: 'admin' | 'user'): Effect.Effect<void, UnauthorizedError> =>
          Effect.gen(function* (_) {
            yield* Effect.logInfo(`Checking if user ${user.id} has role: ${requiredRole}`);
            
            if (user.role !== requiredRole && user.role !== 'admin') {
              yield* Effect.logWarning(`User ${user.id} with role ${user.role} cannot access ${requiredRole} resources`);
              return yield* Effect.fail(new UnauthorizedError({
                action: 'access_user',
                role: user.role
              }));
            }

            yield* Effect.logInfo(`User ${user.id} has required role: ${user.role}`);
            return Effect.succeed(void 0);
          })
      };
    }
  }
) {}

interface ApiResponse {
  readonly error?: string;
  readonly message?: string;
  readonly data?: User;
}

// Create routes with proper error handling
const createRoutes = () => Effect.gen(function* (_) {
  const repo = yield* UserRepository;
  const errorHandler = yield* ErrorHandlerService;
  
  yield* Effect.logInfo('=== Processing API request ===');
  
  // Test different scenarios
  for (const userId of ['user_123', 'user_456', 'invalid_id', 'user_789']) {
    yield* Effect.logInfo(`\n--- Testing user ID: ${userId} ---`);
    
    const response = yield* repo.getUser(userId).pipe(
      Effect.map(user => ({
        data: {
          ...user,
          email: user.role === 'admin' ? user.email : '[hidden]'
        }
      })),
      Effect.catchAll(error => errorHandler.handleApiError(error))
    );
    
    yield* Effect.logInfo(`Response: ${JSON.stringify(response)}`);
  }
  
  // Test role checking
  const adminUser = yield* repo.getUser('user_123');
  const regularUser = yield* repo.getUser('user_456');
  
  yield* Effect.logInfo('\n=== Testing role checks ===');
  
  yield* repo.checkRole(adminUser, 'admin').pipe(
    Effect.tap(() => Effect.logInfo('Admin access successful')),
    Effect.catchAll(error => errorHandler.handleApiError(error))
  );
  
  yield* repo.checkRole(regularUser, 'admin').pipe(
    Effect.tap(() => Effect.logInfo('User admin access successful')),
    Effect.catchAll(error => errorHandler.handleApiError(error))
  );
  
  return { message: 'Tests completed successfully' };
});

// Run the program with all services
Effect.runPromise(
  Effect.provide(
    Effect.provide(
      createRoutes(),
      ErrorHandlerService.Default
    ),
    UserRepository.Default
  )
);