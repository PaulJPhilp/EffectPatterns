import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as envCheckGET } from "../../app/api/env-check/route";
import { GET as testRouteGET } from "../../app/api/test/route";

function createGetRequest(
  options?: {
    adminKey?: string;
    queryAdminKey?: string;
  },
): NextRequest {
  const headers = new Headers();
  if (options?.adminKey) {
    headers.set("x-admin-key", options.adminKey);
  }

  const url = new URL("http://localhost:3000/api/test");
  if (options?.queryAdminKey) {
    url.searchParams.set("admin-key", options.queryAdminKey);
  }

  return new NextRequest(url.toString(), { method: "GET", headers });
}

describe("Admin test route (/api/test)", () => {
  beforeAll(() => {
    process.env.ADMIN_API_KEY = "admin-secret-key";
  });

  it("rejects missing admin key", async () => {
    const response = await testRouteGET(createGetRequest());
    expect(response.status).toBe(403);
  });

  it("rejects query-parameter admin key", async () => {
    const response = await testRouteGET(
      createGetRequest({ queryAdminKey: "admin-secret-key" }),
    );
    expect(response.status).toBe(403);
  });

  it("accepts header admin key", async () => {
    const response = await testRouteGET(
      createGetRequest({ adminKey: "admin-secret-key" }),
    );

    // Auth should pass; downstream may still fail if DATABASE_URL is absent.
    expect([200, 500]).toContain(response.status);
    expect(response.status).not.toBe(403);
  });
});

describe("Admin env-check route (/api/env-check)", () => {
  beforeAll(() => {
    process.env.ADMIN_API_KEY = "admin-secret-key";
  });

  it("rejects missing admin key", async () => {
    const response = await envCheckGET(createGetRequest());
    expect(response.status).toBe(403);
  });

  it("rejects query-parameter admin key", async () => {
    const response = await envCheckGET(
      createGetRequest({ queryAdminKey: "admin-secret-key" }),
    );
    expect(response.status).toBe(403);
  });

  it("accepts header admin key", async () => {
    const response = await envCheckGET(
      createGetRequest({ adminKey: "admin-secret-key" }),
    );
    expect(response.status).toBe(200);
  });
});
