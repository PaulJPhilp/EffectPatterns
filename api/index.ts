/**
 * Vercel Serverless Function Handler for Pattern Server
 *
 * This adapts the Effect-based Pattern Server to work as a Vercel serverless function.
 * It handles incoming HTTP requests and routes them to the appropriate handlers.
 */

import { FileSystem } from "@effect/platform";
import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { Data, Effect, Schema } from "effect";
import matter from "gray-matter";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as path from "node:path";

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

class RuleLoadError extends Data.TaggedError("RuleLoadError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

class RuleParseError extends Data.TaggedError("RuleParseError")<{
  readonly file: string;
  readonly cause: unknown;
}> {}

class RulesDirectoryNotFoundError extends Data.TaggedError(
  "RulesDirectoryNotFoundError"
)<{
  readonly path: string;
}> {}

class RuleNotFoundError extends Data.TaggedError("RuleNotFoundError")<{
  readonly id: string;
}> {}

// --- HELPER FUNCTIONS ---

const extractTitle = (content: string): string => {
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return "Untitled Rule";
};

const parseRuleFile = (
  fs: FileSystem.FileSystem,
  filePath: string,
  fileId: string
) =>
  Effect.gen(function* () {
    const content = yield* fs.readFileString(filePath).pipe(
      Effect.catchAll((error) =>
        Effect.fail(new RuleLoadError({ path: filePath, cause: error }))
      )
    );

    let parsed: { data: Record<string, unknown>; content: string };
    try {
      parsed = matter(content);
    } catch (error) {
      return yield* Effect.fail(
        new RuleParseError({ file: filePath, cause: error })
      );
    }

    const { data, content: markdownContent } = parsed;
    const title = extractTitle(markdownContent);

    return {
      id: fileId,
      title,
      description: (data.description as string) || "",
      skillLevel: data.skillLevel as string | undefined,
      useCase: data.useCase
        ? Array.isArray(data.useCase)
          ? (data.useCase as string[])
          : [data.useCase as string]
        : undefined,
      content: markdownContent,
    };
  });

const readRuleById = (id: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const rulesDir = path.join(process.cwd(), "rules/cursor");
    const filePath = path.join(rulesDir, `${id}.mdc`);

    const fileExists = yield* fs.exists(filePath);
    if (!fileExists) {
      return yield* Effect.fail(new RuleNotFoundError({ id }));
    }

    return yield* parseRuleFile(fs, filePath, id);
  });

const readAndParseRules = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const rulesDir = path.join(process.cwd(), "rules/cursor");

  const dirExists = yield* fs.exists(rulesDir);
  if (!dirExists) {
    return yield* Effect.fail(
      new RulesDirectoryNotFoundError({ path: rulesDir })
    );
  }

  const files = yield* fs.readDirectory(rulesDir).pipe(
    Effect.catchAll((error) =>
      Effect.fail(new RuleLoadError({ path: rulesDir, cause: error }))
    )
  );

  const mdcFiles = files.filter((file) => file.endsWith(".mdc"));

  const rules = yield* Effect.forEach(
    mdcFiles,
    (file) => {
      const filePath = path.join(rulesDir, file);
      const fileId = path.basename(file, ".mdc");
      return parseRuleFile(fs, filePath, fileId);
    },
    { concurrency: "unbounded" }
  );

  return rules;
});

// --- ROUTE HANDLERS ---

const healthHandler = Effect.gen(function* () {
  return { status: "ok" };
});

const rulesHandler = Effect.gen(function* () {
  const rulesResult = yield* Effect.either(
    Effect.gen(function* () {
      const rules = yield* readAndParseRules;
      const validated = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(
        rules
      );
      return validated;
    })
  );

  if (rulesResult._tag === "Left") {
    return {
      error: "Failed to load rules",
      statusCode: 500,
    };
  }

  return {
    data: rulesResult.right,
    statusCode: 200,
  };
});

const singleRuleHandler = (id: string) =>
  Effect.gen(function* () {
    const ruleResult = yield* Effect.either(
      Effect.gen(function* () {
        const rule = yield* readRuleById(id);
        const validated = yield* Schema.decodeUnknown(RuleSchema)(rule);
        return validated;
      })
    );

    if (ruleResult._tag === "Left") {
      const error = ruleResult.left;

      if (error._tag === "RuleNotFoundError") {
        return {
          error: "Rule not found",
          statusCode: 404,
        };
      }

      return {
        error: "Failed to load rule",
        statusCode: 500,
      };
    }

    return {
      data: ruleResult.right,
      statusCode: 200,
    };
  });

// --- VERCEL HANDLER ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req;

  // Health check
  if (url === "/health") {
    const result = await Effect.runPromise(
      healthHandler.pipe(Effect.provide(NodeFileSystem.layer))
    );
    return res.status(200).json(result);
  }

  // List all rules
  if (url === "/api/v1/rules") {
    const result = await Effect.runPromise(
      rulesHandler.pipe(Effect.provide(NodeFileSystem.layer))
    );
    if ("error" in result) {
      return res.status(result.statusCode).json({ error: result.error });
    }
    return res.status(200).json(result.data);
  }

  // Get single rule by ID
  const ruleMatch = url?.match(/^\/api\/v1\/rules\/([^/]+)$/);
  if (ruleMatch) {
    const id = ruleMatch[1];
    const result = await Effect.runPromise(
      singleRuleHandler(id).pipe(Effect.provide(NodeFileSystem.layer))
    );
    if ("error" in result) {
      return res.status(result.statusCode).json({ error: result.error });
    }
    return res.status(200).json(result.data);
  }

  // 404 for unknown routes
  return res.status(404).json({ error: "Not found" });
}
