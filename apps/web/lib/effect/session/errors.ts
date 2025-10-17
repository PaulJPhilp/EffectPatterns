/**
 * Error definitions for Session service
 */

import { Data } from 'effect';

export class SessionNotFoundError extends Data.TaggedError(
  'Session/NotFoundError'
)<{
  readonly userId: string;
}> {}

export class SessionUpdateError extends Data.TaggedError(
  'Session/UpdateError'
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type SessionError = SessionNotFoundError | SessionUpdateError;
