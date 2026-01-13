/**
 * MCP Service
 *
 * Service for interacting with the Effect Patterns MCP server
 * to perform remote database operations
 */

import { HttpClient } from "@effect/platform";
import { Effect } from "effect";

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
		public readonly status?: number
	) {
		super(message);
		this.name = "McpApiError";
	}
}

// Service interface
export interface McpService {
	readonly checkDatabase: () => Effect.Effect<DatabaseCheckResponse, McpConnectionError | McpApiError>;
	readonly runMigration: () => Effect.Effect<MigrationResponse, McpConnectionError | McpApiError>;
	readonly checkEnvironment: () => Effect.Effect<EnvCheckResponse, McpConnectionError | McpApiError>;
}

// Service implementation
export const McpService = Effect.Service<McpService>()("McpService", {
	effect: Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;

		// Get base URL from environment variable or use localhost default
		const baseUrl = process.env.MCP_SERVER_URL || "http://localhost:3000";

		const makeRequest = <T>(endpoint: string): Effect.Effect<T, McpConnectionError | McpApiError> =>
			Effect.gen(function* () {
				const url = `${baseUrl}${endpoint}`;
				const response = yield* httpClient.get(url).pipe(
					Effect.mapError((error) => new McpConnectionError(`Failed to connect to MCP server: ${error.message || String(error)}`))
				);

				if (response.status >= 400) {
					const text = yield* response.text.pipe(
						Effect.mapError((error) => new McpApiError(`Failed to read response: ${String(error)}`))
					);
					return yield* Effect.fail(new McpApiError(
						`MCP API error: ${response.status} ${text}`,
						response.status
					));
				}

				const json = yield* response.json.pipe(
					Effect.mapError((error) => new McpApiError(`Failed to parse response: ${String(error)}`))
				);
				return json as T;
			});

		return {
			checkDatabase: () => makeRequest<DatabaseCheckResponse>("/api/db-check"),
			runMigration: () => makeRequest<MigrationResponse>("/api/migrate"),
			checkEnvironment: () => makeRequest<EnvCheckResponse>("/api/env-check"),
		};
	})
});
