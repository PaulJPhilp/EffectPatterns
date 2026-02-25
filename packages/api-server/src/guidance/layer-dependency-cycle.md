# Pattern Guidance: Layer Dependency Cycles

**Goal: Construct a stable, acyclic dependency graph.**

## Use when
- You are composing the final application runtime layer.
- You are testing services in isolation (providing specific layers).

## Avoid when
- Layer A depends on Layer B, and Layer B depends on Layer A (circular).
- A service "injects" a layer that eventually requires the service itself.

## Decision rule
Dependencies must flow in one direction: Application -> Feature -> Domain -> Infrastructure. Cycles break runtime initialization.

## Simplifier
Layers are a pyramid, not a wheel.

## Implementation prompt
"Implement the Fix Plan for this finding: Break the dependency cycle. Extract the shared dependency into a third, lower-level layer/service that both existing layers can consume."
