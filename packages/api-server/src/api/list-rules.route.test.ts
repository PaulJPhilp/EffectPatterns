import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as postListFixes } from "../../app/api/list-fixes/route";
import { POST as postListRules } from "../../app/api/list-rules/route";

const makeRequest = (
	headers?: Record<string, string>,
	body?: unknown
): NextRequest => {
	const req = new Request("http://localhost/api/test", {
		method: "POST",
		headers: body
			? { "content-type": "application/json", ...headers }
			: headers,
		body: body ? JSON.stringify(body) : undefined,
	});
	return new NextRequest(req);
};

describe("/api/list-rules and /api/list-fixes", () => {
	it("returns 401 when API key is missing", async () => {
		const prevKey = process.env.PATTERN_API_KEY;

		process.env.PATTERN_API_KEY = "secret";

		try {
			const res = await postListRules(makeRequest());
			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body).toHaveProperty("error");
		} finally {
			process.env.PATTERN_API_KEY = prevKey;
		}
	});

	it("returns 200 and rules shape when API key is valid", async () => {
		const prevKey = process.env.PATTERN_API_KEY;

		process.env.PATTERN_API_KEY = "secret";

		try {
			const res = await postListRules(
				makeRequest({ "x-api-key": "secret" })
			);
			expect(res.status).toBe(200);
			const json = await res.json() as { data: { rules: Array<{ id: string }> }, traceId?: string, timestamp: string };
			const body = json.data;
			expect(Array.isArray(body.rules)).toBe(true);
			expect(body.rules.map((r) => r.id)).toContain(
				"async-await"
			);
			expect(typeof json.timestamp).toBe("string");
		} finally {
			process.env.PATTERN_API_KEY = prevKey;
		}
	});

	it("returns 200 and fixes shape when API key is valid", async () => {
		const prevKey = process.env.PATTERN_API_KEY;

		process.env.PATTERN_API_KEY = "secret";

		try {
			const res = await postListFixes(
				makeRequest({ "x-api-key": "secret" })
			);
			expect(res.status).toBe(200);
			const body = await res.json() as { fixes: Array<{ id: string }> };
			expect(Array.isArray(body.fixes)).toBe(true);
			expect(body.fixes.map((f) => f.id)).toContain(
				"replace-node-fs"
			);
		} finally {
			process.env.PATTERN_API_KEY = prevKey;
		}
	});

	it("accepts optional config body to disable rules", async () => {
		const prevKey = process.env.PATTERN_API_KEY;

		process.env.PATTERN_API_KEY = "secret";

		try {
			const res = await postListRules(
				makeRequest(
					{ "x-api-key": "secret" },
					{ config: { rules: { "async-await": "off" } } }
				)
			);
			expect(res.status).toBe(200);
			const json = await res.json() as { data: { rules: Array<{ id: string }> } };
			const body = json.data;
			expect(Array.isArray(body.rules)).toBe(true);
			expect(body.rules.map((r) => r.id)).not.toContain(
				"async-await"
			);
		} finally {
			process.env.PATTERN_API_KEY = prevKey;
		}
	});
});
