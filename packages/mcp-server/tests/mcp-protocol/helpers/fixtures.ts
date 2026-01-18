/**
 * Test Fixtures
 *
 * Common test data and code samples used across MCP protocol tests.
 */

/**
 * Sample TypeScript code for testing analysis
 */
export const codeFixtures = {
  /**
   * Code with anti-pattern: using `any` type
   */
  anyTypeCode: `
export const processData = (input: any) => {
  return input.value * 2;
};
  `.trim(),

  /**
   * Code with anti-pattern: unhandled promise rejection
   */
  unhandledPromiseCode: `
export const fetchData = async () => {
  const response = await fetch('/api/data');
  return response.json();
};
  `.trim(),

  /**
   * Valid Effect-TS service pattern
   */
  effectServiceCode: `
import { Effect } from 'effect';

export class UserService extends Effect.Service<UserService>()(
  'UserService',
  {
    effect: Effect.gen(function* () {
      return {
        getUser: (id: string) => Effect.succeed({ id, name: 'User' }),
      };
    }),
  }
) {}
  `.trim(),

  /**
   * Code with multiple issues for review
   */
  complexAnalysisCode: `
export const handler = (data: any) => {
  try {
    const result = processInput(data);
    console.log(result);
    return result;
  } catch (e) {
    // Ignoring error
  }
};

function processInput(x: any) {
  return x.map((item: any) => item.value);
}
  `.trim(),

  /**
   * Valid Pattern-based code
   */
  patternValidCode: `
import { Effect, Array as EA } from 'effect';

export const processItems = Effect.gen(function* () {
  const items = yield* Effect.succeed([1, 2, 3]);
  return EA.map(items, (x) => x * 2);
});
  `.trim(),
};

/**
 * Sample code files for consistency analysis
 */
export const multiFileFixtures = {
  /**
   * Multiple files with inconsistent patterns
   */
  inconsistentPatterns: [
    {
      filename: "src/service1.ts",
      source: `
export const service1 = (input: any) => {
  return input * 2;
};
      `.trim(),
    },
    {
      filename: "src/service2.ts",
      source: `
import { Effect } from 'effect';

export const service2 = Effect.gen(function* () {
  yield* Effect.succeed(42);
});
      `.trim(),
    },
  ],

  /**
   * Files with consistent patterns (good)
   */
  consistentPatterns: [
    {
      filename: "src/user-service.ts",
      source: `
import { Effect } from 'effect';

export class UserService extends Effect.Service<UserService>()(
  'UserService',
  {
    effect: Effect.gen(function* () {
      return {
        getUser: (id: string) => Effect.succeed({ id }),
      };
    }),
  }
) {}
      `.trim(),
    },
    {
      filename: "src/post-service.ts",
      source: `
import { Effect } from 'effect';

export class PostService extends Effect.Service<PostService>()(
  'PostService',
  {
    effect: Effect.gen(function* () {
      return {
        getPost: (id: string) => Effect.succeed({ id, title: 'Post' }),
      };
    }),
  }
) {}
      `.trim(),
    },
  ],
};

/**
 * Pattern IDs for generation tests
 */
export const patternFixtures = {
  effectService: "effect-service",
  errorHandler: "error-handler",
  retryLogic: "retry-logic",
  httpClient: "http-client",
};

/**
 * Template variables for code generation
 */
export const templateVariablesFixtures = {
  /**
   * Simple service generation
   */
  simpleService: {
    patternId: "effect-service",
    variables: {
      ServiceName: "UserService",
      methodName: "getUser",
      returnType: "User",
    },
  },

  /**
   * Error handler generation
   */
  errorHandler: {
    patternId: "error-handler",
    variables: {
      ErrorType: "ValidationError",
      handlerName: "validateInput",
    },
  },
};

/**
 * Search query fixtures
 */
export const searchFixtures = {
  /**
   * Basic query
   */
  basicQuery: {
    q: "error handling",
    limit: 5,
  },

  /**
   * Query with category filter
   */
  categoryFilter: {
    q: "retry",
    category: "resilience",
    limit: 10,
  },

  /**
   * Query with difficulty filter
   */
  difficultyFilter: {
    q: "async",
    difficulty: "beginner",
    limit: 10,
  },

  /**
   * Empty query (should return top patterns)
   */
  emptyQuery: {
    limit: 20,
  },
};

/**
 * Pattern IDs for retrieval tests
 */
export const patternIdFixtures = {
  /**
   * Common pattern IDs that should exist
   */
  validIds: [
    "effect-service",
    "error-handler",
    "retry-logic",
  ],

  /**
   * Non-existent pattern ID
   */
  invalidId: "non-existent-pattern-xyz",
};

/**
 * Refactoring fixtures
 */
export const refactoringFixtures = {
  /**
   * Files to refactor
   */
  filesToRefactor: [
    {
      filename: "src/handler.ts",
      source: `
export const handler = (input: any) => {
  return input.map((x: any) => x * 2);
};
      `.trim(),
    },
  ],

  /**
   * Refactoring operations
   */
  refactoringIds: ["remove-any-types", "add-error-handling"],
};
