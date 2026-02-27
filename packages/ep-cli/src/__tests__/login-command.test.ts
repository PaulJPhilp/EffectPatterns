/**
 * Tests for the login command and config writer.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { tmpdir } from "node:os";
import { resolveConfigPath, writeConfig } from "../services/config/writer.js";
import { closeServer, tryListen, waitForCallback } from "../commands/login-command.js";

describe("resolveConfigPath", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses EP_CONFIG_FILE when set", () => {
    process.env.EP_CONFIG_FILE = "/custom/path/config.json";
    expect(resolveConfigPath()).toBe("/custom/path/config.json");
  });

  it("ignores empty EP_CONFIG_FILE", () => {
    process.env.EP_CONFIG_FILE = "   ";
    const result = resolveConfigPath();
    expect(result).not.toBe("   ");
    expect(result).toContain("ep-cli");
  });

  it("uses XDG_CONFIG_HOME when set", () => {
    delete process.env.EP_CONFIG_FILE;
    process.env.XDG_CONFIG_HOME = "/xdg/config";
    expect(resolveConfigPath()).toBe("/xdg/config/ep-cli/config.json");
  });

  it("falls back to ~/.config", () => {
    delete process.env.EP_CONFIG_FILE;
    delete process.env.XDG_CONFIG_HOME;
    const result = resolveConfigPath();
    expect(result).toContain(".config");
    expect(result).toContain("ep-cli");
    expect(result).toContain("config.json");
  });
});

describe("writeConfig", () => {
  let testDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    testDir = path.join(tmpdir(), `ep-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    process.env.EP_CONFIG_FILE = path.join(testDir, "config.json");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("writes config with apiKey, email, and updatedAt", async () => {
    const configPath = await Effect.runPromise(
      writeConfig({ apiKey: "test-key-123", email: "test@example.com" })
    );

    expect(existsSync(configPath)).toBe(true);
    const content = JSON.parse(readFileSync(configPath, "utf8"));
    expect(content.apiKey).toBe("test-key-123");
    expect(content.email).toBe("test@example.com");
    expect(content.updatedAt).toBeDefined();
    expect(() => new Date(content.updatedAt)).not.toThrow();
  });

  it("creates parent directories if missing", async () => {
    const nestedPath = path.join(testDir, "nested", "dir", "config.json");
    process.env.EP_CONFIG_FILE = nestedPath;

    await Effect.runPromise(
      writeConfig({ apiKey: "key", email: "e@x.com" })
    );

    expect(existsSync(nestedPath)).toBe(true);
  });

  it("sets config file permissions to 0o600", async () => {
    const configPath = await Effect.runPromise(
      writeConfig({ apiKey: "key", email: "e@x.com" })
    );

    expect(statSync(configPath).mode & 0o777).toBe(0o600);
  });

  it("creates parent directory with restricted permissions (0o700)", async () => {
    const nestedPath = path.join(testDir, "restricted-dir", "config.json");
    process.env.EP_CONFIG_FILE = nestedPath;

    await Effect.runPromise(
      writeConfig({ apiKey: "key", email: "e@x.com" })
    );

    const dirMode = statSync(path.dirname(nestedPath)).mode & 0o777;
    expect(dirMode).toBe(0o700);
  });

  it("overwrites existing config", async () => {
    await Effect.runPromise(
      writeConfig({ apiKey: "old-key", email: "old@x.com" })
    );
    await Effect.runPromise(
      writeConfig({ apiKey: "new-key", email: "new@x.com" })
    );

    const configPath = resolveConfigPath();
    const content = JSON.parse(readFileSync(configPath, "utf8"));
    expect(content.apiKey).toBe("new-key");
    expect(content.email).toBe("new@x.com");
  });
});

describe("tryListen", () => {
  let server: http.Server;

  beforeEach(() => {
    server = http.createServer();
  });

  afterEach(async () => {
    await Effect.runPromise(closeServer(server)).catch(() => {});
  });

  it("succeeds on a free port", async () => {
    const port = await Effect.runPromise(tryListen(server, 0));
    expect(port).toBe(0);
  });

  it("fails when port is already in use", async () => {
    const blocker = http.createServer();
    // Listen on OS-assigned port first
    await new Promise<void>((resolve) => {
      blocker.listen(0, "127.0.0.1", resolve);
    });
    const usedPort = (blocker.address() as { port: number }).port;

    const result = await Effect.runPromise(
      tryListen(server, usedPort).pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");

    await new Promise<void>((resolve) => {
      blocker.close(() => resolve());
    });
  });
});

describe("waitForCallback", () => {
  let server: http.Server;
  let port: number;
  const state = "test-state-abc";

  beforeEach(async () => {
    server = http.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await Effect.runPromise(closeServer(server)).catch(() => {});
  });

  it("returns apiKey and email on valid callback", async () => {
    const resultPromise = Effect.runPromise(waitForCallback(server, port, state));

    // Send a valid callback
    await fetch(
      `http://127.0.0.1:${port}/callback?state=${state}&apiKey=key-123&email=test@example.com`
    );

    const result = await resultPromise;
    expect(result.apiKey).toBe("key-123");
    expect(result.email).toBe("test@example.com");
  });

  it("returns 404 for non-callback paths", async () => {
    // Start waiting (don't await — it blocks until callback)
    const resultPromise = Effect.runPromise(waitForCallback(server, port, state));

    const response = await fetch(`http://127.0.0.1:${port}/other`);
    expect(response.status).toBe(404);

    // Now send valid callback to unblock
    await fetch(
      `http://127.0.0.1:${port}/callback?state=${state}&apiKey=key-123&email=e@x.com`
    );
    await resultPromise;
  });

  it("returns 403 for invalid state", async () => {
    const resultPromise = Effect.runPromise(waitForCallback(server, port, state));

    const response = await fetch(
      `http://127.0.0.1:${port}/callback?state=wrong-state&apiKey=key-123`
    );
    expect(response.status).toBe(403);

    // Clean up by sending valid callback
    await fetch(
      `http://127.0.0.1:${port}/callback?state=${state}&apiKey=key-123&email=e@x.com`
    );
    await resultPromise;
  });

  it("fails when apiKey is missing", async () => {
    const resultPromise = Effect.runPromise(
      waitForCallback(server, port, state).pipe(Effect.either)
    );

    await fetch(`http://127.0.0.1:${port}/callback?state=${state}`);

    const either = await resultPromise;
    expect(either._tag).toBe("Left");
  });

  it("returns 409 on duplicate callback after resolution", async () => {
    const resultPromise = Effect.runPromise(waitForCallback(server, port, state));

    // First valid callback
    await fetch(
      `http://127.0.0.1:${port}/callback?state=${state}&apiKey=key-123&email=e@x.com`
    );
    await resultPromise;

    // Second callback should get 409
    const response = await fetch(
      `http://127.0.0.1:${port}/callback?state=${state}&apiKey=key-456&email=e2@x.com`
    );
    expect(response.status).toBe(409);
  });
});
