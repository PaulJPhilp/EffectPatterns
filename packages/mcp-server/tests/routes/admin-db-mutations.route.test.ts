import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as bulkImportPOST } from "../../app/api/bulk-import/route";
import { POST as finalResetPOST } from "../../app/api/final-reset/route";
import { POST as migratePOST } from "../../app/api/migrate/route";
import { POST as migrateFinalPOST } from "../../app/api/migrate-final/route";
import { POST as resetDbPOST } from "../../app/api/reset-db/route";
import { POST as simpleResetPOST } from "../../app/api/simple-reset/route";

function createPostRequest(
  path: string,
  options?: {
    adminKey?: string;
    body?: unknown;
  },
): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (options?.adminKey) {
    headers.set("x-admin-key", options.adminKey);
  }

  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("Admin-gated DB mutation routes", () => {
  beforeAll(() => {
    process.env.ADMIN_API_KEY = "admin-secret-key";
  });

  it("rejects unauthenticated reset and migration endpoints", async () => {
    const routes = [
      { path: "/api/reset-db", handler: resetDbPOST },
      { path: "/api/simple-reset", handler: simpleResetPOST },
      { path: "/api/final-reset", handler: finalResetPOST },
      { path: "/api/migrate", handler: migratePOST },
      { path: "/api/migrate-final", handler: migrateFinalPOST },
      { path: "/api/bulk-import", handler: bulkImportPOST, body: { patterns: [] } },
    ];

    for (const route of routes) {
      const request = createPostRequest(route.path, { body: route.body });
      const response = await route.handler(request);
      expect(response.status).toBe(403);
    }
  });

  it("rejects invalid admin key", async () => {
    const request = createPostRequest("/api/reset-db", {
      adminKey: "wrong-key",
    });
    const response = await resetDbPOST(request);
    expect(response.status).toBe(403);
  });

  it("accepts valid admin key and proceeds to business logic", async () => {
    const request = createPostRequest("/api/reset-db", {
      adminKey: "admin-secret-key",
    });
    const response = await resetDbPOST(request);

    // Route is now auth-protected; downstream may still fail without DATABASE_URL.
    expect([200, 500]).toContain(response.status);
    expect(response.status).not.toBe(403);
  });
});
