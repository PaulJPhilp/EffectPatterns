# Step 1: Create Effect HTTP Server Boilerplate

## Prompt for AI Coding Agent

### Objective
Create the foundational boilerplate for a new HTTP web server using the Effect ecosystem.

### Context
This is the first step in building our new Pattern Server. The goal for this task is to set up a minimal, runnable "hello world" server. We are not implementing the actual API logic yet; we are only creating the essential server structure.

### Technical Requirements

#### 1. Create a New Directory and File
Create a new directory named `server/` at the project root, and within it, create a new entry point file named `index.ts`.

#### 2. Use Effect Libraries
The server must be built using the idiomatic libraries from the Effect ecosystem, primarily:
- `@effect/platform-node` for the Node.js runtime
- `@effect/platform` for HTTP server and routing logic

**Important**: Review the existing dependencies in `package.json` to see which Effect platform packages are already installed. Based on the current dependencies, you should use:
- `@effect/platform-node` (v0.94.2) - Already installed
- `@effect/platform` (v0.90.10) - Already installed
- `effect` (v3.17.14) - Already installed

#### 3. Implement a Basic Server
The server should:
- Listen on a configurable port (defaulting to `3000`)
- Use Effect's dependency injection system (Layer) for configuration
- Use Effect.gen for the main program logic
- Follow Effect-TS best practices as outlined in the repository patterns

#### 4. Create a Health-Check Endpoint
Add a single API endpoint:
- **Route:** `GET /health`
- **Response:** Return a JSON response with a `200 OK` status
- **Body:** `{"status": "ok"}`

Use Effect's HTTP routing system to define the route handler.

#### 5. Add `package.json` Script
Add a new script to the `scripts` section of `package.json`:
```json
"server:dev": "bun --watch server/index.ts"
```

### Implementation Guidelines

#### Follow Repository Conventions
1. **Use Bun runtime**: The project uses Bun, not Node.js (see `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc`)
2. **Effect patterns**: Follow the Effect-TS patterns documented in `content/published/`
3. **Type safety**: Use proper TypeScript types throughout
4. **Error handling**: Use Effect's typed error handling (avoid generic Error)
5. **Structured logging**: Use Effect's built-in logging (`Effect.log`)

#### Effect-TS Best Practices
Based on the repository's patterns:

1. **Use Effect.gen for sequential logic** (pattern: `use-gen-for-business-logic.mdx`)
   ```typescript
   Effect.gen(function* () {
     // Sequential operations with yield*
   })
   ```

2. **Use Layer for dependency injection** (pattern: `understand-layers-for-dependency-injection.mdx`)
   - Define services and their implementations as Layers
   - Compose layers with `Layer.provide` or `Layer.merge`

3. **Use runMain for long-running processes** (pattern: `execute-long-running-apps-with-runfork.mdx`)
   ```typescript
   NodeRuntime.runMain(program)
   ```

4. **Use structured logging** (pattern: `leverage-structured-logging.mdx`)
   ```typescript
   Effect.log("Server starting", { port })
   ```

5. **Use tagged errors** (pattern: `define-tagged-errors.mdx`)
   ```typescript
   class ServerError extends Data.TaggedError("ServerError")<{
     cause: unknown;
   }> {}
   ```

### Expected Deliverables

#### 1. Server Implementation (`server/index.ts`)
A complete, runnable Effect-based HTTP server that:
- Follows Effect-TS idioms and patterns
- Uses proper dependency injection with Layers
- Implements the `/health` endpoint
- Includes structured logging
- Has typed error handling
- Can be run with `bun --watch server/index.ts`

#### 2. Package.json Update
The exact line to add to the `scripts` section:
```json
"server:dev": "bun --watch server/index.ts"
```

#### 3. Dependencies Analysis
List any new npm packages that need to be installed. Note that these packages are already available:
- `@effect/platform` (v0.90.10)
- `@effect/platform-node` (v0.94.2)
- `effect` (v3.17.14)

If additional packages are needed (e.g., for HTTP routing), list them explicitly.

### Validation Criteria

The implementation should:
1. ✅ Run successfully with `bun run server:dev`
2. ✅ Respond to `GET /health` with `{"status": "ok"}`
3. ✅ Log structured startup messages
4. ✅ Use Effect's dependency injection (Layer)
5. ✅ Follow repository patterns and conventions
6. ✅ Include proper TypeScript types
7. ✅ Use Effect.gen for main program logic
8. ✅ Handle errors using typed errors (not generic Error)
9. ✅ Support graceful shutdown (following `implement-graceful-shutdown.mdx` pattern)

### Reference Patterns

Review these patterns from `content/published/` for implementation guidance:
- `build-a-basic-http-server.mdx` - HTTP server setup
- `handle-get-request.mdx` - Route handling
- `send-json-response.mdx` - JSON responses
- `use-gen-for-business-logic.mdx` - Effect.gen usage
- `understand-layers-for-dependency-injection.mdx` - Layer composition
- `leverage-structured-logging.mdx` - Logging
- `implement-graceful-shutdown.mdx` - Shutdown handling
- `execute-long-running-apps-with-runfork.mdx` - Long-running processes

### Additional Notes

- The server will eventually serve the patterns API, but for now, just implement the health check
- Follow the project's TypeScript configuration (NodeNext module resolution)
- Use the `@effect/language-service` plugin benefits (it's already configured)
- Keep the implementation simple and focused on the boilerplate structure
- Ensure the code is well-commented to explain the Effect patterns being used

---

## Example Implementation Structure

Here's a suggested structure for `server/index.ts`:

```typescript
/**
 * Pattern Server - HTTP API Server
 *
 * A minimal Effect-based HTTP server that serves the Effect Patterns API.
 * Built using @effect/platform for HTTP handling and Effect's dependency injection.
 */

import { HttpServer } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";

// 1. Define tagged errors for type-safe error handling

// 2. Define the health check route handler

// 3. Create the HTTP router with all routes

// 4. Create the server configuration layer

// 5. Build the main program using Effect.gen

// 6. Run the server with NodeRuntime.runMain
```

### Code Structure Guidelines

1. **Organize imports** - Group by Effect modules, platform modules, and types
2. **Define errors first** - Use Data.TaggedError for all custom errors
3. **Define services** - If needed, create service interfaces and implementations
4. **Define routes** - Create route handlers using Effect.gen
5. **Create router** - Compose all routes into a single router
6. **Create layers** - Define configuration and server layers
7. **Main program** - Use Effect.gen for the main server logic
8. **Runtime execution** - Use NodeRuntime.runMain at the end

### Testing the Server

After implementation, test with:

```bash
# Start the server
bun run server:dev

# In another terminal, test the health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"ok"}
```

### Success Criteria

The implementation is successful when:
- ✅ Server starts without errors
- ✅ Health endpoint returns correct JSON
- ✅ Logs show structured startup messages
- ✅ Hot reload works with `--watch` flag
- ✅ Code follows Effect-TS patterns from the repository
- ✅ TypeScript compiles without errors
- ✅ Server can be gracefully shutdown (Ctrl+C)

---

## Implementation Checklist

Before submitting the implementation, verify:

- [ ] Created `server/` directory
- [ ] Created `server/index.ts` file
- [ ] Added `server:dev` script to `package.json`
- [ ] Used Effect.gen for main program logic
- [ ] Used Layer for dependency injection
- [ ] Implemented `/health` endpoint
- [ ] Returns correct JSON response
- [ ] Includes structured logging
- [ ] Uses tagged errors (not generic Error)
- [ ] Supports graceful shutdown
- [ ] Tested with `bun run server:dev`
- [ ] Tested health endpoint with curl
- [ ] Code is well-commented
- [ ] Follows TypeScript conventions
- [ ] No TypeScript errors
- [ ] Follows repository patterns

---

## Next Steps (Future Tasks)

After Step 1 is complete, the following steps will build on this foundation:

- **Step 2**: Add pattern data service and storage layer
- **Step 3**: Implement GET /patterns endpoint
- **Step 4**: Add filtering and search capabilities
- **Step 5**: Add CORS and security middleware
- **Step 6**: Add error handling middleware
- **Step 7**: Add API documentation (OpenAPI/Swagger)
- **Step 8**: Add tests for all endpoints
- **Step 9**: Add Docker configuration
- **Step 10**: Deploy to production

But for now, focus only on Step 1: creating a minimal, working server with a health check endpoint.
