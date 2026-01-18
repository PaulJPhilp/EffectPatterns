# Pattern Guidance: Schema Validation at Boundaries

**Goal: Trust boundaries are explicit and enforced.**

## Use when
- Receiving data from external sources (API, Database, File System, User Input).
- Sending data to external systems where the contract must be guaranteed.

## Avoid when
- Using `as MyType` or `any` to "force" a type onto unknown data.
- Assuming external JSON will always match your TypeScript interfaces.

## Decision rule
If data originates outside your system, it is untrusted. Use `@effect/schema` to parse and validate it before it enters your domain logic.
- Parse/Decode at the gate.
- Encode at the exit.

## Simplifier
Validation is the bouncer. No ID, no entry.

## Implementation prompt
"Implement the Fix Plan for this finding: Define an `@effect/schema` for this data. Use `Schema.decodeUnknown` to validate the input and handle the potential parse error in the Effect error channel."
