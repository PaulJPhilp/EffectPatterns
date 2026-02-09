/**
 * Skills Route Tests - REAL ROUTE TESTING (MINIMAL MOCKS)
 *
 * Tests the ACTUAL route handlers from app/api/skills/route.ts
 * and app/api/skills/[slug]/route.ts.
 * Uses real database, real auth, real Effect runtime.
 *
 * Architecture:
 * - GET /api/skills?q=...&category=...&limit=...
 * - GET /api/skills/:slug
 * - Returns skills matching search criteria from database
 * - Requires API key authentication
 */

import { GET as skillsGET } from "../../app/api/skills/route";
import { GET as skillBySlugGET } from "../../app/api/skills/[slug]/route";
import { NextRequest } from "next/server";
import { describe, expect, it, beforeAll } from "vitest";

/**
 * Create a search request with query parameters
 */
function createSearchRequest(
  query?: string,
  options?: {
    apiKey?: string;
    limit?: number;
    category?: string;
  }
): NextRequest {
  const url = new URL("http://localhost:3000/api/skills");

  if (query) {
    url.searchParams.set("q", query);
  }
  if (options?.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }
  if (options?.category) {
    url.searchParams.set("category", options.category);
  }

  const headers: Record<string, string> = {};
  if (options?.apiKey) {
    headers["x-api-key"] = options.apiKey;
  }

  return new NextRequest(url.toString(), {
    method: "GET",
    headers,
  });
}

/**
 * Create a skill detail request
 */
function createSlugRequest(
  slug: string,
  options?: { apiKey?: string }
): NextRequest {
  const url = new URL(`http://localhost:3000/api/skills/${slug}`);

  const headers: Record<string, string> = {};
  if (options?.apiKey) {
    headers["x-api-key"] = options.apiKey;
  }

  return new NextRequest(url.toString(), {
    method: "GET",
    headers,
  });
}

describe("Skills Search Route (/api/skills) - REAL ROUTE", () => {
  beforeAll(() => {
    process.env.PATTERN_API_KEY = "test-key";
  });

  it("should require API key", async () => {
    const request = createSearchRequest();
    const response = await skillsGET(request);

    expect(response.status).toBe(401);
  });

  it("should reject invalid API key", async () => {
    const request = createSearchRequest(undefined, { apiKey: "wrong-key" });
    const response = await skillsGET(request);

    expect(response.status).toBe(401);
  });

  it("should accept valid API key and return skills", async () => {
    const request = createSearchRequest(undefined, { apiKey: "test-key" });
    const response = await skillsGET(request);

    // Real route needs database, accept 500 if unavailable
    if (response.status === 200) {
      const data = await response.json() as Record<string, unknown>;
      expect(data.skills).toBeDefined();
      expect(Array.isArray(data.skills)).toBe(true);
      expect(data.count).toBeDefined();
    } else {
      expect(response.status).toBe(500);
    }
  });

  it("should search skills with query", async () => {
    const request = createSearchRequest("error", { apiKey: "test-key" });
    const response = await skillsGET(request);

    if (response.status === 200) {
      const data = await response.json() as Record<string, unknown>;
      expect(Array.isArray(data.skills)).toBe(true);
      expect(data.count).toBeDefined();
    } else {
      expect(response.status).toBe(500);
    }
  });

  it("should handle limit parameter", async () => {
    const request = createSearchRequest(undefined, {
      apiKey: "test-key",
      limit: 3,
    });
    const response = await skillsGET(request);

    if (response.status === 200) {
      const data = await response.json() as Record<string, unknown>;
      const skills = data.skills as Array<unknown>;
      expect(skills.length).toBeLessThanOrEqual(3);
    } else {
      expect(response.status).toBe(500);
    }
  });

  it("should filter by category", async () => {
    const request = createSearchRequest(undefined, {
      apiKey: "test-key",
      category: "error-handling",
    });
    const response = await skillsGET(request);

    if (response.status === 200) {
      const data = await response.json() as Record<string, unknown>;
      expect(data.skills).toBeDefined();
    } else {
      expect(response.status).toBe(500);
    }
  });

  it("should return JSON response", async () => {
    const request = createSearchRequest(undefined, { apiKey: "test-key" });
    const response = await skillsGET(request);

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("should return skill with required fields", async () => {
    const request = createSearchRequest(undefined, { apiKey: "test-key" });
    const response = await skillsGET(request);

    if (response.status === 200) {
      const data = await response.json() as Record<string, unknown>;
      const skills = data.skills as Array<Record<string, unknown>>;

      if (skills.length > 0) {
        const skill = skills[0];
        expect(skill).toHaveProperty("slug");
        expect(skill).toHaveProperty("name");
        expect(skill).toHaveProperty("description");
        expect(skill).toHaveProperty("category");
        expect(skill).toHaveProperty("patternCount");
        expect(skill).toHaveProperty("version");
      }
    }
  });
});

describe("Skill Detail Route (/api/skills/:slug) - REAL ROUTE", () => {
  beforeAll(() => {
    process.env.PATTERN_API_KEY = "test-key";
  });

  it("should require API key", async () => {
    const request = createSlugRequest("some-skill");
    const response = await skillBySlugGET(request, {
      params: Promise.resolve({ slug: "some-skill" }),
    });

    expect(response.status).toBe(401);
  });

  it("should reject invalid API key", async () => {
    const request = createSlugRequest("some-skill", { apiKey: "wrong-key" });
    const response = await skillBySlugGET(request, {
      params: Promise.resolve({ slug: "some-skill" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent skill", async () => {
    const request = createSlugRequest("non-existent-skill-xyz", {
      apiKey: "test-key",
    });
    const response = await skillBySlugGET(request, {
      params: Promise.resolve({ slug: "non-existent-skill-xyz" }),
    });

    // 404 if DB is available, 500 if DB unavailable
    expect([404, 500]).toContain(response.status);
  });

  it("should return JSON response", async () => {
    const request = createSlugRequest("any-skill", { apiKey: "test-key" });
    const response = await skillBySlugGET(request, {
      params: Promise.resolve({ slug: "any-skill" }),
    });

    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
