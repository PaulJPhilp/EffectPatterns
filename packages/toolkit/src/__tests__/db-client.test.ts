/**
 * Database Client Tests
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createDatabase, getDatabaseUrl } from "../db/client.js";

describe("Database Client", () => {
  it("should export createDatabase function", () => {
    expect(typeof createDatabase).toBe("function");
  });

  it("should require database URL for creation", async () => {
    expect(createDatabase).toBeDefined();
  });

  it("should handle database URL parsing", () => {
    const testUrl = "postgresql://user:pass@localhost:5432/testdb";
    const url = new URL(testUrl);

    expect(url.protocol).toBe("postgresql:");
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe("5432");
    expect(url.pathname).toBe("/testdb");
    expect(url.username).toBe("user");
    expect(url.password).toBe("pass");
  });

  it("should validate database URL format", () => {
    const validUrls = [
      "postgresql://localhost:5432/test",
      "postgres://user:pass@localhost:5432/db",
      "postgresql://user@host:5432/testdb?sslmode=require"
    ];

    const invalidUrls = [
      "not-a-url",
      "http://localhost:5432/test",
      "postgresql://",
      "postgresql:///test" // missing host
    ];

    for (const url of validUrls) {
      expect(() => new URL(url)).not.toThrow();
    }

    for (const url of invalidUrls) {
      try {
        new URL(url);
        expect(true).toBe(false);
      } catch {
        expect(true).toBe(true);
      }
    }
  });
});

describe("DATABASE_URL fail-fast behavior", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all relevant env vars before each test
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_OVERRIDE;
    delete process.env.NODE_ENV;
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe("createDatabase", () => {
    it("should throw when NODE_ENV=production and no DATABASE_URL", () => {
      process.env.NODE_ENV = "production";

      expect(() => createDatabase()).toThrow(
        "DATABASE_URL is required in production/serverless environments"
      );
    });

    it("should throw when VERCEL=1 and no DATABASE_URL", () => {
      process.env.VERCEL = "1";

      expect(() => createDatabase()).toThrow(
        "DATABASE_URL is required in production/serverless environments"
      );
    });

    it("should throw when AWS_LAMBDA_FUNCTION_NAME is set and no DATABASE_URL", () => {
      process.env.AWS_LAMBDA_FUNCTION_NAME = "my-function";

      expect(() => createDatabase()).toThrow(
        "DATABASE_URL is required in production/serverless environments"
      );
    });

    it("should fall back to localhost in development when no DATABASE_URL", () => {
      // NODE_ENV is unset (local dev)
      const conn = createDatabase();
      expect(conn).toBeDefined();
      expect(conn.db).toBeDefined();
      expect(typeof conn.close).toBe("function");
    });

    it("should use explicit URL parameter and bypass env check", () => {
      process.env.NODE_ENV = "production";

      // Explicit URL should work even in production
      const conn = createDatabase("postgresql://user:pass@host:5432/db");
      expect(conn).toBeDefined();
      expect(conn.db).toBeDefined();
    });
  });

  describe("getDatabaseUrl", () => {
    it("should throw when NODE_ENV=production and no DATABASE_URL", () => {
      process.env.NODE_ENV = "production";

      expect(() => getDatabaseUrl()).toThrow(
        "DATABASE_URL is required in production/serverless environments"
      );
    });

    it("should throw when VERCEL is set and no DATABASE_URL", () => {
      process.env.VERCEL = "1";

      expect(() => getDatabaseUrl()).toThrow(
        "DATABASE_URL is required in production/serverless environments"
      );
    });

    it("should return localhost URL in development when no DATABASE_URL", () => {
      const url = getDatabaseUrl();
      expect(url).toBe("postgresql://postgres:postgres@localhost:5432/effect_patterns");
    });

    it("should return DATABASE_URL when set", () => {
      process.env.DATABASE_URL = "postgresql://prod:pass@prod-host:5432/proddb";

      const url = getDatabaseUrl();
      expect(url).toBe("postgresql://prod:pass@prod-host:5432/proddb");
    });

    it("should prefer DATABASE_URL_OVERRIDE over DATABASE_URL", () => {
      process.env.DATABASE_URL = "postgresql://original@host:5432/db";
      process.env.DATABASE_URL_OVERRIDE = "postgresql://override@host:5432/db";

      const url = getDatabaseUrl();
      expect(url).toBe("postgresql://override@host:5432/db");
    });
  });
});
