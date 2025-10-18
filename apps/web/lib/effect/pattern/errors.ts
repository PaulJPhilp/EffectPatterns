/**
 * Error definitions for Pattern repository
 */

import { Data } from 'effect';

export class PatternNotFound extends Data.TaggedError('PatternNotFound')<{
  id: string;
}> {}

export class PatternQueryError extends Data.TaggedError('PatternQueryError')<{
  message: string;
  cause?: unknown;
}> {}

export type PatternError = PatternNotFound | PatternQueryError;
