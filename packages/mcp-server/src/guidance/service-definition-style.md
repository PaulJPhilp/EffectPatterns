# Pattern Guidance: Service Definition Style

**Goal: Consistent, type-safe dependency injection.**

## Use when
- Defining any stateful or context-dependent component (Database, Logger, UserRepo).
- You want to swap implementations for testing.

## Avoid when
- Using raw functions for stateful logic (hard to mock).
- Using plain classes without `Context.Tag` (cannot use dependency injection).
- Using different styles (some classes, some tags) in the same project.

## Decision rule
Standardize on `Effect.Service`: `export class MyService extends Effect.Service<MyService>()("MyService", { ... })`.

## Simplifier
One way to define services = zero confusion for consumers.

## Implementation prompt
"Implement the Fix Plan for this finding: Refactor the service definition to use the `class MyService extends Effect.Service<MyService>()` pattern. Move implementation logic into the `effect` property."
