---
name: effect-patterns-making-http-requests
description: Effect-TS patterns for Making Http Requests. Use when working with making http requests in Effect-TS applications.
---
# Effect-TS Patterns: Making Http Requests
This skill provides 10 curated Effect-TS patterns for making http requests.
Use this skill when working on tasks related to:
- making http requests
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Parse JSON Responses Safely

**Rule:** Always validate HTTP responses with Schema to catch API changes at runtime.

**Good Example:**

```typescript
import { Effect, Console } from "effect"
import { Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { NodeHttpClient, NodeRuntime } from "@effect/platform-node"

// ============================================
// 1. Define response schemas
// ============================================

const PostSchema = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  body: Schema.String,
  userId: Schema.Number,
})

type Post = Schema.Schema.Type<typeof PostSchema>

const PostArraySchema = Schema.Array(PostSchema)

// ============================================
// 2. Fetch and validate single item
// ============================================

const getPost = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const response = yield* client.get(
      `https://jsonplaceholder.typicode.com/posts/${id}`
    )
    const json = yield* HttpClientResponse.json(response)

    // Validate against schema - fails if data doesn't match
    const post = yield* Schema.decodeUnknown(PostSchema)(json)

    return post
  })

// ============================================
// 3. Fetch and validate array
// ============================================

const getPosts = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient

  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts"
  )
  const json = yield* HttpClientResponse.json(response)

  // Validate array of posts
  const posts = yield* Schema.decodeUnknown(PostArraySchema)(json)

  return posts
})

// ============================================
// 4. Handle validation errors
// ============================================

const safeGetPost = (id: number) =>
  getPost(id).pipe(
    Effect.catchTag("ParseError", (error) =>
      Effect.gen(function* () {
        yield* Console.error(`Invalid response format: ${error.message}`)
        // Return a default or fail differently
        return yield* Effect.fail(new Error(`Post ${id} has invalid format`))
      })
    )
  )

// ============================================
// 5. Schema with optional fields
// ============================================

const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
  phone: Schema.optional(Schema.String),        // May not exist
  website: Schema.optional(Schema.String),
  company: Schema.optional(
    Schema.Struct({
      name: Schema.String,
      catchPhrase: Schema.optional(Schema.String),
    })
  ),
})

const getUser = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const response = yield* client.get(
      `https://jsonplaceholder.typicode.com/users/${id}`
    )
    const json = yield* HttpClientResponse.json(response)

    return yield* Schema.decodeUnknown(UserSchema)(json)
  })

// ============================================
// 6. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Console.log("=== Validated Single Post ===")
  const post = yield* getPost(1)
  yield* Console.log(`Title: ${post.title}`)

  yield* Console.log("\n=== Validated Posts Array ===")
  const posts = yield* getPosts
  yield* Console.log(`Fetched ${posts.length} posts`)

  yield* Console.log("\n=== User with Optional Fields ===")
  const user = yield* getUser(1)
  yield* Console.log(`User: ${user.name}`)
  yield* Console.log(`Company: ${user.company?.name ?? "N/A"}`)
})

program.pipe(
  Effect.provide(NodeHttpClient.layer),
  NodeRuntime.runMain
)
```

**Rationale:**

Use Effect Schema to validate HTTP JSON responses, ensuring the data matches your expected types at runtime.

---


APIs can change without warning:

1. **Fields disappear** - Backend removes a field
2. **Types change** - String becomes number
3. **Nulls appear** - Required field becomes optional
4. **New fields** - Extra data you didn't expect

Schema validation catches these issues immediately.

---

---

### Your First HTTP Request

**Rule:** Use @effect/platform HttpClient for type-safe HTTP requests with automatic error handling.

**Good Example:**

```typescript
import { Effect, Console } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { NodeHttpClient, NodeRuntime } from "@effect/platform-node"

// ============================================
// 1. Simple GET request
// ============================================

const simpleGet = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  
  // Make a GET request
  const response = yield* client.get("https://jsonplaceholder.typicode.com/posts/1")
  
  // Get response as JSON
  const json = yield* HttpClientResponse.json(response)
  
  return json
})

// ============================================
// 2. GET with typed response
// ============================================

interface Post {
  id: number
  title: string
  body: string
  userId: number
}

const getPost = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(
      `https://jsonplaceholder.typicode.com/posts/${id}`
    )
    const post = yield* HttpClientResponse.json(response) as Effect.Effect<Post>
    return post
  })

// ============================================
// 3. POST with body
// ============================================

const createPost = (title: string, body: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    
    const request = HttpClientRequest.post(
      "https://jsonplaceholder.typicode.com/posts"
    ).pipe(
      HttpClientRequest.jsonBody({ title, body, userId: 1 })
    )
    
    const response = yield* client.execute(yield* request)
    const created = yield* HttpClientResponse.json(response)
    
    return created
  })

// ============================================
// 4. Handle errors
// ============================================

const safeGetPost = (id: number) =>
  getPost(id).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Console.error(`Failed to fetch post ${id}: ${error}`)
        return { id, title: "Unavailable", body: "", userId: 0 }
      })
    )
  )

// ============================================
// 5. Run the program
// ============================================

const program = Effect.gen(function* () {
  yield* Console.log("=== Simple GET ===")
  const data = yield* simpleGet
  yield* Console.log(JSON.stringify(data, null, 2))

  yield* Console.log("\n=== Typed GET ===")
  const post = yield* getPost(1)
  yield* Console.log(`Post: ${post.title}`)

  yield* Console.log("\n=== POST Request ===")
  const created = yield* createPost("My New Post", "This is the body")
  yield* Console.log(`Created: ${JSON.stringify(created)}`)
})

// Provide the HTTP client implementation
program.pipe(
  Effect.provide(NodeHttpClient.layer),
  NodeRuntime.runMain
)
```

**Rationale:**

Use Effect's `HttpClient` from `@effect/platform` to make HTTP requests with built-in error handling, retries, and type safety.

---


Effect's HttpClient is better than `fetch`:

1. **Type-safe errors** - Network failures are typed, not exceptions
2. **Automatic JSON parsing** - No manual `.json()` calls
3. **Composable** - Chain requests, add retries, timeouts
4. **Testable** - Easy to mock in tests

---

---


## 🟡 Intermediate Patterns

### Retry HTTP Requests with Backoff

**Rule:** Use Schedule to retry failed HTTP requests with configurable backoff strategies.

**Good Example:**

```typescript
import { Effect, Schedule, Duration, Data } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse, HttpClientError } from "@effect/platform"

// ============================================
// 1. Basic retry with exponential backoff
// ============================================

const fetchWithRetry = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((response) => HttpClientResponse.json(response)),
      Effect.retry(
        Schedule.exponential("100 millis", 2).pipe(
          Schedule.intersect(Schedule.recurs(5)),     // Max 5 retries
          Schedule.jittered                            // Add randomness
        )
      )
    )
  })

// ============================================
// 2. Retry only specific status codes
// ============================================

class RetryableHttpError extends Data.TaggedError("RetryableHttpError")<{
  readonly status: number
  readonly message: string
}> {}

class NonRetryableHttpError extends Data.TaggedError("NonRetryableHttpError")<{
  readonly status: number
  readonly message: string
}> {}

const isRetryable = (status: number): boolean =>
  status === 429 ||    // Rate limited
  status === 503 ||    // Service unavailable
  status === 502 ||    // Bad gateway
  status === 504 ||    // Gateway timeout
  status >= 500        // Server errors

const fetchWithSelectiveRetry = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const response = yield* client.get(url).pipe(
      Effect.flatMap((response) => {
        if (response.status >= 400) {
          if (isRetryable(response.status)) {
            return Effect.fail(new RetryableHttpError({
              status: response.status,
              message: `HTTP ${response.status}`,
            }))
          }
          return Effect.fail(new NonRetryableHttpError({
            status: response.status,
            message: `HTTP ${response.status}`,
          }))
        }
        return Effect.succeed(response)
      }),
      Effect.retry({
        schedule: Schedule.exponential("200 millis").pipe(
          Schedule.intersect(Schedule.recurs(3))
        ),
        while: (error) => error._tag === "RetryableHttpError",
      })
    )

    return yield* HttpClientResponse.json(response)
  })

// ============================================
// 3. Retry with logging
// ============================================

const fetchWithRetryLogging = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.retry(
        Schedule.exponential("100 millis").pipe(
          Schedule.intersect(Schedule.recurs(3)),
          Schedule.tapOutput((_, output) =>
            Effect.log(`Retry attempt, waiting ${Duration.toMillis(output)}ms`)
          )
        )
      ),
      Effect.tapError((error) => Effect.log(`Request failed: ${error}`))
    )
  })

// ============================================
// 4. Custom retry policy
// ============================================

const customRetryPolicy = Schedule.exponential("500 millis", 2).pipe(
  Schedule.intersect(Schedule.recurs(5)),
  Schedule.union(Schedule.spaced("30 seconds")),  // Also retry after 30s
  Schedule.whileOutput((duration) => Duration.lessThanOrEqualTo(duration, "2 minutes")),
  Schedule.jittered
)

// ============================================
// 5. Retry respecting Retry-After header
// ============================================

const fetchWithRetryAfter = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const makeRequest = client.get(url).pipe(
      Effect.flatMap((response) => {
        if (response.status === 429) {
          const retryAfter = response.headers["retry-after"]
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000

          return Effect.fail({
            _tag: "RateLimited" as const,
            delay,
          })
        }
        return Effect.succeed(response)
      })
    )

    return yield* makeRequest.pipe(
      Effect.retry(
        Schedule.recurWhile<{ _tag: "RateLimited"; delay: number }>(
          (error) => error._tag === "RateLimited"
        ).pipe(
          Schedule.intersect(Schedule.recurs(3)),
          Schedule.delayed((_, error) => Duration.millis(error.delay))
        )
      ),
      Effect.flatMap((r) => HttpClientResponse.json(r))
    )
  })

// ============================================
// 6. Usage
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("Fetching with retry...")

  const data = yield* fetchWithRetry("https://api.example.com/data").pipe(
    Effect.catchAll((error) => {
      return Effect.succeed({ error: "All retries exhausted" })
    })
  )

  yield* Effect.log(`Result: ${JSON.stringify(data)}`)
})
```

**Rationale:**

Use Effect's `retry` with `Schedule` to automatically retry failed HTTP requests with exponential backoff and jitter.

---


HTTP requests fail for transient reasons:

1. **Network issues** - Temporary connectivity problems
2. **Server overload** - 503 Service Unavailable
3. **Rate limits** - 429 Too Many Requests
4. **Timeouts** - Slow responses

Proper retry logic handles these gracefully.

---

---

### Log HTTP Requests and Responses

**Rule:** Use Effect's logging to trace HTTP requests for debugging and monitoring.

**Good Example:**

```typescript
import { Effect, Duration } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"

// ============================================
// 1. Simple request/response logging
// ============================================

const withLogging = <A, E>(
  request: Effect.Effect<A, E, HttpClient.HttpClient>
): Effect.Effect<A, E, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const startTime = Date.now()
    yield* Effect.log("→ HTTP Request starting...")

    const result = yield* request

    const duration = Date.now() - startTime
    yield* Effect.log(`← HTTP Response received (${duration}ms)`)

    return result
  })

// ============================================
// 2. Detailed request logging
// ============================================

interface RequestLog {
  method: string
  url: string
  headers: Record<string, string>
  body?: unknown
}

interface ResponseLog {
  status: number
  headers: Record<string, string>
  duration: number
  size?: number
}

const makeLoggingClient = Effect.gen(function* () {
  const baseClient = yield* HttpClient.HttpClient

  const logRequest = (method: string, url: string, headers: Record<string, string>) =>
    Effect.log("HTTP Request").pipe(
      Effect.annotateLogs({
        method,
        url,
        headers: JSON.stringify(headers),
      })
    )

  const logResponse = (status: number, duration: number, headers: Record<string, string>) =>
    Effect.log("HTTP Response").pipe(
      Effect.annotateLogs({
        status: String(status),
        duration: `${duration}ms`,
        headers: JSON.stringify(headers),
      })
    )

  return {
    get: <T>(url: string, options?: { headers?: Record<string, string> }) =>
      Effect.gen(function* () {
        const headers = options?.headers ?? {}
        yield* logRequest("GET", url, headers)
        const startTime = Date.now()

        const response = yield* baseClient.get(url)

        yield* logResponse(
          response.status,
          Date.now() - startTime,
          response.headers
        )

        return yield* HttpClientResponse.json(response) as Effect.Effect<T>
      }),

    post: <T>(url: string, body: unknown, options?: { headers?: Record<string, string> }) =>
      Effect.gen(function* () {
        const headers = options?.headers ?? {}
        yield* logRequest("POST", url, headers).pipe(
          Effect.annotateLogs("body", JSON.stringify(body).slice(0, 200))
        )
        const startTime = Date.now()

        const request = yield* HttpClientRequest.post(url).pipe(
          HttpClientRequest.jsonBody(body)
        )
        const response = yield* baseClient.execute(request)

        yield* logResponse(
          response.status,
          Date.now() - startTime,
          response.headers
        )

        return yield* HttpClientResponse.json(response) as Effect.Effect<T>
      }),
  }
})

// ============================================
// 3. Log with span for timing
// ============================================

const fetchWithSpan = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.withLogSpan(`HTTP GET ${url}`)
    )
  })

// ============================================
// 4. Conditional logging (debug mode)
// ============================================

const makeConditionalLoggingClient = (debug: boolean) =>
  Effect.gen(function* () {
    const baseClient = yield* HttpClient.HttpClient

    const maybeLog = (message: string, data?: Record<string, unknown>) =>
      debug
        ? Effect.log(message).pipe(
            data ? Effect.annotateLogs(data) : (e) => e
          )
        : Effect.void

    return {
      get: <T>(url: string) =>
        Effect.gen(function* () {
          yield* maybeLog("HTTP Request", { method: "GET", url })
          const startTime = Date.now()

          const response = yield* baseClient.get(url)

          yield* maybeLog("HTTP Response", {
            status: String(response.status),
            duration: `${Date.now() - startTime}ms`,
          })

          return yield* HttpClientResponse.json(response) as Effect.Effect<T>
        }),
    }
  })

// ============================================
// 5. Request ID tracking
// ============================================

const makeTrackedClient = Effect.gen(function* () {
  const baseClient = yield* HttpClient.HttpClient

  return {
    get: <T>(url: string) =>
      Effect.gen(function* () {
        const requestId = crypto.randomUUID().slice(0, 8)

        yield* Effect.log("HTTP Request").pipe(
          Effect.annotateLogs({
            requestId,
            method: "GET",
            url,
          })
        )

        const startTime = Date.now()
        const response = yield* baseClient.get(url)

        yield* Effect.log("HTTP Response").pipe(
          Effect.annotateLogs({
            requestId,
            status: String(response.status),
            duration: `${Date.now() - startTime}ms`,
          })
        )

        return yield* HttpClientResponse.json(response) as Effect.Effect<T>
      })
  }
})

// ============================================
// 6. Error logging
// ============================================

const fetchWithErrorLogging = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((response) => {
        if (response.status >= 400) {
          return Effect.gen(function* () {
            yield* Effect.logError("HTTP Error").pipe(
              Effect.annotateLogs({
                url,
                status: String(response.status),
              })
            )
            return yield* Effect.fail(new Error(`HTTP ${response.status}`))
          })
        }
        return Effect.succeed(response)
      }),
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.tapError((error) =>
        Effect.logError("Request failed").pipe(
          Effect.annotateLogs({
            url,
            error: String(error),
          })
        )
      )
    )
  })

// ============================================
// 7. Usage
// ============================================

const program = Effect.gen(function* () {
  const client = yield* makeLoggingClient

  yield* Effect.log("Starting HTTP operations...")

  const data = yield* client.get("https://api.example.com/users")

  yield* Effect.log("Operations complete")
})
```

**Rationale:**

Wrap HTTP clients with logging middleware to capture request details, response info, and timing for debugging and observability.

---


HTTP logging helps with:

1. **Debugging** - See what's being sent/received
2. **Performance** - Track slow requests
3. **Auditing** - Record API usage
4. **Troubleshooting** - Diagnose production issues

---

---

### Cache HTTP Responses

**Rule:** Use an in-memory or persistent cache to store HTTP responses.

**Good Example:**

```typescript
import { Effect, Ref, HashMap, Option, Duration } from "effect"
import { HttpClient, HttpClientResponse } from "@effect/platform"

// ============================================
// 1. Simple in-memory cache
// ============================================

interface CacheEntry<T> {
  readonly data: T
  readonly timestamp: number
  readonly ttl: number
}

const makeCache = <T>() =>
  Effect.gen(function* () {
    const store = yield* Ref.make(HashMap.empty<string, CacheEntry<T>>())

    const get = (key: string): Effect.Effect<Option.Option<T>> =>
      Ref.get(store).pipe(
        Effect.map((map) => {
          const entry = HashMap.get(map, key)
          if (entry._tag === "None") return Option.none()

          const now = Date.now()
          if (now > entry.value.timestamp + entry.value.ttl) {
            return Option.none()  // Expired
          }
          return Option.some(entry.value.data)
        })
      )

    const set = (key: string, data: T, ttl: number): Effect.Effect<void> =>
      Ref.update(store, (map) =>
        HashMap.set(map, key, {
          data,
          timestamp: Date.now(),
          ttl,
        })
      )

    const invalidate = (key: string): Effect.Effect<void> =>
      Ref.update(store, (map) => HashMap.remove(map, key))

    const clear = (): Effect.Effect<void> =>
      Ref.set(store, HashMap.empty())

    return { get, set, invalidate, clear }
  })

// ============================================
// 2. Cached HTTP client
// ============================================

interface CachedHttpClient {
  readonly get: <T>(
    url: string,
    options?: { ttl?: Duration.DurationInput }
  ) => Effect.Effect<T, Error>
  readonly invalidate: (url: string) => Effect.Effect<void>
}

const makeCachedHttpClient = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient
  const cache = yield* makeCache<unknown>()

  const client: CachedHttpClient = {
    get: <T>(url: string, options?: { ttl?: Duration.DurationInput }) => {
      const ttl = options?.ttl ? Duration.toMillis(Duration.decode(options.ttl)) : 60000

      return Effect.gen(function* () {
        // Check cache first
        const cached = yield* cache.get(url)
        if (Option.isSome(cached)) {
          yield* Effect.log(`Cache hit: ${url}`)
          return cached.value as T
        }

        yield* Effect.log(`Cache miss: ${url}`)

        // Fetch from network
        const response = yield* httpClient.get(url)
        const data = yield* HttpClientResponse.json(response) as Effect.Effect<T>

        // Store in cache
        yield* cache.set(url, data, ttl)

        return data
      })
    },

    invalidate: (url) => cache.invalidate(url),
  }

  return client
})

// ============================================
// 3. Stale-while-revalidate pattern
// ============================================

interface SWRCache<T> {
  readonly data: T
  readonly timestamp: number
  readonly staleAfter: number
  readonly expireAfter: number
}

const makeSWRClient = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient
  const cache = yield* Ref.make(HashMap.empty<string, SWRCache<unknown>>())

  return {
    get: <T>(
      url: string,
      options: {
        staleAfter: Duration.DurationInput
        expireAfter: Duration.DurationInput
      }
    ) =>
      Effect.gen(function* () {
        const now = Date.now()
        const staleMs = Duration.toMillis(Duration.decode(options.staleAfter))
        const expireMs = Duration.toMillis(Duration.decode(options.expireAfter))

        const cached = yield* Ref.get(cache).pipe(
          Effect.map((map) => HashMap.get(map, url))
        )

        if (cached._tag === "Some") {
          const entry = cached.value
          const age = now - entry.timestamp

          if (age < staleMs) {
            // Fresh - return immediately
            return entry.data as T
          }

          if (age < expireMs) {
            // Stale - return cached, revalidate in background
            yield* Effect.fork(
              httpClient.get(url).pipe(
                Effect.flatMap((r) => HttpClientResponse.json(r)),
                Effect.flatMap((data) =>
                  Ref.update(cache, (map) =>
                    HashMap.set(map, url, {
                      data,
                      timestamp: Date.now(),
                      staleAfter: staleMs,
                      expireAfter: expireMs,
                    })
                  )
                ),
                Effect.catchAll(() => Effect.void)  // Ignore errors
              )
            )
            return entry.data as T
          }
        }

        // Expired or missing - fetch fresh
        const response = yield* httpClient.get(url)
        const data = yield* HttpClientResponse.json(response) as Effect.Effect<T>

        yield* Ref.update(cache, (map) =>
          HashMap.set(map, url, {
            data,
            timestamp: now,
            staleAfter: staleMs,
            expireAfter: expireMs,
          })
        )

        return data
      }),
  }
})

// ============================================
// 4. Cache with request deduplication
// ============================================

const makeDeduplicatedClient = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient
  const inFlight = yield* Ref.make(HashMap.empty<string, Effect.Effect<unknown>>())
  const cache = yield* makeCache<unknown>()

  return {
    get: <T>(url: string, ttl: number = 60000) =>
      Effect.gen(function* () {
        // Check cache
        const cached = yield* cache.get(url)
        if (Option.isSome(cached)) {
          return cached.value as T
        }

        // Check if request already in flight
        const pending = yield* Ref.get(inFlight).pipe(
          Effect.map((map) => HashMap.get(map, url))
        )

        if (pending._tag === "Some") {
          yield* Effect.log(`Deduplicating request: ${url}`)
          return (yield* pending.value) as T
        }

        // Make the request
        const request = httpClient.get(url).pipe(
          Effect.flatMap((r) => HttpClientResponse.json(r)),
          Effect.tap((data) => cache.set(url, data, ttl)),
          Effect.ensuring(
            Ref.update(inFlight, (map) => HashMap.remove(map, url))
          )
        )

        // Store in-flight request
        yield* Ref.update(inFlight, (map) => HashMap.set(map, url, request))

        return (yield* request) as T
      }),
  }
})

// ============================================
// 5. Usage
// ============================================

const program = Effect.gen(function* () {
  const client = yield* makeCachedHttpClient

  // First call - cache miss
  yield* client.get("https://api.example.com/users/1", { ttl: "5 minutes" })

  // Second call - cache hit
  yield* client.get("https://api.example.com/users/1")

  // Invalidate when data changes
  yield* client.invalidate("https://api.example.com/users/1")
})
```

**Rationale:**

Cache HTTP responses to reduce network calls, improve latency, and handle offline scenarios.

---


Caching provides:

1. **Performance** - Avoid redundant network calls
2. **Cost reduction** - Fewer API calls
3. **Resilience** - Serve stale data when API is down
4. **Rate limit safety** - Stay under quotas

---

---

### Add Timeouts to HTTP Requests

**Rule:** Always set timeouts on HTTP requests to ensure your application doesn't hang.

**Good Example:**

```typescript
import { Effect, Duration, Data } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"

// ============================================
// 1. Basic request timeout
// ============================================

const fetchWithTimeout = (url: string, timeout: Duration.DurationInput) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.timeout(timeout)
    )
    // Returns Option<A> - None if timed out
  })

// ============================================
// 2. Timeout with custom error
// ============================================

class RequestTimeoutError extends Data.TaggedError("RequestTimeoutError")<{
  readonly url: string
  readonly timeout: Duration.Duration
}> {}

const fetchWithTimeoutError = (url: string, timeout: Duration.DurationInput) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.timeoutFail({
        duration: timeout,
        onTimeout: () => new RequestTimeoutError({
          url,
          timeout: Duration.decode(timeout),
        }),
      })
    )
  })

// ============================================
// 3. Different timeouts for different phases
// ============================================

const fetchWithPhasedTimeouts = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    // Connection timeout (initial)
    const response = yield* client.get(url).pipe(
      Effect.timeout("5 seconds"),
      Effect.flatten,
      Effect.mapError(() => new Error("Connection timeout"))
    )

    // Read timeout (body)
    const body = yield* HttpClientResponse.text(response).pipe(
      Effect.timeout("30 seconds"),
      Effect.flatten,
      Effect.mapError(() => new Error("Read timeout"))
    )

    return body
  })

// ============================================
// 4. Timeout with fallback
// ============================================

interface ApiResponse {
  data: unknown
  cached: boolean
}

const fetchWithFallback = (url: string): Effect.Effect<ApiResponse> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.map((data) => ({ data, cached: false })),
      Effect.timeout("5 seconds"),
      Effect.flatMap((result) =>
        result._tag === "Some"
          ? Effect.succeed(result.value)
          : Effect.succeed({ data: null, cached: true })  // Fallback
      )
    )
  })

// ============================================
// 5. Timeout with interrupt
// ============================================

const fetchWithInterrupt = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.interruptible,
      Effect.timeout("10 seconds")
    )
    // Fiber is interrupted if timeout, freeing resources
  })

// ============================================
// 6. Configurable timeout wrapper
// ============================================

interface TimeoutConfig {
  readonly connect: Duration.DurationInput
  readonly read: Duration.DurationInput
  readonly total: Duration.DurationInput
}

const defaultTimeouts: TimeoutConfig = {
  connect: "5 seconds",
  read: "30 seconds",
  total: "60 seconds",
}

const createHttpClient = (config: TimeoutConfig = defaultTimeouts) =>
  Effect.gen(function* () {
    const baseClient = yield* HttpClient.HttpClient

    return {
      get: (url: string) =>
        baseClient.get(url).pipe(
          Effect.timeout(config.connect),
          Effect.flatten,
          Effect.flatMap((r) =>
            HttpClientResponse.json(r).pipe(
              Effect.timeout(config.read),
              Effect.flatten
            )
          ),
          Effect.timeout(config.total),
          Effect.flatten
        ),
    }
  })

// ============================================
// 7. Usage
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("Fetching with timeout...")

  const result = yield* fetchWithTimeoutError(
    "https://api.example.com/slow",
    "5 seconds"
  ).pipe(
    Effect.catchTag("RequestTimeoutError", (error) =>
      Effect.gen(function* () {
        yield* Effect.log(`Request to ${error.url} timed out`)
        return { error: "timeout" }
      })
    )
  )

  yield* Effect.log(`Result: ${JSON.stringify(result)}`)
})
```

**Rationale:**

Use Effect's timeout functions to set limits on HTTP request duration, with appropriate fallback handling.

---


HTTP requests can hang indefinitely:

1. **Server issues** - Unresponsive servers
2. **Network problems** - Packets lost
3. **Slow responses** - Large payloads
4. **Resource leaks** - Connections never closed

Timeouts prevent these from blocking your application.

---

---

### Model Dependencies as Services

**Rule:** Model dependencies as services.

**Good Example:**

```typescript
import { Effect } from "effect";

// Define Random service with production implementation as default
export class Random extends Effect.Service<Random>()("Random", {
  // Default production implementation
  sync: () => ({
    next: Effect.sync(() => Math.random()),
  }),
}) {}

// Example usage
const program = Effect.gen(function* () {
  const random = yield* Random;
  const value = yield* random.next;
  return value;
});

// Run with default implementation
const programWithLogging = Effect.gen(function* () {
  const value = yield* Effect.provide(program, Random.Default);
  yield* Effect.log(`Random value: ${value}`);
  return value;
});

Effect.runPromise(programWithLogging);
```

**Explanation:**  
By modeling dependencies as services, you can easily substitute mocked or deterministic implementations for testing, leading to more reliable and predictable tests.

**Anti-Pattern:**

Directly calling external APIs like `fetch` or using impure functions like `Math.random()` within your business logic. This tightly couples your logic to a specific implementation and makes it difficult to test.

**Rationale:**

Represent any external dependency or distinct capability—from a database client to a simple UUID generator—as a service.


This pattern is the key to testability. It allows you to provide a `Live` implementation in production and a `Test` implementation (returning mock data) in your tests, making your code decoupled and reliable.

---

### Create a Testable HTTP Client Service

**Rule:** Define an HttpClient service with distinct Live and Test layers to enable testable API interactions.

**Good Example:**

### 1. Define the Service

```typescript
import { Effect, Data, Layer } from "effect";

interface HttpErrorType {
  readonly _tag: "HttpError";
  readonly error: unknown;
}

const HttpError = Data.tagged<HttpErrorType>("HttpError");

interface HttpClientType {
  readonly get: <T>(url: string) => Effect.Effect<T, HttpErrorType>;
}

class HttpClient extends Effect.Service<HttpClientType>()("HttpClient", {
  sync: () => ({
    get: <T>(url: string): Effect.Effect<T, HttpErrorType> =>
      Effect.tryPromise<T>(() =>
        fetch(url).then((res) => res.json() as T)
      ).pipe(Effect.catchAll((error) => Effect.fail(HttpError({ error })))),
  }),
}) {}

// Test implementation
const TestLayer = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: <T>(_url: string) => Effect.succeed({ title: "Mock Data" } as T),
  })
);

// Example usage
const program = Effect.gen(function* () {
  const client = yield* HttpClient;
  yield* Effect.logInfo("Fetching data...");
  const data = yield* client.get<{ title: string }>(
    "https://api.example.com/data"
  );
  yield* Effect.logInfo(`Received data: ${JSON.stringify(data)}`);
});

// Run with test implementation
Effect.runPromise(Effect.provide(program, TestLayer));
```

### 2. Create the Live Implementation

```typescript
import { Effect, Data, Layer } from "effect";

interface HttpErrorType {
  readonly _tag: "HttpError";
  readonly error: unknown;
}

const HttpError = Data.tagged<HttpErrorType>("HttpError");

interface HttpClientType {
  readonly get: <T>(url: string) => Effect.Effect<T, HttpErrorType>;
}

class HttpClient extends Effect.Service<HttpClientType>()("HttpClient", {
  sync: () => ({
    get: <T>(url: string): Effect.Effect<T, HttpErrorType> =>
      Effect.tryPromise({
        try: () => fetch(url).then((res) => res.json()),
        catch: (error) => HttpError({ error }),
      }),
  }),
}) {}

// Test implementation
const TestLayer = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: <T>(_url: string) => Effect.succeed({ title: "Mock Data" } as T),
  })
);

// Example usage
const program = Effect.gen(function* () {
  const client = yield* HttpClient;
  yield* Effect.logInfo("Fetching data...");
  const data = yield* client.get<{ title: string }>(
    "https://api.example.com/data"
  );
  yield* Effect.logInfo(`Received data: ${JSON.stringify(data)}`);
});

// Run with test implementation
Effect.runPromise(Effect.provide(program, TestLayer));
```

### 3. Create the Test Implementation

```typescript
// src/services/HttpClientTest.ts
import { Effect, Layer } from "effect";
import { HttpClient } from "./HttpClient";

export const HttpClientTest = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: (url) => Effect.succeed({ mock: "data", url }),
  })
);
```

### 4. Usage in Business Logic

Your business logic is now clean and only depends on the abstract `HttpClient`.

```typescript
// src/features/User/UserService.ts
import { Effect } from "effect";
import { HttpClient } from "../../services/HttpClient";

export const getUserFromApi = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient;
    const data = yield* client.get(`https://api.example.com/users/${id}`);
    // ... logic to parse and return user
    return data;
  });
```

---

**Anti-Pattern:**

Calling `fetch` directly from within your business logic functions. This creates a hard dependency on the global `fetch` API, making the function difficult to test and reuse.

```typescript
import { Effect } from "effect";

// ❌ WRONG: This function is not easily testable.
export const getUserDirectly = (id: number) =>
  Effect.tryPromise({
    try: () =>
      fetch(`https://api.example.com/users/${id}`).then((res) => res.json()),
    catch: () => "ApiError" as const,
  });
```

**Rationale:**

To interact with external APIs, define an `HttpClient` service. Create two separate `Layer` implementations for this service:

1.  **`HttpClientLive`**: The production implementation that uses a real HTTP client (like `fetch`) to make network requests.
2.  **`HttpClientTest`**: A test implementation that returns mock data, allowing you to test your business logic without making actual network calls.

---


Directly using `fetch` in your business logic makes it nearly impossible to test. Your tests would become slow, flaky (dependent on network conditions), and could have unintended side effects.

By abstracting the HTTP client into a service, you decouple your application's logic from the specific implementation of how HTTP requests are made. Your business logic depends only on the abstract `HttpClient` interface. In production, you provide the `Live` layer. In tests, you provide the `Test` layer. This makes your tests fast, deterministic, and reliable.

---

---

### Handle Rate Limiting Responses

**Rule:** Detect 429 responses and automatically retry after the Retry-After period.

**Good Example:**

```typescript
import { Effect, Schedule, Duration, Data, Ref } from "effect"
import { HttpClient, HttpClientResponse } from "@effect/platform"

// ============================================
// 1. Rate limit error type
// ============================================

class RateLimitedError extends Data.TaggedError("RateLimitedError")<{
  readonly retryAfter: number
  readonly limit: number | undefined
  readonly remaining: number | undefined
  readonly reset: number | undefined
}> {}

// ============================================
// 2. Parse rate limit headers
// ============================================

interface RateLimitInfo {
  readonly retryAfter: number
  readonly limit?: number
  readonly remaining?: number
  readonly reset?: number
}

const parseRateLimitHeaders = (headers: Record<string, string>): RateLimitInfo => {
  // Parse Retry-After (seconds or date)
  const retryAfterHeader = headers["retry-after"]
  let retryAfter = 60  // Default 60 seconds

  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10)
    if (!isNaN(parsed)) {
      retryAfter = parsed
    } else {
      // Try parsing as date
      const date = Date.parse(retryAfterHeader)
      if (!isNaN(date)) {
        retryAfter = Math.max(0, Math.ceil((date - Date.now()) / 1000))
      }
    }
  }

  return {
    retryAfter,
    limit: headers["x-ratelimit-limit"] ? parseInt(headers["x-ratelimit-limit"], 10) : undefined,
    remaining: headers["x-ratelimit-remaining"] ? parseInt(headers["x-ratelimit-remaining"], 10) : undefined,
    reset: headers["x-ratelimit-reset"] ? parseInt(headers["x-ratelimit-reset"], 10) : undefined,
  }
}

// ============================================
// 3. HTTP client with rate limit handling
// ============================================

const makeRateLimitAwareClient = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient

  return {
    get: <T>(url: string) =>
      Effect.gen(function* () {
        const response = yield* httpClient.get(url)

        if (response.status === 429) {
          const rateLimitInfo = parseRateLimitHeaders(response.headers)

          yield* Effect.log(
            `Rate limited. Retry after ${rateLimitInfo.retryAfter}s`
          )

          return yield* Effect.fail(new RateLimitedError({
            retryAfter: rateLimitInfo.retryAfter,
            limit: rateLimitInfo.limit,
            remaining: rateLimitInfo.remaining,
            reset: rateLimitInfo.reset,
          }))
        }

        return yield* HttpClientResponse.json(response) as Effect.Effect<T>
      }).pipe(
        Effect.retry({
          schedule: Schedule.recurWhile<RateLimitedError>(
            (e) => e._tag === "RateLimitedError"
          ).pipe(
            Schedule.intersect(Schedule.recurs(3)),
            Schedule.delayed((_, error) =>
              Duration.seconds(error.retryAfter + 1)  // Add 1s buffer
            )
          ),
          while: (error) => error._tag === "RateLimitedError",
        })
      ),
  }
})

// ============================================
// 4. Proactive rate limiting (client-side)
// ============================================

interface RateLimiter {
  readonly acquire: () => Effect.Effect<void>
  readonly release: () => Effect.Effect<void>
}

const makeClientRateLimiter = (requestsPerSecond: number) =>
  Effect.gen(function* () {
    const tokens = yield* Ref.make(requestsPerSecond)
    const interval = 1000 / requestsPerSecond

    // Refill tokens periodically
    yield* Effect.fork(
      Effect.forever(
        Effect.gen(function* () {
          yield* Effect.sleep(Duration.millis(interval))
          yield* Ref.update(tokens, (n) => Math.min(n + 1, requestsPerSecond))
        })
      )
    )

    const limiter: RateLimiter = {
      acquire: () =>
        Effect.gen(function* () {
          let acquired = false
          while (!acquired) {
            const current = yield* Ref.get(tokens)
            if (current > 0) {
              yield* Ref.update(tokens, (n) => n - 1)
              acquired = true
            } else {
              yield* Effect.sleep(Duration.millis(interval))
            }
          }
        }),

      release: () => Ref.update(tokens, (n) => Math.min(n + 1, requestsPerSecond)),
    }

    return limiter
  })

// ============================================
// 5. Combined client
// ============================================

const makeRobustHttpClient = (requestsPerSecond: number) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const rateLimiter = yield* makeClientRateLimiter(requestsPerSecond)

    return {
      get: <T>(url: string) =>
        Effect.gen(function* () {
          // Wait for rate limiter token
          yield* rateLimiter.acquire()

          const response = yield* httpClient.get(url)

          if (response.status === 429) {
            const info = parseRateLimitHeaders(response.headers)
            yield* Effect.log(`Server rate limit hit, waiting ${info.retryAfter}s`)
            yield* Effect.sleep(Duration.seconds(info.retryAfter))
            return yield* Effect.fail(new Error("Rate limited"))
          }

          return yield* HttpClientResponse.json(response) as Effect.Effect<T>
        }).pipe(
          Effect.retry(
            Schedule.exponential("1 second").pipe(
              Schedule.intersect(Schedule.recurs(3))
            )
          )
        ),
    }
  })

// ============================================
// 6. Batch requests to stay under limits
// ============================================

const batchRequests = <T>(
  urls: string[],
  requestsPerSecond: number
) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const results: T[] = []
    const interval = 1000 / requestsPerSecond

    for (const url of urls) {
      const response = yield* httpClient.get(url)
      const data = yield* HttpClientResponse.json(response) as Effect.Effect<T>
      results.push(data)

      // Wait between requests
      if (urls.indexOf(url) < urls.length - 1) {
        yield* Effect.sleep(Duration.millis(interval))
      }
    }

    return results
  })

// ============================================
// 7. Usage
// ============================================

const program = Effect.gen(function* () {
  const client = yield* makeRateLimitAwareClient

  yield* Effect.log("Making rate-limited request...")

  const data = yield* client.get("https://api.example.com/data").pipe(
    Effect.catchTag("RateLimitedError", (error) =>
      Effect.gen(function* () {
        yield* Effect.log(`Gave up after rate limiting. Limit: ${error.limit}`)
        return { error: "rate_limited" }
      })
    )
  )

  yield* Effect.log(`Result: ${JSON.stringify(data)}`)
})
```

**Rationale:**

Handle HTTP 429 (Too Many Requests) responses by reading the `Retry-After` header and waiting before retrying.

---


Rate limits protect APIs:

1. **Fair usage** - Share resources among clients
2. **Stability** - Prevent overload
3. **Quotas** - Enforce billing tiers

Respecting limits prevents bans and ensures reliable access.

---

---


## 🟠 Advanced Patterns

### Build a Basic HTTP Server

**Rule:** Use a managed Runtime created from a Layer to handle requests in a Node.js HTTP server.

**Good Example:**

This example creates a simple server with a `Greeter` service. The server starts, creates a runtime containing the `Greeter`, and then uses that runtime to handle requests.

```typescript
import { HttpServer, HttpServerResponse } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Duration, Effect, Fiber, Layer } from "effect";
import { createServer } from "node:http";

// Create a server layer using Node's built-in HTTP server
const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3001 });

// Define your HTTP app (here responding "Hello World" to every request)
const app = Effect.gen(function* () {
  yield* Effect.logInfo("Received HTTP request");
  return yield* HttpServerResponse.text("Hello World");
});

const serverLayer = HttpServer.serve(app).pipe(Layer.provide(ServerLive));

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Server starting on http://localhost:3001");
  const fiber = yield* Layer.launch(serverLayer).pipe(Effect.fork);
  yield* Effect.sleep(Duration.seconds(2));
  yield* Fiber.interrupt(fiber);
  yield* Effect.logInfo("Server shutdown complete");
});

Effect.runPromise(program as unknown as Effect.Effect<void, unknown, never>);
```

---

**Anti-Pattern:**

Creating a new runtime or rebuilding layers for every single incoming request. This is extremely inefficient and defeats the purpose of Effect's `Layer` system.

```typescript
import * as http from "http";
import { Effect, Layer } from "effect";
import { GreeterLive } from "./somewhere";

// ❌ WRONG: This rebuilds the GreeterLive layer on every request.
const server = http.createServer((_req, res) => {
  const requestEffect = Effect.succeed("Hello!").pipe(
    Effect.provide(GreeterLive) // Providing the layer here is inefficient
  );
  Effect.runPromise(requestEffect).then((msg) => res.end(msg));
});
```

**Rationale:**

To build an HTTP server, create a main `AppLayer` that provides all your application's services. Compile this layer into a managed `Runtime` at startup. Use this runtime to execute an `Effect` for each incoming HTTP request, ensuring all logic is handled within the Effect system.

---


This pattern demonstrates the complete lifecycle of a long-running Effect application.

1.  **Setup Phase:** You define all your application's dependencies (database connections, clients, config) in `Layer`s and compose them into a single `AppLayer`.
2.  **Runtime Creation:** You use `Layer.toRuntime(AppLayer)` to create a highly-optimized `Runtime` object. This is done _once_ when the server starts.
3.  **Request Handling:** For each incoming request, you create an `Effect` that describes the work to be done (e.g., parse request, call services, create response).
4.  **Execution:** You use the `Runtime` you created in the setup phase to execute the request-handling `Effect` using `Runtime.runPromise`.

This architecture ensures that your request handling logic is fully testable, benefits from structured concurrency, and is completely decoupled from the server's setup and infrastructure.

---

---


