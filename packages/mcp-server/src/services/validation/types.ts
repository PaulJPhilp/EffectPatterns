import { ValidationError } from "../../errors";

/**
 * Validation result
 */
export interface ValidationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly errors?: readonly ValidationError[];
}

/**
 * Request validation schema
 */
export interface RequestValidation {
  readonly method: string;
  readonly path: string;
  readonly query?: Record<string, unknown>;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}

/**
 * Pattern search validation schema
 */
export interface PatternSearchValidation {
  readonly query?: string;
  readonly skillLevel?: "beginner" | "intermediate" | "advanced";
  readonly useCase?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Pattern retrieval validation schema
 */
export interface PatternRetrievalValidation {
  readonly id: string;
}
