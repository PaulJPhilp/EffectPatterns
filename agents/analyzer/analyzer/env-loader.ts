/**
 * Environment Loader
 *
 * Loads environment variables from .env files using dotenv.
 * This should be called at the start of the application before
 * accessing any configuration.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Console, Effect } from 'effect';

/**
 * Load environment variables from .env file
 *
 * Searches for .env files in the following order:
 * 1. .env.local (local overrides, gitignored)
 * 2. .env (main environment file, gitignored)
 * 3. .env.example (template, committed to git)
 *
 * @returns Effect that loads the environment
 */
export const loadEnvironment = Effect.gen(function* () {
  // Dynamic import of dotenv (only when needed)
  const dotenv = yield* Effect.tryPromise({
    try: () => import('dotenv'),
    catch: (error) =>
      new Error(
        'Failed to load dotenv. Install it with: bun add dotenv\n' +
          `Error: ${error}`,
      ),
  });

  const cwd = process.cwd();

  // Search for .env in multiple locations:
  // 1. Current directory (scripts/analyzer)
  // 2. Project root (../../)
  const searchPaths = [
    cwd, // Current directory
    resolve(cwd, '../..'), // Project root
  ];

  const envFiles = searchPaths.flatMap((basePath) => [
    resolve(basePath, '.env.local'),
    resolve(basePath, '.env'),
  ]);

  // Find the first existing .env file
  const envFile = envFiles.find((file) => existsSync(file));

  if (envFile) {
    yield* Console.log(`📋 Loading environment from: ${envFile}`);

    const result = dotenv.config({ path: envFile });

    if (result.error) {
      return yield* Effect.fail(
        new Error(`Failed to parse .env file: ${result.error.message}`),
      );
    }

    yield* Console.log('   ✅ Environment loaded');
  } else {
    yield* Console.log(
      '⚠️  No .env file found. Using system environment variables.',
    );
    yield* Console.log(
      '   💡 Tip: Copy .env.example to .env and add your API key',
    );
  }
});

/**
 * Validate required environment variables are set
 *
 * @param required - Array of required environment variable names
 * @returns Effect that validates the environment
 */
export const validateEnvironment = (required: string[]) =>
  Effect.gen(function* () {
    const missing: string[] = [];

    for (const varName of required) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      return yield* Effect.fail(
        new Error(
          '❌ Missing required environment variables:\n' +
            missing.map((v) => `   - ${v}`).join('\n') +
            '\n\n💡 Tip: Copy .env.example to .env and fill in the values',
        ),
      );
    }

    yield* Console.log('✅ All required environment variables are set');
  });

/**
 * Combined loader: load .env file and validate required variables
 *
 * @param required - Array of required environment variable names
 * @returns Effect that loads and validates the environment
 */
export const setupEnvironment = (required: string[] = ['OPENAI_API_KEY']) =>
  Effect.gen(function* () {
    yield* loadEnvironment.pipe(
      Effect.catchAll((error) => Console.log(`⚠️  ${error.message}`)),
    );

    return yield* validateEnvironment(required);
  });
