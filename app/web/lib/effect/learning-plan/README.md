# Learning Plan Service

AI-powered personalized learning plan generation.

## Status

🚧 **Phase 4 Implementation** - Service scaffold created, implementation pending.

## Purpose

- Generate personalized learning plans via LLM
- Store plans in Postgres and Convex
- Track plan progress
- Enforce free tier limits

## Dependencies

- Vercel AI SDK (Claude)
- PatternService
- UserProgressService

## TODO

- [ ] Implement Vercel AI SDK wrapper
- [ ] Define plan schema (phases, patternIds, rationale)
- [ ] Add retry/timeout logic
- [ ] Implement free tier limits
- [ ] Add tests
