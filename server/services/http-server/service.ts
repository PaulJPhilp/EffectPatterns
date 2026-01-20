/**
 * HTTP Server service implementation
 */

import { HttpServer, HttpServerResponse } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { createServer } from "node:http";
import { HttpServerError, HttpServerStopError } from "./errors.js";
import { ServerConfig } from "./types.js";

/**
 * HTTP Server service using Effect.Service pattern
 */
export class HttpServerService extends Effect.Service<HttpServerService>()(
    "HttpServerService",
    {
        effect: Effect.gen(function* () {
            let server: any = null;

            const start = (config: ServerConfig) =>
                Effect.gen(function* () {
                    if (server) {
                        return yield* Effect.fail(
                            new HttpServerError({ cause: "Server is already running" }),
                        );
                    }

                    const serverLayer = NodeHttpServer.layer(() => createServer(), {
                        port: config.port,
                    });

                    // Simple server without router for now
                    const httpApp = Layer.launch(
                        HttpServer.serve(
                            HttpServerResponse.text("OK", { status: 200 }),
                        ).pipe(Layer.provide(serverLayer)),
                    );

                    server = yield* Effect.scoped(httpApp);
                    yield* Effect.logInfo(
                        `🚀 HTTP Server started on http://${config.host}:${config.port}`,
                    );
                });

            const stop = () =>
                Effect.gen(function* () {
                    if (!server) {
                        return yield* Effect.fail(
                            new HttpServerStopError({ cause: "Server is not running" }),
                        );
                    }

                    // In a real implementation, we would gracefully stop the server
                    yield* Effect.logInfo("🛑 HTTP Server stopped");
                    server = null;
                });

            const createResponse = (
                statusCode: number,
                headers?: Record<string, string>,
            ) =>
                HttpServerResponse.json(
                    {},
                    {
                        status: statusCode,
                        headers: headers || {},
                    },
                );

            const addSecurityHeaders = (
                response: HttpServerResponse.HttpServerResponse,
            ) =>
                response.pipe(
                    HttpServerResponse.setHeader("X-Content-Type-Options", "nosniff"),
                    HttpServerResponse.setHeader("X-Frame-Options", "DENY"),
                    HttpServerResponse.setHeader("X-XSS-Protection", "1; mode=block"),
                    HttpServerResponse.setHeader(
                        "Referrer-Policy",
                        "strict-origin-when-cross-origin",
                    ),
                    HttpServerResponse.setHeader(
                        "Permissions-Policy",
                        "geolocation=(), microphone=(), camera=()",
                    ),
                );

            return {
                start,
                stop,
                createResponse,
                addSecurityHeaders,
            };
        }),
    },
) { }
