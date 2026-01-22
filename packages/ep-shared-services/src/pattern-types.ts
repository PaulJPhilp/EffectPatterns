/**
 * pattern-types.ts
 * 
 * Type definitions for pattern presentation system.
 * Separated for clarity and reusability.
 */

/**
 * Source metadata: preserves provenance for debugging & reproducibility
 */
export interface PatternSource {
  readonly patternId: string;
  readonly filePath: string;
  readonly commit?: string;            // For reproducibility: git commit
  readonly server?: string;             // Which server returned this
  readonly retrievedAt: number;         // When fetched from server
  readonly indexedAt?: number;          // When cached locally (if different)
  readonly contentHash: string;         // SHA256 of pattern file (reproducible)
  readonly effectVersion?: string;      // Pin defaults to version
}

/**
 * Default behavior: "what people commonly do" or "behavior when omitted"
 */
export interface DefaultBehavior {
  readonly behavior: string;           // The actual default behavior
  readonly rationale: string;          // Why this matters
  readonly riskLevel: "low" | "medium" | "high";
}

/**
 * Recommended practice: context-dependent recommendation
 */
export interface RecommendedPractice {
  readonly practice: string;           // What to do instead
  readonly conditions: readonly string[];  // When to use this recommendation
  readonly tradeoffs?: readonly string[];   // Any downsides
}

/**
 * Flexible card sections: optional, category-dependent
 */
export interface PatternCardSections {
  // Universal sections
  readonly default?: DefaultBehavior;
  readonly recommended?: readonly RecommendedPractice[];
  readonly gotchas?: readonly string[];
  readonly tradeoffs?: readonly string[];
  
  // Category-specific sections (only present when relevant)
  readonly setupTeardown?: string;     // Testing patterns
  readonly retryPolicy?: string;       // Error-handling patterns
  readonly layering?: string;          // Architecture patterns
}

/**
 * Code example with context
 */
export interface PatternExample {
  readonly title: string;
  readonly code: string;
  readonly language: "typescript" | "bash" | "text";
  readonly notes?: string;
}

/**
 * When to use / avoid guidance
 */
export interface UseGuidance {
  readonly whenUse: readonly string[];
  readonly whenAvoid: readonly string[];
}

/**
 * Presented pattern card (domain layer)
 * Ready for rendering or API consumption
 */
export interface PresentedPatternCard {
  // Identity
  readonly id: string;
  readonly title: string;
  readonly difficulty: "beginner" | "intermediate" | "advanced";
  readonly category: string;
  readonly summary: string;
  readonly tags: readonly string[];
  
  // Provenance (always preserved)
  readonly source: PatternSource;
  
  // Guidance
  readonly useGuidance: UseGuidance;
  readonly sections: PatternCardSections;  // Optional sections per category
  
  // Examples
  readonly minimalExample: PatternExample;
  readonly advancedExample?: PatternExample;
  
  // Navigation
  readonly relatedPatterns?: readonly { readonly id: string; readonly title: string }[];
}

/**
 * Index for navigation and statistics
 */
export interface PresentedPatternIndex {
  readonly patterns: readonly PresentedPatternCard[];
  readonly totalCount: number;
  readonly categories: Record<string, number>;
  readonly difficulties: Record<"beginner" | "intermediate" | "advanced", number>;
  readonly indexedAt: number;
  readonly sources: readonly PatternSource[];
}

/**
 * Render options
 */
export interface RenderOptions {
  readonly format?: "markdown" | "json" | "ui-schema";
  readonly includeProvenancePanel?: boolean;
  readonly includeAdvancedExamples?: boolean;
}

/**
 * Rendered output: discriminated union (type-safe)
 */
export type RenderedOutput =
  | {
      readonly format: "markdown";
      readonly content: string;
      readonly provenance: ProvenanceInfo;
    }
  | {
      readonly format: "json";
      readonly data: PresentedPatternIndex;
      readonly provenance: ProvenanceInfo;
    }
  | {
      readonly format: "ui-schema";
      readonly data: unknown;  // Can be further typed based on UI framework
      readonly provenance: ProvenanceInfo;
    };

/**
 * Provenance information (metadata about the rendered output)
 */
export interface ProvenanceInfo {
  readonly sources: readonly PatternSource[];
  readonly renderedAt: number;
  readonly renderedBy: string;
}
