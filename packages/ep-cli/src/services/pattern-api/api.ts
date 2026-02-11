/**
 * Pattern API service types
 */

import { Effect } from "effect";

export interface PatternSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly difficulty: string;
  readonly tags: readonly string[];
  readonly examples?: readonly unknown[];
  readonly useCases?: readonly string[];
  readonly relatedPatterns?: readonly string[];
}

export interface PatternDetail extends PatternSummary {
  readonly slug?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface PatternSearchParams {
  readonly query?: string;
  readonly category?: string;
  readonly difficulty?: string;
  readonly limit?: number;
}

export interface PatternApiService {
  readonly search: (
    params: PatternSearchParams
  ) => Effect.Effect<readonly PatternSummary[], Error>;
  readonly getById: (
    id: string
  ) => Effect.Effect<PatternDetail | null, Error>;
}
