/**
 * PatternScorerService Types
 * Core type definitions for pattern scoring and relevance evaluation
 */

export interface ScoringResult {
  needsPatterns: boolean;
  score: number;
  reasons: string[];
  suggestedTopics?: string[];
}

export interface DetailedScoringResult
  extends Omit<ScoringResult, "needsPatterns"> {
  effectScore: number;
  topicScore: number;
  guidanceScore: number;
  threshold: number;
}

export interface PatternKeywords {
  [topic: string]: string[];
}

export interface ScoringConfig {
  minScoreForPatterns: number;
  effectKeywordWeight: number;
  topicMatchWeight: number;
  guidanceIndicatorWeight: number;
}

export interface KeywordMatch {
  topic: string;
  matchCount: number;
  score: number;
}
