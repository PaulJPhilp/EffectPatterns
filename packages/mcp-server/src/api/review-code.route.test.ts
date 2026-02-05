import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as postReviewCode } from "../../app/api/review-code/route";

const makeRequest = (headers?: Record<string, string>, body?: unknown) => {
	const req = new Request("http://localhost/api/test", {
		method: "POST",
		headers: body
			? { "content-type": "application/json", ...headers }
			: headers,
		body: body ? JSON.stringify(body) : undefined,
	});
	return new NextRequest(req);
};

describe("POST /api/review-code", () => {
	// Use test-key for deterministic auth (accepted when NODE_ENV=test or MCP_ENV=local)
	const API_KEY = "test-key";
	const prevApiKey = process.env.PATTERN_API_KEY;
	beforeAll(() => {
		process.env.PATTERN_API_KEY = API_KEY;
	});
	afterAll(() => {
		if (prevApiKey !== undefined) process.env.PATTERN_API_KEY = prevApiKey;
		else delete process.env.PATTERN_API_KEY;
	});

	interface ReviewCodeResponse {
		recommendations: Array<{
			id: string;
			severity: string;
			message: string;
		}>;
		meta: {
			totalFound: number;
			hiddenCount?: number;
			upgradeMessage?: string;
		};
		markdown: string;
	}

	it("should return top 3 recommendations for code with issues", async () => {
		const response = await postReviewCode(
			makeRequest(
				{ "x-api-key": API_KEY },
				{
					code: `
const x: any = 1;
const y: any = 2;
const z: any = 3;
const a: any = 4;
					`.trim(),
					filePath: "test.ts",
				}
			)
		);

		expect(response.status).toBe(200);
		const json = (await response.json()) as { data: ReviewCodeResponse, traceId?: string, timestamp: string };
		const data = json.data;

		expect(data.recommendations).toBeDefined();
		expect(data.recommendations.length).toBeLessThanOrEqual(3);
		expect(data.meta).toBeDefined();
		expect(data.meta.totalFound).toBeGreaterThanOrEqual(3);
		expect(data.markdown).toContain("# Code Review Results");
		expect(json.timestamp).toBeDefined();
	});

	it("should include upgrade message when more than 3 issues found", async () => {
		const response = await postReviewCode(
			makeRequest(
				{ "x-api-key": API_KEY },
				{
					code: `
const a: any = 1;
const b: any = 2;
const c: any = 3;
const d: any = 4;
const e: any = 5;
					`.trim(),
					filePath: "test.ts",
				}
			)
		);

		expect(response.status).toBe(200);
		const json = (await response.json()) as { data: ReviewCodeResponse };
		const data = json.data;

		expect(data.meta.hiddenCount).toBeGreaterThan(0);
		expect(data.meta.upgradeMessage).toContain("Use the HTTP API or CLI");
	});

	it("should reject files larger than 100KB", async () => {
		const largeCode = "x".repeat(101 * 1024);

		const response = await postReviewCode(
			makeRequest(
				{ "x-api-key": API_KEY },
				{
					code: largeCode,
					filePath: "test.ts",
				}
			)
		);

		expect(response.status).toBe(413);
		const data = (await response.json()) as { error: string };
		expect(data.error).toContain("exceeds maximum");
	});

	it("should reject non-TypeScript files", async () => {
		const response = await postReviewCode(
			makeRequest(
				{ "x-api-key": API_KEY },
				{
					code: "const x = 1;",
					filePath: "test.js",
				}
			)
		);

		expect(response.status).toBe(400);
		const data = (await response.json()) as { error: string };
		expect(data.error).toContain("not a TypeScript file");
	});

	it("should require authentication", async () => {
		const response = await postReviewCode(
			makeRequest(
				{},
				{
					code: "const x = 1;",
					filePath: "test.ts",
				}
			)
		);

		expect(response.status).toBe(401);
	});

	it("should accept .tsx files", async () => {
		const response = await postReviewCode(
			makeRequest(
				{ "x-api-key": API_KEY },
				{
					code: 'import { Effect } from "effect";\nexport const x = Effect.succeed(1);',
					filePath: "test.tsx",
				}
			)
		);

		expect(response.status).toBe(200);
	});

	it("should return Markdown formatted output", async () => {
		const response = await postReviewCode(
			makeRequest(
				{ "x-api-key": API_KEY },
				{
					code: "const x: any = 1;",
					filePath: "test.ts",
				}
			)
		);

		expect(response.status).toBe(200);
		const json = (await response.json()) as { data: ReviewCodeResponse };
		const data = json.data;

		expect(data.markdown).toContain("# Code Review Results");
		expect(data.markdown).toMatch(/🔴|🟡|🔵/);
		expect(data.markdown).toContain("_Lines");
	});
});
