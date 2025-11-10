/**
 * Session service implementation
 *
 * TODO: Implement in Phase 3
 */

import { Effect } from "effect";

/**
 * Session service implementation
 */
export class SessionService extends Effect.Service<SessionService>()(
  "SessionService",
  {
    sync: () => {
      throw new Error("SessionService not implemented");
    },
  }
) {}

export const getSession = Effect.serviceFunction(
  SessionService,
  (service) => service.getSession
);

export const updateSession = Effect.serviceFunction(
  SessionService,
  (service) => service.updateSession
);
