import { Effect, Either } from 'effect';
import { describe, it, expect } from 'vitest';

// Define our types
export type User = {
  id: number;
  name: string;
};

export class NotFoundError extends Error {
  readonly _tag = 'NotFoundError';
  constructor(readonly id: number) {
    super(`User ${id} not found`);
  }
}

// 1. Read the actual service interface first.
export interface DatabaseServiceApi {
  getUserById: (id: number) => Effect.Effect<User, NotFoundError>;
}

// Implement the service
export class DatabaseService extends Effect.Service<DatabaseService>()("DatabaseService", {
  sync: () => ({
    getUserById: (id: number) => 
      Effect.succeed({ id, name: 'Test User' })
  })
}){}

// 2. Write a test that correctly invokes that interface.
describe('DatabaseService', () => {
  it("should return a user", () =>
    Effect.gen(function* () {
      const db = yield* DatabaseService;
      const result = yield* Effect.either(db.getUserById(123));
      
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toEqual({
          id: 123,
          name: 'Test User'
        });
      }
    }).pipe(Effect.provide(DatabaseService.Default), Effect.runPromise)
  );
});