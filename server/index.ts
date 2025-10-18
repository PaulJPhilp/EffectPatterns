/**
 * Pattern Server - HTTP API Server
 *
 * A minimal Effect-based HTTP server that serves the Effect Patterns API.
 * Built using @effect/platform for HTTP handling and Effect's dependency injection.
 *
 * This server demonstrates Effect-TS patterns:
 * - Layer-based dependency injection
 * - Effect.gen for sequential logic
 * - Structured logging
 * - Tagged error types
 * - Graceful shutdown handling
 */

import { createServer } from 'node:http';
import * as path from 'node:path';
import {
  FileSystem,
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from '@effect/platform';
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { Data, Effect, Layer, Schema } from 'effect';
import matter from 'gray-matter';

// --- SCHEMA DEFINITIONS ---

/**
 * Schema for a Rule object
 */
const RuleSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  skillLevel: Schema.optional(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  content: Schema.String,
});

// --- ERROR TYPES ---

/**
 * Tagged error for server-related failures
 */
class ServerError extends Data.TaggedError('ServerError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Tagged error for rule loading failures
 */
class RuleLoadError extends Data.TaggedError('RuleLoadError')<{
  readonly path: string;
  readonly cause: unknown;
}> {}

/**
 * Tagged error for rule parsing failures
 */
class RuleParseError extends Data.TaggedError('RuleParseError')<{
  readonly file: string;
  readonly cause: unknown;
}> {}

/**
 * Tagged error for directory not found
 */
class RulesDirectoryNotFoundError extends Data.TaggedError(
  'RulesDirectoryNotFoundError'
)<{
  readonly path: string;
}> {}

/**
 * Tagged error for rule not found
 */
class RuleNotFoundError extends Data.TaggedError('RuleNotFoundError')<{
  readonly id: string;
}> {}

// --- CONFIGURATION ---

/**
 * Server configuration
 */
interface ServerConfig {
  readonly port: number;
  readonly host: string;
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 3001,
  host: 'localhost',
};

// --- HELPER FUNCTIONS ---

/**
 * Extract the first # heading from markdown content as the title
 */
const extractTitle = (content: string): string => {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return 'Untitled Rule';
};

/**
 * Parse a single rule file and return a rule object
 */
const parseRuleFile = (
  fs: FileSystem.FileSystem,
  filePath: string,
  fileId: string
) =>
  Effect.gen(function* () {
    // Read file content
    const content = yield* fs
      .readFileString(filePath)
      .pipe(
        Effect.catchAll((error) =>
          Effect.fail(new RuleLoadError({ path: filePath, cause: error }))
        )
      );

    // Parse frontmatter
    let parsed: { data: Record<string, unknown>; content: string };
    try {
      parsed = matter(content);
    } catch (error) {
      return yield* Effect.fail(
        new RuleParseError({ file: filePath, cause: error })
      );
    }

    const { data, content: markdownContent } = parsed;

    // Extract title from content
    const title = extractTitle(markdownContent);

    // Build rule object
    return {
      id: fileId,
      title,
      description: (data.description as string) || '',
      skillLevel: data.skillLevel as string | undefined,
      useCase: data.useCase
        ? Array.isArray(data.useCase)
          ? (data.useCase as string[])
          : [data.useCase as string]
        : undefined,
      content: markdownContent,
    };
  });

/**
 * Read and parse a single rule by ID
 */
const readRuleById = (id: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const rulesDir = 'rules/cursor';
    const filePath = path.join(rulesDir, `${id}.mdc`);

    yield* Effect.logInfo(`Loading rule by ID: ${id}`);

    // Check if file exists
    const fileExists = yield* fs.exists(filePath);
    if (!fileExists) {
      return yield* Effect.fail(new RuleNotFoundError({ id }));
    }

    // Parse the rule file
    const rule = yield* parseRuleFile(fs, filePath, id);

    yield* Effect.logInfo(`Successfully loaded rule: ${id}`);
    return rule;
  });

/**
 * Read and parse all .mdc rule files from the rules/cursor directory
 */
const readAndParseRules = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const rulesDir = 'rules/cursor';

  yield* Effect.logInfo(`Loading rules from ${rulesDir}`);

  // Check if directory exists
  const dirExists = yield* fs.exists(rulesDir);
  if (!dirExists) {
    return yield* Effect.fail(
      new RulesDirectoryNotFoundError({ path: rulesDir })
    );
  }

  // Read all files in directory
  const files = yield* fs
    .readDirectory(rulesDir)
    .pipe(
      Effect.catchAll((error) =>
        Effect.fail(new RuleLoadError({ path: rulesDir, cause: error }))
      )
    );

  // Filter for .mdc files
  const mdcFiles = files.filter((file) => file.endsWith('.mdc'));
  yield* Effect.logInfo(`Found ${mdcFiles.length} rule files`);

  // Parse each file
  const rules = yield* Effect.forEach(
    mdcFiles,
    (file) => {
      const filePath = path.join(rulesDir, file);
      const fileId = path.basename(file, '.mdc');
      return parseRuleFile(fs, filePath, fileId);
    },
    { concurrency: 'unbounded' }
  );

  yield* Effect.logInfo(`Successfully parsed ${rules.length} rules`);
  return rules;
});

// --- ROUTE HANDLERS ---

/**
 * Health check endpoint handler
 * Returns: {"status": "ok"}
 */
const healthHandler = Effect.gen(function* () {
  yield* Effect.logInfo('Health check requested');
  return yield* HttpServerResponse.json({ status: 'ok' });
});

/**
 * Rules endpoint handler
 * Returns: Array of rules from rules/cursor directory
 */
const rulesHandler = Effect.gen(function* () {
  yield* Effect.logInfo('Rules endpoint requested');

  // Try to read, parse and validate rules
  const rulesResult = yield* Effect.either(
    Effect.gen(function* () {
      const rules = yield* readAndParseRules;
      const validated = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(
        rules
      );
      return validated;
    })
  );

  // Handle success or failure
  if (rulesResult._tag === 'Left') {
    yield* Effect.logError('Failed to load and validate rules', {
      error: rulesResult.left,
    });
    return yield* HttpServerResponse.json(
      { error: 'Failed to load rules' },
      { status: 500 }
    );
  }

  const validated = rulesResult.right;
  yield* Effect.logInfo(`Returning ${validated.length} validated rules`);
  return yield* HttpServerResponse.json(validated);
});

/**
 * Single rule endpoint handler
 * Returns: Single rule by ID from rules/cursor directory
 */
const singleRuleHandler = (id: string) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Single rule endpoint requested for ID: ${id}`);

    // Try to read, parse and validate the rule
    const ruleResult = yield* Effect.either(
      Effect.gen(function* () {
        const rule = yield* readRuleById(id);
        const validated = yield* Schema.decodeUnknown(RuleSchema)(rule);
        return validated;
      })
    );

    // Handle success or failure
    if (ruleResult._tag === 'Left') {
      const error = ruleResult.left;

      // Check if it's a RuleNotFoundError
      if (error._tag === 'RuleNotFoundError') {
        yield* Effect.logInfo(`Rule not found: ${id}`);
        return yield* HttpServerResponse.json(
          { error: 'Rule not found' },
          { status: 404 }
        );
      }

      // Other errors are 500
      yield* Effect.logError('Failed to load and validate rule', { error });
      return yield* HttpServerResponse.json(
        { error: 'Failed to load rule' },
        { status: 500 }
      );
    }

    const validated = ruleResult.right;
    yield* Effect.logInfo(`Returning rule: ${id}`);
    return yield* HttpServerResponse.json(validated);
  });

// --- ROUTER ---

/**
 * HTTP Router with all application routes
 */
const router = HttpRouter.empty.pipe(
  HttpRouter.get('/health', healthHandler),
  HttpRouter.get('/api/v1/rules', rulesHandler),
  HttpRouter.get(
    '/api/v1/rules/:id',
    Effect.gen(function* () {
      const params = yield* HttpRouter.params;
      const id = params.id;
      return yield* singleRuleHandler(id);
    })
  )
);

// --- HTTP SERVER LAYER ---

/**
 * Create the HTTP server layer using Node's built-in HTTP server
 */
const ServerLive = NodeHttpServer.layer(() => createServer(), {
  port: DEFAULT_CONFIG.port,
});

/**
 * Main HTTP application layer
 */
const HttpLive = HttpServer.serve(router).pipe(Layer.provide(ServerLive));

// --- MAIN PROGRAM ---

/**
 * Main server program
 * - Logs startup message
 * - Launches the HTTP server
 * - Handles graceful shutdown
 */
const program = Effect.gen(function* () {
  yield* Effect.logInfo(
    `🚀 Pattern Server starting on http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}`
  );
  yield* Effect.logInfo(
    `📍 Health check: http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/health`
  );

  // Launch the server and keep it running
  yield* Layer.launch(HttpLive);

  yield* Effect.logInfo('✨ Server is ready to accept requests');
}).pipe(
  Effect.tapErrorCause((cause) =>
    Effect.logError('Server failed to start', { cause })
  ),
  Effect.catchTag('ServerError', (error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Server error: ${error.message}`);
      return yield* Effect.fail(error);
    })
  )
);

// --- RUNTIME EXECUTION ---

/**
 * Run the server using NodeRuntime.runMain
 * This handles graceful shutdown on SIGINT/SIGTERM
 */
NodeRuntime.runMain(program);
