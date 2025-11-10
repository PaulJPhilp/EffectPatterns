import type { KeywordMatch, PatternKeywords } from "./types";

/**
 * PatternScorerService Helpers
 * Utility functions for pattern scoring and keyword matching
 */

/**
 * Pattern relevance keywords for different Effect-TS topics
 */
export const PATTERN_KEYWORDS: PatternKeywords = {
  "error-handling": [
    "error",
    "fail",
    "catch",
    "throw",
    "exception",
    "try",
    "result",
    "either",
    "option",
    "validation",
  ],
  "dependency-injection": [
    "dependency",
    "inject",
    "di",
    "service",
    "layer",
    "provide",
    "dependency injection",
  ],
  "async-programming": [
    "async",
    "await",
    "promise",
    "callback",
    "concurrent",
    "parallel",
    "task",
    "effect",
  ],
  "type-safety": [
    "type",
    "typing",
    "types",
    "typesafe",
    "type-safe",
    "schema",
    "validation",
    "narrowing",
  ],
  testing: ["test", "unit", "integration", "mock", "spy", "stub", "coverage"],
  performance: [
    "performance",
    "optimize",
    "optimization",
    "fast",
    "slow",
    "memory",
    "gc",
    "garbage collection",
  ],
  composition: [
    "compose",
    "composition",
    "combine",
    "combine",
    "pipe",
    "functional",
    "fp",
  ],
  "context-propagation": [
    "context",
    "propagat",
    "request",
    "trace",
    "tracing",
    "span",
    "correlation",
  ],
};

/**
 * Effect-TS specific terms that increase pattern relevance
 */
export const EFFECT_KEYWORDS = [
  "effect",
  "effect-ts",
  "effectts",
  "effect.ts",
  "layer",
  "service",
  "gen",
  "pipe",
  "schema",
  "either",
  "option",
  "result",
];

/**
 * Keywords that suggest the user needs pattern guidance
 */
export const GUIDANCE_INDICATORS = [
  "how to",
  "how do i",
  "what is",
  "what are",
  "best practice",
  "best practices",
  "pattern",
  "example",
  "examples",
  "should i",
  "can i",
  "is it",
  "understand",
  "learn",
  "help",
  "guide",
];

/**
 * Check if query contains explicit negations
 */
export function hasNegation(query: string): boolean {
  const negationPatterns = [
    /don't.*pattern/i,
    /no.*pattern/i,
    /without.*pattern/i,
    /no.*example/i,
    /don't.*example/i,
    /off-topic|unrelated|not effect/i,
  ];

  return negationPatterns.some((pattern) => pattern.test(query));
}

/**
 * Score how specific to Effect-TS the query is
 */
export function scoreEffectSpecificity(query: string): number {
  let keywordCount = 0;
  let totalScore = 0;

  for (const keyword of EFFECT_KEYWORDS) {
    if (query.includes(keyword)) {
      keywordCount++;
      if (keyword === "effect" || keyword === "effect-ts") {
        totalScore += 1;
      } else {
        totalScore += 0.5;
      }
    }
  }

  return Math.min(1, totalScore / EFFECT_KEYWORDS.length);
}

/**
 * Match query against pattern topics
 */
export function matchTopics(query: string): {
  topics: string[];
  score: number;
  matches: KeywordMatch[];
} {
  const matchedTopics: string[] = [];
  const matches: KeywordMatch[] = [];
  let matchScore = 0;

  for (const [topic, keywords] of Object.entries(PATTERN_KEYWORDS)) {
    const matchedKeywords = keywords.filter((keyword) =>
      query.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      matchedTopics.push(topic);
      const topicScore = Math.min(0.5, matchedKeywords.length * 0.15);
      matchScore += topicScore;
      matches.push({
        topic,
        matchCount: matchedKeywords.length,
        score: topicScore,
      });
    }
  }

  return {
    topics: matchedTopics,
    score: Math.min(1, matchScore),
    matches,
  };
}

/**
 * Score presence of learning/guidance indicators
 */
export function scoreGuidance(query: string): number {
  let indicatorCount = 0;

  for (const indicator of GUIDANCE_INDICATORS) {
    if (query.includes(indicator)) {
      indicatorCount++;
    }
  }

  return Math.min(1, indicatorCount * 0.3);
}

