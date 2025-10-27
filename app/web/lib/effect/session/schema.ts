/**
 * Schema definitions for Session service
 *
 * TODO: Implement in Phase 3
 */

import { Schema } from '@effect/schema';

export const SubscriptionTier = Schema.Literal('free', 'pro', 'enterprise');

export class SessionSchema extends Schema.Class<SessionSchema>('Session')({
  userId: Schema.String,
  currentModule: Schema.optional(Schema.String),
  currentPattern: Schema.optional(Schema.String),
  currentPhase: Schema.optional(Schema.Number),
  subscriptionTier: SubscriptionTier,
  updatedAt: Schema.Date,
}) {}
