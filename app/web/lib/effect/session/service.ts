/**
 * Session service implementation
 *
 * TODO: Implement in Phase 3
 */

import { Effect } from "effect";

/**
 * Session service implementation (stub - Phase 3)
 */
const makeSessionService = () =>
  Effect.gen(function* () {
    return {
      getSession: () =>
        Effect.fail(new Error("SessionService not implemented")),
      updateSession: () =>
        Effect.fail(new Error("SessionService not implemented")),
    };
  });

export class SessionService extends Effect.Service<SessionService>()(
  "SessionService",
  {
    scoped: makeSessionService,
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
