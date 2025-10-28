/**
 * Vercel Serverless Function Handler for Pattern Server
 *
 * This adapts the Effect-based Pattern Server to work as a Vercel serverless function.
 * It handles incoming HTTP requests and routes them to the appropriate handlers.
 */

import * as path from 'node:path';
import { FileSystem } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Data, Effect, Schema } from 'effect';
import matter from 'gray-matter';

const TITLE_HEADING_REGEX = /^#\s+(.+)$/;
const RULE_PATH_REGEX = /^\/api\/v1\/rules\/([^/]+)$/;
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_NOT_FOUND = 404;

// --- SCHEMA DEFINITIONS ---

const RuleSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  skillLevel: Schema.optional(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  content: Schema.String,
});

// --- ERROR TYPES ---

class RuleLoadError extends Data.TaggedError('RuleLoadError')<{
  readonly path: string;
  readonly cause: unknown;
}> {}

class RuleParseError extends Data.TaggedError('RuleParseError')<{
  readonly file: string;
  readonly cause: unknown;
}> {}

class RulesDirectoryNotFoundError extends Data.TaggedError(
  'RulesDirectoryNotFoundError',
)<{
  readonly path: string;
}> {}

class RuleNotFoundError extends Data.TaggedError('RuleNotFoundError')<{
  readonly id: string;
}> {}

// --- HELPER FUNCTIONS ---

const extractTitle = (content: string): string => {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(TITLE_HEADING_REGEX);
    if (match) {
      return match[1].trim();
    }
  }
  return 'Untitled Rule';
};

const parseRuleFile = (
  fs: FileSystem.FileSystem,
  filePath: string,
  fileId: string,
) =>
  Effect.gen(function* () {
    const content = yield* fs
      .readFileString(filePath)
      .pipe(
        Effect.catchAll((error) =>
          Effect.fail(new RuleLoadError({ path: filePath, cause: error })),
        ),
      );

    let parsed: { data: Record<string, unknown>; content: string };
    try {
      parsed = matter(content);
    } catch (error) {
      return yield* Effect.fail(
        new RuleParseError({ file: filePath, cause: error }),
      );
    }

    const { data, content: markdownContent } = parsed;
    const title = extractTitle(markdownContent);

    const rawUseCase = data.useCase;
    let useCase: string[] | undefined;
    if (Array.isArray(rawUseCase)) {
      useCase = rawUseCase.filter(
        (value): value is string => typeof value === 'string',
      );
    } else if (typeof rawUseCase === 'string') {
      useCase = [rawUseCase];
    }

    return {
      id: fileId,
      title,
      description: (data.description as string) || '',
      skillLevel: data.skillLevel as string | undefined,
      useCase,
      content: markdownContent,
    };
  });

const readRuleById = (id: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const rulesDir = path.join(process.cwd(), 'rules/cursor');
    const filePath = path.join(rulesDir, `${id}.mdc`);

    const fileExists = yield* fs.exists(filePath);
    if (!fileExists) {
      return yield* Effect.fail(new RuleNotFoundError({ id }));
    }

    return yield* parseRuleFile(fs, filePath, id);
  });

const readAndParseRules = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const rulesDir = path.join(process.cwd(), 'rules/cursor');

  const dirExists = yield* fs.exists(rulesDir);
  if (!dirExists) {
    return yield* Effect.fail(
      new RulesDirectoryNotFoundError({ path: rulesDir }),
    );
  }

  const files = yield* fs
    .readDirectory(rulesDir)
    .pipe(
      Effect.catchAll((error) =>
        Effect.fail(new RuleLoadError({ path: rulesDir, cause: error })),
      ),
    );

  const mdcFiles = files.filter((file) => file.endsWith('.mdc'));

  const rules = yield* Effect.forEach(
    mdcFiles,
    (file) => {
      const filePath = path.join(rulesDir, file);
      const fileId = path.basename(file, '.mdc');
      return parseRuleFile(fs, filePath, fileId);
    },
    { concurrency: 'unbounded' },
  );

  return rules;
});

// --- ROUTE HANDLERS ---

const healthHandler = Effect.succeed({ status: 'ok' });

const rulesHandler = Effect.gen(function* () {
  const rulesResult = yield* Effect.either(
    Effect.gen(function* () {
      const rules = yield* readAndParseRules;
      const validated = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(
        rules,
      );
      return validated;
    }),
  );

  if (rulesResult._tag === 'Left') {
    return {
      error: 'Failed to load rules',
      statusCode: 500,
    };
  }

  return {
    data: rulesResult.right,
    statusCode: HTTP_STATUS_OK,
  };
});

const singleRuleHandler = (id: string) =>
  Effect.gen(function* () {
    const ruleResult = yield* Effect.either(
      Effect.gen(function* () {
        const rule = yield* readRuleById(id);
        const validated = yield* Schema.decodeUnknown(RuleSchema)(rule);
        return validated;
      }),
    );

    if (ruleResult._tag === 'Left') {
      const error = ruleResult.left;

      if (error._tag === 'RuleNotFoundError') {
        return {
          error: 'Rule not found',
          statusCode: HTTP_STATUS_NOT_FOUND,
        };
      }

      return {
        error: 'Failed to load rule',
        statusCode: 500,
      };
    }

    return {
      data: ruleResult.right,
      statusCode: HTTP_STATUS_OK,
    };
  });

// --- VERCEL HANDLER ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req;

  // Root route - API documentation
  if (url === '/') {
    return res.status(HTTP_STATUS_OK).json({
      name: 'Effect Patterns API',
      version: 'v1',
      description: 'AI coding rules for Effect-TS patterns',
      repository: 'https://github.com/PaulJPhilp/EffectPatterns',
      endpoints: {
        health: '/health',
        rules: {
          list: '/api/v1/rules',
          get: '/api/v1/rules/{id}'
        }
      }
    });
  }

  // Health check
  if (url === '/health') {
    const result = await Effect.runPromise(
      healthHandler.pipe(Effect.provide(NodeFileSystem.layer)),
    );
    return res.status(HTTP_STATUS_OK).json(result);
  }

  // List all rules
  if (url === '/api/v1/rules') {
    const result = await Effect.runPromise(
      rulesHandler.pipe(Effect.provide(NodeFileSystem.layer)),
    );
    if ('error' in result) {
      return res.status(result.statusCode).json({ error: result.error });
    }
    return res.status(HTTP_STATUS_OK).json(result.data);
  }

  // Get single rule by ID
  const ruleMatch = url?.match(RULE_PATH_REGEX);
  if (ruleMatch) {
    const id = ruleMatch[1];
    const result = await Effect.runPromise(
      singleRuleHandler(id).pipe(Effect.provide(NodeFileSystem.layer)),
    );
    if ('error' in result) {
      return res.status(result.statusCode).json({ error: result.error });
    }
    return res.status(HTTP_STATUS_OK).json(result.data);
  }

  // 404 for unknown routes
  return res.status(HTTP_STATUS_NOT_FOUND).json({ error: 'Not found' });
}
