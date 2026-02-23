/**
 * Minimal HTTP fixture server for testing PatternApi service.
 *
 * Starts a real HTTP server with configurable route handlers.
 * No vi.mock or vi.spyOn — tests hit real fetch against real HTTP.
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";

export interface FixtureRoute {
	readonly method?: string;
	readonly path: string;
	readonly status: number;
	readonly body: unknown;
	readonly headers?: Record<string, string>;
}

export interface FixtureServer {
	readonly url: string;
	readonly port: number;
	readonly close: () => Promise<void>;
	/** Access received requests for assertion */
	readonly requests: Array<{
		readonly method: string;
		readonly url: string;
		readonly headers: Record<string, string | string[] | undefined>;
	}>;
}

/**
 * Start a fixture HTTP server with predefined routes.
 */
export const startFixtureServer = (routes: readonly FixtureRoute[]): Promise<FixtureServer> =>
	new Promise((resolve, reject) => {
		const requests: FixtureServer["requests"] = [];

		const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
			const url = req.url ?? "/";
			const method = req.method ?? "GET";

			requests.push({
				method,
				url,
				headers: req.headers as Record<string, string | string[] | undefined>,
			});

			// Match route by path prefix (ignoring query string for matching)
			const urlPath = url.split("?")[0];
			const route = routes.find(
				(r) =>
					(r.method === undefined || r.method === method) &&
					(urlPath === r.path || url.startsWith(r.path))
			);

			if (!route) {
				res.writeHead(404, { "content-type": "application/json" });
				res.end(JSON.stringify({ error: "Not found" }));
				return;
			}

			const headers: Record<string, string> = {
				"content-type": "application/json",
				...route.headers,
			};

			res.writeHead(route.status, headers);
			res.end(typeof route.body === "string" ? route.body : JSON.stringify(route.body));
		});

		server.listen(0, "127.0.0.1", () => {
			const addr = server.address();
			if (!addr || typeof addr === "string") {
				reject(new Error("Failed to get server address"));
				return;
			}

			resolve({
				url: `http://127.0.0.1:${addr.port}`,
				port: addr.port,
				requests,
				close: () =>
					new Promise<void>((res, rej) => {
						server.close((err) => (err ? rej(err) : res()));
					}),
			});
		});

		server.on("error", reject);
	});
