/**
 * Tests for the login command and config writer.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { resolveConfigPath, writeConfig } from "../services/config/writer.js";

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
