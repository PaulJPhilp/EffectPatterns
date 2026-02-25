/**
 * Pattern Diff Generator
 *
 * Generates before/after diffs for v3 to v4 migrations with annotations
 * highlighting why specific lines are anti-patterns or improvements.
 */

import type { TextContent } from "@/schemas/structured-output.js";

interface DiffBlock {
  readonly line: number;
  readonly content: string;
  readonly isAntiPattern: boolean;
  readonly annotation?: string;
}

interface MigrationExample {
  readonly patternName: string;
  readonly beforeV3: readonly DiffBlock[];
  readonly afterV4: readonly DiffBlock[];
  readonly explanation: string;
}

/**
 * Pre-defined migration examples from v3 to v4
 */
const migrationExamples: Record<string, MigrationExample> = {
  "effect-fail-tagged-error": {
    patternName: "Effect.fail should use TaggedError",
    beforeV3: [
      {
        line: 1,
        content: "export const getUserOrFail = (id: number) =>",
        isAntiPattern: false,
      },
      {
        line: 2,
        content:
          "  Effect.fail(new Error('User not found')) // ❌ Untyped error",
        isAntiPattern: true,
        annotation:
          "Effect.fail without a TaggedError is deprecated in v4. Use Data.TaggedError for typed failures.",
      },
    ],
    afterV4: [
      {
        line: 1,
        content: "class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{",
        isAntiPattern: false,
      },
      {
        line: 2,
        content: "  readonly userId: number",
        isAntiPattern: false,
      },
      {
        line: 3,
        content: "}> {}",
        isAntiPattern: false,
      },
      {
        line: 4,
        content: "",
        isAntiPattern: false,
      },
      {
        line: 5,
        content: "export const getUserOrFail = (id: number) =>",
        isAntiPattern: false,
      },
      {
        line: 6,
        content: "  Effect.fail(new UserNotFoundError({ userId: id })) // ✅ Typed error",
        isAntiPattern: false,
        annotation: "Now the error type is known to the type system.",
      },
    ],
    explanation:
      "v4 emphasizes typed errors using Data.TaggedError instead of generic Error instances. This improves type safety and error handling.",
  },

  "service-effect-service-with-layer": {
    patternName: "Effect.Service best practices in v4",
    beforeV3: [
      {
        line: 1,
        content: 'class UserService extends Effect.Service<UserService>()',
        isAntiPattern: false,
      },
      {
        line: 2,
        content: '  ("UserService", {',
        isAntiPattern: false,
      },
      {
        line: 3,
        content: "    effect: Effect.gen(function* () {",
        isAntiPattern: true,
        annotation:
          "Using 'effect:' requires manual dependency management in v3.",
      },
      {
        line: 4,
        content: "      // ... implementation",
        isAntiPattern: false,
      },
      {
        line: 5,
        content: "    }),",
        isAntiPattern: false,
      },
      {
        line: 6,
        content: "  })",
        isAntiPattern: false,
      },
      {
        line: 7,
        content: ") {}",
        isAntiPattern: false,
      },
    ],
    afterV4: [
      {
        line: 1,
        content:
          'export class UserService extends Effect.Service<UserService>()',
        isAntiPattern: false,
      },
      {
        line: 2,
        content: '  ("UserService", {',
        isAntiPattern: false,
      },
      {
        line: 3,
        content: "    scoped: Effect.gen(function* () {",
        isAntiPattern: false,
        annotation:
          "'scoped:' is preferred in v4 for resources that need cleanup. Use 'sync:' for stateless services.",
      },
      {
        line: 4,
        content: "      // Acquire resource",
        isAntiPattern: false,
      },
      {
        line: 5,
        content: "      yield* Effect.addFinalizer(() => ",
        isAntiPattern: false,
      },
      {
        line: 6,
        content: "        Effect.log('Cleanup')",
        isAntiPattern: false,
      },
      {
        line: 7,
        content: "      )",
        isAntiPattern: false,
      },
      {
        line: 8,
        content: "      return { /* ... */ }",
        isAntiPattern: false,
      },
      {
        line: 9,
        content: "    }),",
        isAntiPattern: false,
      },
      {
        line: 10,
        content: "  })",
        isAntiPattern: false,
      },
      {
        line: 11,
        content: ") {}",
        isAntiPattern: false,
      },
    ],
    explanation:
      "v4 recommends using 'scoped:' for services with resource lifecycles. This makes cleanup guarantees explicit and improves resource management.",
  },

  "effect-catch-tag-vs-catch-all": {
    patternName: "Use catchTag for typed error handling",
    beforeV3: [
      {
        line: 1,
        content: "const result = yield* operation.pipe(",
        isAntiPattern: false,
      },
      {
        line: 2,
        content: "  Effect.catch((error) => {  // ❌ Catches all errors",
        isAntiPattern: true,
        annotation: "Catching all errors loses type information.",
      },
      {
        line: 3,
        content: "    if (error instanceof UserNotFoundError) {",
        isAntiPattern: false,
      },
      {
        line: 4,
        content: "      return Effect.succeed(null)",
        isAntiPattern: false,
      },
      {
        line: 5,
        content: "    }",
        isAntiPattern: false,
      },
      {
        line: 6,
        content: "    throw error",
        isAntiPattern: false,
      },
      {
        line: 7,
        content: "  })",
        isAntiPattern: false,
      },
      {
        line: 8,
        content: ")",
        isAntiPattern: false,
      },
    ],
    afterV4: [
      {
        line: 1,
        content: "const result = yield* operation.pipe(",
        isAntiPattern: false,
      },
      {
        line: 2,
        content: "  Effect.catchTag('UserNotFoundError', (error) => {",
        isAntiPattern: false,
        annotation:
          "catchTag is type-safe and only handles the specified error type.",
      },
      {
        line: 3,
        content: "    yield* Effect.logWarning(`User not found: ${error.userId}`)",
        isAntiPattern: false,
      },
      {
        line: 4,
        content: "    return Effect.succeed(null)",
        isAntiPattern: false,
      },
      {
        line: 5,
        content: "  }),",
        isAntiPattern: false,
      },
      {
        line: 6,
        content: "  Effect.catchTag('DatabaseError', (error) => {",
        isAntiPattern: false,
      },
      {
        line: 7,
        content: "    return Effect.fail(error)  // Re-throw other errors",
        isAntiPattern: false,
      },
      {
        line: 8,
        content: "  })",
        isAntiPattern: false,
      },
      {
        line: 9,
        content: ")",
        isAntiPattern: false,
      },
    ],
    explanation:
      "v4 strongly recommends using catchTag or catchTags for type-safe, declarative error handling. This prevents accidentally catching errors you didn't intend to handle.",
  },

  "layer-merge-composition": {
    patternName: "Prefer Layer.mergeAll for composition",
    beforeV3: [
      {
        line: 1,
        content: "const AppLayer = Layer.merge(",
        isAntiPattern: true,
        annotation: "Layer.merge only handles two layers. Nesting multiple merges is hard to read.",
      },
      {
        line: 2,
        content: "  Layer.merge(",
        isAntiPattern: false,
      },
      {
        line: 3,
        content: "    DatabaseLayer,",
        isAntiPattern: false,
      },
      {
        line: 4,
        content: "    CacheLayer",
        isAntiPattern: false,
      },
      {
        line: 5,
        content: "  ),",
        isAntiPattern: false,
      },
      {
        line: 6,
        content: "  UserServiceLayer",
        isAntiPattern: false,
      },
      {
        line: 7,
        content: ")",
        isAntiPattern: false,
      },
    ],
    afterV4: [
      {
        line: 1,
        content: "const AppLayer = Layer.mergeAll(",
        isAntiPattern: false,
        annotation:
          "Layer.mergeAll accepts multiple layers and is more readable.",
      },
      {
        line: 2,
        content: "  DatabaseLayer,",
        isAntiPattern: false,
      },
      {
        line: 3,
        content: "  CacheLayer,",
        isAntiPattern: false,
      },
      {
        line: 4,
        content: "  UserServiceLayer,",
        isAntiPattern: false,
      },
      {
        line: 5,
        content: "  LoggerLayer",
        isAntiPattern: false,
      },
      {
        line: 6,
        content: ")",
        isAntiPattern: false,
      },
    ],
    explanation:
      "v4 introduces Layer.mergeAll for cleaner composition of multiple layers. This is more scalable and readable than nested Layer.merge calls.",
  },
};

/**
 * Generate migration diff content for a pattern
 *
 * @param patternId The migration pattern ID
 * @returns TextContent array suitable for MCP tool responses with improved scannability
 */
function generateMigrationDiff(patternId: string): TextContent[] {
  const example = migrationExamples[patternId];
  if (!example) {
    return [];
  }

  const content: TextContent[] = [];

  // Title
  content.push({
    type: "text",
    text: `# ${example.patternName}`,
    annotations: {
      priority: 1,
      audience: ["user"],
    },
  });

  // Explanation with blockquote for emphasis
  content.push({
    type: "text",
    text: `> ${example.explanation}`,
    annotations: {
      priority: 1,
      audience: ["user"],
    },
  });

  // Before section with severity indicator
  content.push({
    type: "text",
    text: "## [🔴 v3 Pattern] Before",
    annotations: {
      priority: 2,
      audience: ["user"],
    },
  });

  content.push({
    type: "text",
    text: "> This pattern has known issues in v4. Pay attention to the highlighted lines below.",
    annotations: {
      priority: 2,
      audience: ["user"],
    },
  });

  const beforeCode = example.beforeV3.map((block) => block.content).join("\n");
  content.push({
    type: "text",
    text: `\`\`\`typescript\n${beforeCode}\n\`\`\``,
    annotations: {
      priority: 2,
      audience: ["user"],
    },
  });

  // Anti-pattern annotations with severity signaling
  const antiPatterns = example.beforeV3.filter((b) => b.isAntiPattern && b.annotation);
  if (antiPatterns.length > 0) {
    content.push({
      type: "text",
      text: "### Issues to Address",
      annotations: {
        priority: 1,
        audience: ["user"],
      },
    });

    for (const block of antiPatterns) {
      content.push({
        type: "text",
        text: `> **Line ${block.line}:** ⚠️ ${block.annotation}`,
        annotations: {
          priority: 1,
          audience: ["user"],
        },
      });
    }
  }

  // After section with improvement indicator
  content.push({
    type: "text",
    text: "## [✅ v4 Pattern] After",
    annotations: {
      priority: 2,
      audience: ["user"],
    },
  });

  content.push({
    type: "text",
    text: "> This is the recommended approach for v4. The highlighted improvements are marked below.",
    annotations: {
      priority: 2,
      audience: ["user"],
    },
  });

  const afterCode = example.afterV4.map((block) => block.content).join("\n");
  content.push({
    type: "text",
    text: `\`\`\`typescript\n${afterCode}\n\`\`\``,
    annotations: {
      priority: 3,
      audience: ["user"],
    },
  });

  // Improvement annotations with visual markers
  const improvements = example.afterV4.filter((b) => !b.isAntiPattern && b.annotation);
  if (improvements.length > 0) {
    content.push({
      type: "text",
      text: "### Key Improvements",
      annotations: {
        priority: 2,
        audience: ["user"],
      },
    });

    for (const block of improvements) {
      content.push({
        type: "text",
        text: `> **Line ${block.line}:** ✅ ${block.annotation}`,
        annotations: {
          priority: 2,
          audience: ["user"],
        },
      });
    }
  }

  return content;
}

/**
 * Get all available migration patterns
 */
function listMigrationPatterns(): string[] {
  return Object.keys(migrationExamples);
}

/**
 * Check if a pattern ID is a valid migration example
 */
function isMigrationPattern(patternId: string): boolean {
  return patternId in migrationExamples;
}

export {
  generateMigrationDiff,
  listMigrationPatterns,
  isMigrationPattern,
  type MigrationExample,
  type DiffBlock,
};
