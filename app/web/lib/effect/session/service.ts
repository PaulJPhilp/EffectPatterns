/**
 * Session service implementation
 *
 * TODO: Implement in Phase 3
 */

import { Context } from 'effect';
import type * as Api from './api.js';

export class SessionService extends Context.Tag('SessionService')<
  SessionService,
  Api.SessionService
>() {}

export const { getSession, updateSession } = SessionService;
