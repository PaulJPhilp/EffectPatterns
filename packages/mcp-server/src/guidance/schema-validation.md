# Pattern Guidance: Schema Validation at Boundaries

**Goal: Trust boundaries are explicit and enforced.**

## Use when
- Receiving data from an API, database, or user input.
- Sending data out to an external system.

## Avoid when
- Using `any` or `as MyType` to bypass validation.
- "Trusting" external JSON to match internal interfaces.

## Decision rule
If data crosses a process boundary, it must be validated by `@effect/schema`.
- Ingress: Parse/Decode.
- Egress: Encode.

## Simplifier
Validation is the bouncer. Nothing gets in without ID.

## Implementation prompt
"Implement the Fix Plan for this finding: Define a Schema for the external data structure. Use `Schema.decodeUnknown` (or similar) to validate the input before using it."
