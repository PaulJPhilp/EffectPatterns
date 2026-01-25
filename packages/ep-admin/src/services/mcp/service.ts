/**
 * MCP Service
 *
 * Service for interacting with the Effect Patterns MCP server
 * to perform remote database operations.
 *
 * All requests are wrapped with retry/backoff logic to handle transient failures.
 */

import { HttpBody, HttpClient, HttpClientRequest } from "@effect/platform";
import { Config, Effect } from "effect";
import { withRetry } from "../retry/index.js";

// Types for MCP API responses
interface DatabaseCheckResponse {
	success: boolean;
	message?: string;
	testResult?: unknown;
	error?: string;
	details?: string;
}

interface MigrationResponse {
	success: boolean;
	message?: string;
	tablesCreated?: number;
	error?: string;
	details?: string;
}

interface EnvCheckResponse {
	success: boolean;
	databaseUrl?: boolean;
	otherVars?: Record<string, boolean>;
	error?: string;
}

interface ListRulesResponse {
	rules: ReadonlyArray<unknown>;
	traceId: string;
	timestamp: string;
}

interface ListFixesResponse {
	fixes: ReadonlyArray<unknown>;
	traceId: string;
	timestamp: string;
}

// Error types
export class McpConnectionError extends Error {
	readonly _tag = "McpConnectionError";
	constructor(message: string) {
		super(message);
		this.name = "McpConnectionError";
	}
}

export class McpApiError extends Error {
	readonly _tag = "McpApiError";
	constructor(
		message: string,
		public readonly status?: number,
	) {
		super(message);
		this.name = "McpApiError";
	}
}

// Service interface
export interface McpService {
	readonly checkDatabase: () => Effect.Effect<
		DatabaseCheckResponse,
		McpConnectionError | McpApiError
	>;
	readonly runMigration: () => Effect.Effect<
		MigrationResponse,
		McpConnectionError | McpApiError
	>;
	readonly checkEnvironment: () => Effect.Effect<
		EnvCheckResponse,
		McpConnectionError | McpApiError
	>;
	readonly listRules: () => Effect.Effect<
		ListRulesResponse,
		McpConnectionError | McpApiError
	>;
	readonly listFixes: () => Effect.Effect<
		ListFixesResponse,
		McpConnectionError | McpApiError
	>;
}

// Service implementation
export const McpService = Effect.Service<McpService>()("McpService", {
	effect: Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;

		// Get configuration using Effect.Config
		const baseUrl = yield* Config.string("MCP_SERVER_URL").pipe(
			Config.withDefault("http://localhost:3000"),
		);
		const apiKey = yield* Config.string("MCP_API_KEY").pipe(
			Config.withDefault(""),
		);

		const makeGetRequest = <T>(
			endpoint: string,
		): Effect.Effect<T, McpConnectionError | McpApiError> =>
			withRetry(
				Effect.gen(function* () {
					const url = `${baseUrl}${endpoint}`;
					const response = yield* httpClient.get(url).pipe(
						Effect.mapError(
							(error) =>
								new McpConnectionError(
									`Failed to connect to MCP server: ${error.message || String(error)}`,
								),
						),
					);

					if (response.status >= 400) {
						const text = yield* response.text.pipe(
							Effect.mapError(
								(error) =>
									new McpApiError(`Failed to read response: ${String(error)}`),
							),
						);
						const error = new McpApiError(
							`MCP API error: ${response.status} ${text}`,
							response.status,
						);
						// Attach status code for retry logic
						Object.defineProperty(error, "status", {
							value: response.status,
							enumerable: true,
						});
						return yield* Effect.fail(error);
					}

					const json = yield* response.json.pipe(
						Effect.mapError(
							(error) =>
								new McpApiError(`Failed to parse response: ${String(error)}`),
						),
					);
					return json as T;
				}),
				{ maxRetries: 3, initialDelayMs: 100, verbose: false },
			);

		const makeAuthedPostRequest = <T>(
			endpoint: string,
			body: unknown,
		): Effect.Effect<T, McpConnectionError | McpApiError> =>
			withRetry(
				Effect.gen(function* () {
					if (!apiKey) {
						return yield* Effect.fail(
							new McpApiError(
								"Missing MCP_API_KEY for authenticated MCP endpoint",
							),
						);
					}

					const url = `${baseUrl}${endpoint}`;
					const request = HttpClientRequest.post(url, {
						body: HttpBody.unsafeJson(body),
					}).pipe(HttpClientRequest.setHeader("x-api-key", apiKey));
					const response = yield* httpClient.execute(request).pipe(
						Effect.mapError(
							(error) =>
								new McpConnectionError(
									`Failed to connect to MCP server: ${error.message || String(error)}`,
								),
						),
					);

					if (response.status >= 400) {
						const text = yield* response.text.pipe(
							Effect.mapError(
								(error) =>
									new McpApiError(`Failed to read response: ${String(error)}`),
							),
						);
						const error = new McpApiError(
							`MCP API error: ${response.status} ${text}`,
							response.status,
						);
						// Attach status code for retry logic
						Object.defineProperty(error, "status", {
							value: response.status,
							enumerable: true,
						});
						return yield* Effect.fail(error);
					}

					const json = yield* response.json.pipe(
						Effect.mapError(
							(error) =>
								new McpApiError(`Failed to parse response: ${String(error)}`),
						),
					);
					return json as T;
				}),
				{ maxRetries: 3, initialDelayMs: 100, verbose: false },
			);

		return {
			checkDatabase: () =>
				makeGetRequest<DatabaseCheckResponse>("/api/db-check"),
			runMigration: () => makeGetRequest<MigrationResponse>("/api/migrate"),
			checkEnvironment: () => makeGetRequest<EnvCheckResponse>("/api/env-check"),
			listRules: () =>
				makeAuthedPostRequest<ListRulesResponse>("/api/list-rules", {}),
			listFixes: () =>
				makeAuthedPostRequest<ListFixesResponse>("/api/list-fixes", {}),
		};
	}),
});
