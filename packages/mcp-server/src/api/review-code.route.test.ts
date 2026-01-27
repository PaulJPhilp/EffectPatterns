import { describe, expect, it } from "vitest";

describe("POST /api/review-code", () => {
	const API_KEY = process.env.PATTERN_API_KEY || "test-key";
	const BASE_URL = "http://localhost:3000";

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
		traceId: string;
		timestamp: string;
		error?: string;
	}

	it("should return top 3 recommendations for code with issues", async () => {
		const response = await fetch(`${BASE_URL}/api/review-code`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": API_KEY,
			},
			body: JSON.stringify({
				code: `
const x: any = 1;
const y: any = 2;
const z: any = 3;
const a: any = 4;
				`.trim(),
				filePath: "test.ts",
			}),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as ReviewCodeResponse;

		expect(data.recommendations).toBeDefined();
		expect(data.recommendations.length).toBeLessThanOrEqual(3);
		expect(data.meta).toBeDefined();
		expect(data.meta.totalFound).toBeGreaterThanOrEqual(3);
		expect(data.markdown).toContain("# Code Review Results");
		expect(data.traceId).toBeDefined();
		expect(data.timestamp).toBeDefined();
	});

	it("should include upgrade message when more than 3 issues found", async () => {
		const response = await fetch(`${BASE_URL}/api/review-code`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": API_KEY,
			},
			body: JSON.stringify({
				code: `
const a: any = 1;
const b: any = 2;
const c: any = 3;
const d: any = 4;
const e: any = 5;
				`.trim(),
				filePath: "test.ts",
			}),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as ReviewCodeResponse;

		expect(data.meta.hiddenCount).toBeGreaterThan(0);
		expect(data.meta.upgradeMessage).toContain("Upgrade to Pro");
	});

	it("should reject files larger than 100KB", async () => {
		const largeCode = "x".repeat(101 * 1024);

		const response = await fetch(`${BASE_URL}/api/review-code`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": API_KEY,
			},
			body: JSON.stringify({
				code: largeCode,
				filePath: "test.ts",
			}),
		});

		expect(response.status).toBe(413);
		const data = (await response.json()) as ReviewCodeResponse;
		expect(data.error).toContain("exceeds maximum");
	});

	it("should reject non-TypeScript files", async () => {
		const response = await fetch(`${BASE_URL}/api/review-code`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": API_KEY,
			},
			body: JSON.stringify({
				code: "const x = 1;",
				filePath: "test.js",
			}),
		});

		expect(response.status).toBe(400);
		const data = (await response.json()) as ReviewCodeResponse;
		expect(data.error).toContain("not a TypeScript file");
	});

	it("should require authentication", async () => {
		const response = await fetch(`${BASE_URL}/api/review-code`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				code: "const x = 1;",
				filePath: "test.ts",
			}),
		});

		expect(response.status).toBe(401);
	});

	it("should accept .tsx files", async () => {
		const response = await fetch(`${BASE_URL}/api/review-code`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": API_KEY,
			},
			body: JSON.stringify({
				code: 'import { Effect } from "effect";\nexport const x = Effect.succeed(1);',
				filePath: "test.tsx",
			}),
		});

		expect(response.status).toBe(200);
	});

	it("should return Markdown formatted output", async () => {
		const response = await fetch(`${BASE_URL}/api/review-code`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": API_KEY,
			},
			body: JSON.stringify({
				code: "const x: any = 1;",
				filePath: "test.ts",
			}),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as ReviewCodeResponse;

		expect(data.markdown).toContain("# Code Review Results");
		expect(data.markdown).toMatch(/🔴|🟡|🔵/);
		expect(data.markdown).toContain("_Lines");
	});
});
