# Step 1: Create Effect HTTP Server Boilerplate

## Objective
Create the foundational boilerplate for a new HTTP web server using the Effect ecosystem.

## Requirements
- Use `@effect/platform-node`, `@effect/platform`, and `effect` packages
- Implement `GET /health` returning `{"status":"ok"}`
- Use `Effect.gen`, `Layer`, and `NodeRuntime.runMain`
- Add `server:dev` script: `"server:dev": "bun --watch server/index.ts"`

## Example Structure

```text
server/
	index.ts
```

## Notes
- Follow repository patterns for layers, logging, and tagged errors
- Keep implementation minimal and well-documented


