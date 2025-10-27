/**
 * Domain types for Session service
 *
 * TODO: Define session types matching Convex schema
 */

export type SessionId = string;
export type UserId = string;

// TODO: Match Convex sessions schema
export interface Session {
  readonly userId: UserId;
  readonly currentModule?: string;
  readonly currentPattern?: string;
  readonly currentPhase?: number;
  readonly subscriptionTier: 'free' | 'pro' | 'enterprise';
  readonly updatedAt: Date;
}

// Convex client adapter
export interface ConvexAdapter {
  readonly getSession: (userId: UserId) => Promise<Session | null>;
  readonly updateSession: (session: Session) => Promise<void>;
}
