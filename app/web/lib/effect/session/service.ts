/**
 * Session service implementation
 *
 * TODO: Implement in Phase 3
 */

import { Context, Effect } from 'effect';
import type * as Api from './api.js';

export class SessionService extends Context.Tag('SessionService')<
  SessionService,
  Api.SessionService
>() {}

export const getSession = Effect.serviceFunction(
  SessionService,
  (service) => service.getSession
);

export const updateSession = Effect.serviceFunction(
  SessionService,
  (service) => service.updateSession
);
