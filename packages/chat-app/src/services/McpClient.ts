import { Effect, Layer, Context } from "effect"
import type { PatternSummary } from "@effect-patterns/toolkit"

/**
 * Configuration for the MCP Client
 */
export class McpConfig extends Context.Tag("McpConfig")<
  McpConfig,
  {
    readonly baseUrl: string
    readonly apiKey: string
  }
>() {}

/**
 * MCP Client service for communicating with the MCP Server
 */
export class McpClient extends Context.Tag("McpClient")<
  McpClient,
  {
    /**
     * Search for patterns using the MCP Server API
     */
    readonly searchPatterns: (
      query: string
    ) => Effect.Effect<PatternSummary[], Error>

    /**
     * Get a specific pattern by ID
     */
    readonly getPattern: (id: string) => Effect.Effect<PatternSummary, Error>

    /**
     * Explain a pattern with additional context
     */
    readonly explainPattern: (
      patternId: string,
      context?: string
    ) => Effect.Effect<{ explanation: string }, Error>

    /**
     * Generate a code snippet for a pattern
     */
    readonly generateSnippet: (
      patternId: string,
      customName?: string,
      customInput?: string
    ) => Effect.Effect<{ snippet: string }, Error>
  }
>() {}

/**
 * Live implementation of MCP Client
 */
export const McpClientLive = Layer.effect(
  McpClient,
  Effect.gen(function* () {
    const config = yield* McpConfig

    const fetchWithAuth = (url: string, options: RequestInit = {}) =>
      Effect.tryPromise({
        try: () =>
          fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              "x-api-key": config.apiKey,
              "Content-Type": "application/json",
            },
          }),
        catch: (error) =>
          new Error(`Network error: ${error instanceof Error ? error.message : String(error)}`),
      })

    const parseJson = <T>(response: Response) =>
      Effect.tryPromise({
        try: () => response.json() as Promise<T>,
        catch: (error) =>
          new Error(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`),
      })

    return McpClient.of({
      searchPatterns: (query: string) =>
        Effect.gen(function* () {
          const url = `${config.baseUrl}/api/patterns/search?q=${encodeURIComponent(query)}`
          const response = yield* fetchWithAuth(url)

          if (!response.ok) {
            return yield* Effect.fail(
              new Error(`Search failed: ${response.statusText}`)
            )
          }

          const data = yield* parseJson<{ patterns: PatternSummary[] }>(
            response
          )
          return data.patterns || []
        }),

      getPattern: (id: string) =>
        Effect.gen(function* () {
          const url = `${config.baseUrl}/api/patterns/${id}`
          const response = yield* fetchWithAuth(url)

          if (!response.ok) {
            return yield* Effect.fail(
              new Error(`Get pattern failed: ${response.statusText}`)
            )
          }

          return yield* parseJson<PatternSummary>(response)
        }),

      explainPattern: (patternId: string, context?: string) =>
        Effect.gen(function* () {
          const url = `${config.baseUrl}/api/patterns/explain`
          const response = yield* fetchWithAuth(url, {
            method: "POST",
            body: JSON.stringify({ patternId, context }),
          })

          if (!response.ok) {
            return yield* Effect.fail(
              new Error(`Explain pattern failed: ${response.statusText}`)
            )
          }

          return yield* parseJson<{ explanation: string }>(response)
        }),

      generateSnippet: (
        patternId: string,
        customName?: string,
        customInput?: string
      ) =>
        Effect.gen(function* () {
          const url = `${config.baseUrl}/api/patterns/generate`
          const response = yield* fetchWithAuth(url, {
            method: "POST",
            body: JSON.stringify({ patternId, customName, customInput }),
          })

          if (!response.ok) {
            return yield* Effect.fail(
              new Error(`Generate snippet failed: ${response.statusText}`)
            )
          }

          return yield* parseJson<{ snippet: string }>(response)
        }),
    })
  })
)

/**
 * Create an MCP Config layer from environment variables
 */
export const McpConfigLive = Layer.succeed(
  McpConfig,
  McpConfig.of({
    baseUrl:
      import.meta.env.VITE_MCP_BASE_URL || "http://localhost:3000",
    apiKey: import.meta.env.VITE_PATTERN_API_KEY || "",
  })
)

/**
 * Complete layer with config and client
 */
export const McpClientLayer = McpClientLive.pipe(Layer.provide(McpConfigLive))
