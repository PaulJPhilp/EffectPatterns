/**
 * Tests for generateSkillsFromDatabase pipeline
 *
 * Tests the core DB→generate→upsert pipeline with mock repositories.
 *
 * // test-policy-ignore-file: structural mock — mocks skill generator and DB repos to test pipeline orchestration in isolation
 */

import { Effect, Option } from "effect";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  generateSkillsFromDatabase,
  type GenerateFromDbOptions,
} from "../skills-commands.js";

// ============================================
// Mock skill-generator (before importing SUT)
// ============================================

vi.mock("../skills/skill-generator.js", () => ({
  patternFromDatabase: vi.fn((dbPattern: { slug: string }) => ({
    id: dbPattern.slug,
    title: `Title for ${dbPattern.slug}`,
    skillLevel: "beginner",
    applicationPatternId: "",
    summary: `Summary for ${dbPattern.slug}`,
    goodExample: "```ts\nEffect.succeed(1)\n```",
    antiPattern: "```ts\nbad()\n```",
    rationale: "Use Effect.",
  })),
  generateCategorySkill: vi.fn(
    (category: string, patterns: unknown[]) =>
      `# Generated skill for ${category} (${patterns.length} patterns)`
  ),
  generateGeminiSkill: vi.fn((category: string) => ({
    skillName: `effect-patterns-${category}`,
    skillId: `effect_patterns_${category}`,
    displayName: `Effect-TS Patterns: ${category}`,
    description: `desc for ${category}`,
    category,
    totalPatterns: 1,
    tools: [],
    systemPrompt: "prompt",
  })),
  writeSkill: vi.fn().mockResolvedValue(undefined),
  writeOpenAISkill: vi.fn().mockResolvedValue(undefined),
  writeGeminiSkill: vi.fn().mockResolvedValue(undefined),
}));

import {
  generateCategorySkill,
  writeSkill,
  writeOpenAISkill,
  writeGeminiSkill,
} from "../skills/skill-generator.js";

// ============================================
// Helpers
// ============================================

const now = new Date();

function makeAppPattern(overrides: {
  id: string;
  slug: string;
  name: string;
  learningOrder?: number;
}) {
  return {
    id: overrides.id,
    slug: overrides.slug,
    name: overrides.name,
    description: `Description for ${overrides.name}`,
    learningOrder: overrides.learningOrder ?? 1,
    effectModule: null,
    subPatterns: [],
    validated: false,
    validatedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function makeEffectPattern(overrides: {
  id: string;
  slug: string;
  applicationPatternId: string | null;
  skillLevel?: string;
}) {
  return {
    id: overrides.id,
    slug: overrides.slug,
    title: `Title for ${overrides.slug}`,
    summary: `Summary for ${overrides.slug}`,
    skillLevel: overrides.skillLevel ?? "beginner",
    category: null,
    difficulty: null,
    tags: [],
    examples: [],
    useCases: [],
    rule: null,
    content: `## Good Example\n\`\`\`ts\nEffect.succeed(1)\n\`\`\`\n## Anti-Pattern\nbad\n## Rationale\nUse Effect.`,
    author: null,
    lessonOrder: null,
    applicationPatternId: overrides.applicationPatternId,
    validated: false,
    validatedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function makeSkill(overrides: {
  id: string;
  slug: string;
  content?: string | null;
  validated?: boolean;
  version?: number;
}) {
  return {
    id: overrides.id,
    slug: overrides.slug,
    name: `Name for ${overrides.slug}`,
    description: `Desc for ${overrides.slug}`,
    category: null,
    content: overrides.content ?? null,
    version: overrides.version ?? 1,
    patternCount: 0,
    applicationPatternId: null,
    validated: overrides.validated ?? false,
    validatedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function makeMockRepos(overrides?: {
  appPatterns?: ReturnType<typeof makeAppPattern>[];
  effectPatterns?: ReturnType<typeof makeEffectPattern>[];
  existingSkills?: Map<string, ReturnType<typeof makeSkill>>;
  upsertResult?: ReturnType<typeof makeSkill>;
}) {
  const appPatterns = overrides?.appPatterns ?? [];
  const effectPatterns = overrides?.effectPatterns ?? [];
  const existingSkills = overrides?.existingSkills ?? new Map();

  return {
    appPatternRepo: {
      findAll: vi.fn().mockResolvedValue(appPatterns),
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      lock: vi.fn(),
      unlock: vi.fn(),
      isLocked: vi.fn().mockResolvedValue(false),
    },
    patternRepo: {
      findAll: vi.fn().mockResolvedValue(effectPatterns),
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      search: vi.fn().mockResolvedValue([]),
      countBySkillLevel: vi.fn().mockResolvedValue({ beginner: 0, intermediate: 0, advanced: 0 }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      lock: vi.fn(),
      unlock: vi.fn(),
      isLocked: vi.fn().mockResolvedValue(false),
    },
    skillRepo: {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockImplementation((slug: string) =>
        Promise.resolve(existingSkills.get(slug) ?? null)
      ),
      findByCategory: vi.fn().mockResolvedValue([]),
      findByApplicationPattern: vi.fn().mockResolvedValue([]),
      search: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
      upsert: vi.fn().mockImplementation((data: { slug: string }) =>
        Promise.resolve(
          overrides?.upsertResult ??
          makeSkill({ id: "new-skill-id", slug: data.slug, version: 1 })
        )
      ),
      lock: vi.fn(),
      unlock: vi.fn(),
      isLocked: vi.fn().mockResolvedValue(false),
      getPatterns: vi.fn().mockResolvedValue([]),
      setPatterns: vi.fn().mockResolvedValue(undefined),
    },
  // biome-ignore lint/suspicious/noExplicitAny: mock repos don't need full type fidelity
  } as any;
}

const defaultOptions: GenerateFromDbOptions = {
  dryRun: false,
  writeFiles: false,
  category: Option.none(),
};

function run(
  repos: ReturnType<typeof makeMockRepos>,
  options: GenerateFromDbOptions = defaultOptions,
) {
  return Effect.runPromise(generateSkillsFromDatabase(repos, options));
}

// ============================================
// Tests
// ============================================

describe("generateSkillsFromDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ------------------------------------------
  // Happy path
  // ------------------------------------------

  describe("happy path", () => {
    it("should create new skills for each application pattern", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "use-tagged-errors", applicationPatternId: "ap-1" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
      });

      const counts = await run(repos);

      expect(counts).toEqual({ created: 1, updated: 0, unchanged: 0, skipped: 0 });
      expect(repos.skillRepo.upsert).toHaveBeenCalledOnce();
      expect(repos.skillRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "effect-patterns-error-handling",
          name: "Effect-TS Patterns: Error Handling",
          category: "error-handling",
          applicationPatternId: "ap-1",
          patternCount: 1,
        })
      );
      expect(repos.skillRepo.setPatterns).toHaveBeenCalledWith("new-skill-id", ["ep-1"]);
    });

    it("should process multiple application patterns", async () => {
      const ap1 = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ap2 = makeAppPattern({ id: "ap-2", slug: "concurrency", name: "Concurrency" });
      const ep1 = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });
      const ep2 = makeEffectPattern({ id: "ep-2", slug: "fiber-basics", applicationPatternId: "ap-2" });
      const ep3 = makeEffectPattern({ id: "ep-3", slug: "fiber-join", applicationPatternId: "ap-2" });

      const repos = makeMockRepos({
        appPatterns: [ap1, ap2],
        effectPatterns: [ep1, ep2, ep3],
      });

      const counts = await run(repos);

      expect(counts).toEqual({ created: 2, updated: 0, unchanged: 0, skipped: 0 });
      expect(repos.skillRepo.upsert).toHaveBeenCalledTimes(2);
      // Second skill should link 2 patterns
      expect(repos.skillRepo.setPatterns).toHaveBeenCalledWith("new-skill-id", ["ep-2", "ep-3"]);
    });

    it("should pass generated content to upsert", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "resource-mgmt", name: "Resource Management" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "use-acquire-release", applicationPatternId: "ap-1" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
      });

      await run(repos);

      expect(generateCategorySkill).toHaveBeenCalledWith("resource-mgmt", expect.any(Array));
      expect(repos.skillRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "# Generated skill for resource-mgmt (1 patterns)",
        })
      );
    });
  });

  // ------------------------------------------
  // Skip: no patterns
  // ------------------------------------------

  describe("app patterns with no effect patterns", () => {
    it("should skip app patterns that have no linked effect patterns", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "empty-category", name: "Empty" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [], // no patterns linked to ap-1
      });

      const counts = await run(repos);

      expect(counts).toEqual({ created: 0, updated: 0, unchanged: 0, skipped: 0 });
      expect(repos.skillRepo.upsert).not.toHaveBeenCalled();
    });

    it("should skip patterns with no applicationPatternId", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const orphan = makeEffectPattern({ id: "ep-1", slug: "orphan", applicationPatternId: null });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [orphan],
      });

      const counts = await run(repos);

      expect(counts).toEqual({ created: 0, updated: 0, unchanged: 0, skipped: 0 });
      expect(repos.skillRepo.upsert).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // Skip: locked (validated)
  // ------------------------------------------

  describe("locked skill protection", () => {
    it("should skip skills that are validated (locked)", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const lockedSkill = makeSkill({
        id: "existing-id",
        slug: "effect-patterns-error-handling",
        validated: true,
        content: "old content",
      });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
        existingSkills: new Map([["effect-patterns-error-handling", lockedSkill]]),
      });

      const counts = await run(repos);

      expect(counts).toEqual({ created: 0, updated: 0, unchanged: 0, skipped: 1 });
      expect(repos.skillRepo.upsert).not.toHaveBeenCalled();
      expect(repos.skillRepo.setPatterns).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // Skip: unchanged content (idempotency)
  // ------------------------------------------

  describe("idempotency (unchanged content)", () => {
    it("should skip skills when generated content matches existing", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      // Make existing skill content match what generateCategorySkill will produce
      const existingSkill = makeSkill({
        id: "existing-id",
        slug: "effect-patterns-error-handling",
        content: "# Generated skill for error-handling (1 patterns)",
      });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
        existingSkills: new Map([["effect-patterns-error-handling", existingSkill]]),
      });

      const counts = await run(repos);

      expect(counts).toEqual({ created: 0, updated: 0, unchanged: 1, skipped: 0 });
      expect(repos.skillRepo.upsert).not.toHaveBeenCalled();
      expect(repos.skillRepo.setPatterns).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // Update: content changed
  // ------------------------------------------

  describe("update on content change", () => {
    it("should update existing skill when content differs", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const existingSkill = makeSkill({
        id: "existing-id",
        slug: "effect-patterns-error-handling",
        content: "old stale content",
        version: 2,
      });

      const updatedSkill = makeSkill({
        id: "existing-id",
        slug: "effect-patterns-error-handling",
        version: 3,
      });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
        existingSkills: new Map([["effect-patterns-error-handling", existingSkill]]),
        upsertResult: updatedSkill,
      });

      const counts = await run(repos);

      expect(counts).toEqual({ created: 0, updated: 1, unchanged: 0, skipped: 0 });
      expect(repos.skillRepo.upsert).toHaveBeenCalledOnce();
      expect(repos.skillRepo.setPatterns).toHaveBeenCalledWith("existing-id", ["ep-1"]);
    });
  });

  // ------------------------------------------
  // Category filter
  // ------------------------------------------

  describe("--category filter", () => {
    it("should only process the matching application pattern", async () => {
      const ap1 = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ap2 = makeAppPattern({ id: "ap-2", slug: "concurrency", name: "Concurrency" });
      const ep1 = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });
      const ep2 = makeEffectPattern({ id: "ep-2", slug: "fiber-basics", applicationPatternId: "ap-2" });

      const repos = makeMockRepos({
        appPatterns: [ap1, ap2],
        effectPatterns: [ep1, ep2],
      });

      const counts = await run(repos, {
        ...defaultOptions,
        category: Option.some("error-handling"),
      });

      expect(counts).toEqual({ created: 1, updated: 0, unchanged: 0, skipped: 0 });
      expect(repos.skillRepo.upsert).toHaveBeenCalledOnce();
      expect(repos.skillRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "effect-patterns-error-handling" })
      );
    });

    it("should return undefined when category slug does not exist", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });

      const repos = makeMockRepos({ appPatterns: [ap], effectPatterns: [] });

      const result = await run(repos, {
        ...defaultOptions,
        category: Option.some("nonexistent-slug"),
      });

      expect(result).toBeUndefined();
      expect(repos.skillRepo.upsert).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // Dry run
  // ------------------------------------------

  describe("--dry-run mode", () => {
    it("should report counts without writing to the database", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
      });

      const counts = await run(repos, { ...defaultOptions, dryRun: true });

      expect(counts).toEqual({ created: 1, updated: 0, unchanged: 0, skipped: 0 });
      expect(repos.skillRepo.upsert).not.toHaveBeenCalled();
      expect(repos.skillRepo.setPatterns).not.toHaveBeenCalled();
    });

    it("should report update in dry-run when content differs from existing skill", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const existingSkill = makeSkill({
        id: "existing-id",
        slug: "effect-patterns-error-handling",
        content: "old content",
      });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
        existingSkills: new Map([["effect-patterns-error-handling", existingSkill]]),
      });

      const counts = await run(repos, { ...defaultOptions, dryRun: true });

      expect(counts).toEqual({ created: 0, updated: 1, unchanged: 0, skipped: 0 });
      expect(repos.skillRepo.upsert).not.toHaveBeenCalled();
    });

    it("should still skip locked skills in dry-run", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const lockedSkill = makeSkill({
        id: "existing-id",
        slug: "effect-patterns-error-handling",
        validated: true,
      });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
        existingSkills: new Map([["effect-patterns-error-handling", lockedSkill]]),
      });

      const counts = await run(repos, { ...defaultOptions, dryRun: true });

      expect(counts).toEqual({ created: 0, updated: 0, unchanged: 0, skipped: 1 });
    });

    it("should still skip unchanged skills in dry-run", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const existingSkill = makeSkill({
        id: "existing-id",
        slug: "effect-patterns-error-handling",
        content: "# Generated skill for error-handling (1 patterns)",
      });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
        existingSkills: new Map([["effect-patterns-error-handling", existingSkill]]),
      });

      const counts = await run(repos, { ...defaultOptions, dryRun: true });

      expect(counts).toEqual({ created: 0, updated: 0, unchanged: 1, skipped: 0 });
    });
  });

  // ------------------------------------------
  // Write files
  // ------------------------------------------

  describe("--write-files mode", () => {
    it("should write Claude, OpenAI, and Gemini skill files", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
      });

      await run(repos, { ...defaultOptions, writeFiles: true });

      expect(writeSkill).toHaveBeenCalledWith(
        "effect-patterns-error-handling",
        expect.any(String),
        expect.any(String),
      );
      expect(writeOpenAISkill).toHaveBeenCalledWith(
        "effect-patterns-error-handling",
        expect.any(String),
        expect.any(String),
      );
      expect(writeGeminiSkill).toHaveBeenCalledWith(
        expect.objectContaining({ skillName: "effect-patterns-error-handling" }),
        expect.any(String),
      );
    });

    it("should not write files when writeFiles is false", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
      });

      await run(repos, { ...defaultOptions, writeFiles: false });

      expect(writeSkill).not.toHaveBeenCalled();
      expect(writeOpenAISkill).not.toHaveBeenCalled();
      expect(writeGeminiSkill).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // Error handling
  // ------------------------------------------

  describe("error handling", () => {
    it("should propagate error when appPatternRepo.findAll fails", async () => {
      const repos = makeMockRepos();
      repos.appPatternRepo.findAll.mockRejectedValue(new Error("DB connection lost"));

      await expect(run(repos)).rejects.toThrow("Failed to query application patterns");
    });

    it("should propagate error when patternRepo.findAll fails", async () => {
      const repos = makeMockRepos({ appPatterns: [makeAppPattern({ id: "ap-1", slug: "a", name: "A" })] });
      repos.patternRepo.findAll.mockRejectedValue(new Error("DB connection lost"));

      await expect(run(repos)).rejects.toThrow("Failed to query effect patterns");
    });

    it("should propagate error when skillRepo.upsert fails", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
      });
      repos.skillRepo.upsert.mockRejectedValue(new Error("unique constraint violation"));

      await expect(run(repos)).rejects.toThrow("Failed to upsert skill");
    });

    it("should propagate error when skillRepo.setPatterns fails", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
      });
      repos.skillRepo.setPatterns.mockRejectedValue(new Error("FK violation"));

      await expect(run(repos)).rejects.toThrow("Failed to set patterns for effect-patterns-error-handling");
    });

    it("should wrap SkillLockedError from upsert into a descriptive message", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
      });

      const lockedError = Object.assign(new Error("locked"), { _tag: "SkillLockedError" });
      repos.skillRepo.upsert.mockRejectedValue(lockedError);

      await expect(run(repos)).rejects.toThrow("Skill effect-patterns-error-handling is locked");
    });
  });

  // ------------------------------------------
  // Mixed scenarios
  // ------------------------------------------

  describe("mixed scenarios", () => {
    it("should handle mix of create, update, unchanged, and skipped", async () => {
      const ap1 = makeAppPattern({ id: "ap-1", slug: "error-handling", name: "Error Handling" });
      const ap2 = makeAppPattern({ id: "ap-2", slug: "concurrency", name: "Concurrency" });
      const ap3 = makeAppPattern({ id: "ap-3", slug: "resources", name: "Resources" });
      const ap4 = makeAppPattern({ id: "ap-4", slug: "empty", name: "Empty" });

      const ep1 = makeEffectPattern({ id: "ep-1", slug: "tagged-errors", applicationPatternId: "ap-1" });
      const ep2 = makeEffectPattern({ id: "ep-2", slug: "fiber-basics", applicationPatternId: "ap-2" });
      const ep3 = makeEffectPattern({ id: "ep-3", slug: "acquire-release", applicationPatternId: "ap-3" });
      // ap-4 has no patterns

      // ap-1 → new skill
      // ap-2 → existing, unchanged content
      // ap-3 → existing, locked
      // ap-4 → no patterns

      const unchangedSkill = makeSkill({
        id: "s-2",
        slug: "effect-patterns-concurrency",
        content: "# Generated skill for concurrency (1 patterns)",
      });

      const lockedSkill = makeSkill({
        id: "s-3",
        slug: "effect-patterns-resources",
        validated: true,
        content: "old",
      });

      const repos = makeMockRepos({
        appPatterns: [ap1, ap2, ap3, ap4],
        effectPatterns: [ep1, ep2, ep3],
        existingSkills: new Map([
          ["effect-patterns-concurrency", unchangedSkill],
          ["effect-patterns-resources", lockedSkill],
        ]),
      });

      const counts = await run(repos);

      expect(counts).toEqual({ created: 1, updated: 0, unchanged: 1, skipped: 1 });
      expect(repos.skillRepo.upsert).toHaveBeenCalledOnce();
      expect(repos.skillRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "effect-patterns-error-handling" })
      );
    });

    it("should handle empty database gracefully", async () => {
      const repos = makeMockRepos({
        appPatterns: [],
        effectPatterns: [],
      });

      const counts = await run(repos);

      expect(counts).toEqual({ created: 0, updated: 0, unchanged: 0, skipped: 0 });
      expect(repos.skillRepo.upsert).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // Slug and naming conventions
  // ------------------------------------------

  describe("naming conventions", () => {
    it("should build correct slug and name from application pattern", async () => {
      const ap = makeAppPattern({ id: "ap-1", slug: "state-management", name: "State Management" });
      const ep = makeEffectPattern({ id: "ep-1", slug: "ref-basics", applicationPatternId: "ap-1" });

      const repos = makeMockRepos({
        appPatterns: [ap],
        effectPatterns: [ep],
      });

      await run(repos);

      expect(repos.skillRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "effect-patterns-state-management",
          name: "Effect-TS Patterns: State Management",
          description: "Effect-TS patterns for state management. Use when working with state management in Effect-TS applications.",
        })
      );
    });
  });
});
