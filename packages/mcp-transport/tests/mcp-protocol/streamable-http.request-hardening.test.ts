import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "child_process";
import { setTimeout as delay } from "timers/promises";
import { createServer as createNetServer } from "net";

const TEST_API_KEY = "streamable-request-hardening-test-key";
const TEST_MAX_BODY_BYTES = 512;
const STARTUP_TIMEOUT_MS = 15_000;

let serverProcess: ReturnType<typeof spawn> | null = null;
let serverUrl = "";
let stderrBuffer = "";

async function getFreePort(): Promise<number> {
    return await new Promise((resolve, reject) => {
        const server = createNetServer();
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                reject(new Error("Failed to allocate free port for test server."));
                return;
            }
            const { port } = address;
            server.close((closeError) => {
                if (closeError) {
                    reject(closeError);
                    return;
                }
                resolve(port);
            });
        });
    });
}

async function waitForServerReady(): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < STARTUP_TIMEOUT_MS) {
        if (!serverProcess) {
            throw new Error("MCP server process was not started.");
        }
        if (serverProcess.exitCode !== null) {
            throw new Error(
                `MCP server exited during startup with code ${serverProcess.exitCode}. stderr:\n${stderrBuffer}`,
            );
        }

        try {
            const response = await fetch(`${serverUrl}/info`, {
                signal: AbortSignal.timeout(500),
            });
            if (response.ok) {
                return;
            }
        } catch {
            // Keep polling until timeout.
        }

        await delay(100);
    }

    throw new Error(
        `Timed out waiting for MCP streamable server startup. stderr:\n${stderrBuffer}`,
    );
}

async function stopServer(): Promise<void> {
    if (!serverProcess) {
        return;
    }

    const processToStop = serverProcess;
    serverProcess = null;

    if (processToStop.exitCode !== null) {
        return;
    }

    await new Promise<void>((resolve) => {
        const killTimer = setTimeout(() => {
            processToStop.kill("SIGKILL");
            resolve();
        }, 3_000);

        processToStop.once("exit", () => {
            clearTimeout(killTimer);
            resolve();
        });

        processToStop.kill("SIGTERM");
    });
}

describe("Streamable HTTP request hardening", () => {
    beforeAll(async () => {
        const port = await getFreePort();
        serverUrl = `http://127.0.0.1:${port}`;

        const processInstance = spawn("bun", ["src/mcp-streamable-http.ts"], {
            cwd: process.cwd(),
            stdio: ["ignore", "pipe", "pipe"],
            env: {
                ...process.env,
                PORT: String(port),
                MCP_SERVER_PUBLIC_URL: serverUrl,
                PATTERN_API_KEY: TEST_API_KEY,
                EFFECT_PATTERNS_API_URL: "http://127.0.0.1:65535",
                MCP_POST_BODY_MAX_BYTES: String(TEST_MAX_BODY_BYTES),
                MCP_POST_BODY_TIMEOUT_MS: "1000",
                MCP_DEBUG: "false",
            },
        });
        serverProcess = processInstance;

        stderrBuffer = "";
        processInstance.stderr.on("data", (chunk) => {
            stderrBuffer += chunk.toString();
        });

        await waitForServerReady();
    });

    afterAll(async () => {
        await stopServer();
    });

    it("returns 413 for oversized /mcp POST body", async () => {
        const oversizedPayload = JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {
                pad: "x".repeat(TEST_MAX_BODY_BYTES * 4),
            },
        });

        const response = await fetch(`${serverUrl}/mcp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": TEST_API_KEY,
            },
            body: oversizedPayload,
        });

        expect(response.status).toBe(413);
        const body = (await response.json()) as {
            jsonrpc?: string;
            error?: { code?: number; message?: string };
        };
        expect(body.jsonrpc).toBe("2.0");
        expect(body.error?.message).toMatch(/too large/i);
    });

    it("returns 400 for malformed /mcp POST JSON payload", async () => {
        const response = await fetch(`${serverUrl}/mcp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": TEST_API_KEY,
            },
            body: '{"jsonrpc":"2.0","id":1,"method":"tools/list",}',
        });

        expect(response.status).toBe(400);
        const body = (await response.json()) as {
            jsonrpc?: string;
            error?: { code?: number; message?: string };
        };
        expect(body.jsonrpc).toBe("2.0");
        expect(body.error?.code).toBe(-32700);
        expect(body.error?.message).toMatch(/malformed json/i);
    });
});
