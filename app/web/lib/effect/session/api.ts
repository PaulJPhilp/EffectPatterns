/**
 * Public API for Session service
 *
 * TODO: Implement in Phase 3
 */

import type { Effect } from 'effect';
import type * as Errors from './errors.js';
import type * as Types from './types.js';

export interface SessionService {
  readonly getSession: (
    userId: Types.UserId
  ) => Effect.Effect<Types.Session, Errors.SessionNotFoundError>;

  readonly updateSession: (
    session: Types.Session
  ) => Effect.Effect<void, Errors.SessionUpdateError>;
}
