import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as postAnalyzeCode } from "../../app/api/analyze-code/route";

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

describe("/api/analyze-code", () => {
	it("returns 200 and supports analysisType + config", async () => {
		const prevKey = process.env.PATTERN_API_KEY;
		process.env.PATTERN_API_KEY = "secret";

		try {
			const res = await postAnalyzeCode(
				makeRequest(
					{ "x-api-key": "secret" },
					{
						filename: "src/foo.ts",
						source:
							"import { Effect } from \"effect\";\n" +
							"const foo = async () => Effect.succeed(1);\n" +
							"try { console.log(1) } catch (e) { return 1 }\n" +
							"import fs from \"node:fs\";\n",
						analysisType: "patterns",
						config: {
							rules: {
								"async-await": "off",
							},
						},
					}
				)
			);

			expect(res.status).toBe(200);
			const body = await res.json() as { suggestions: Array<{ id: string }> };

			// patterns analysisType excludes async/errors categories but includes
			// resources/style/DI.
			const ids = body.suggestions.map((s) => s.id);
			expect(ids).not.toContain("async-await");
			expect(ids).not.toContain("try-catch-in-effect");
			expect(ids).toContain("node-fs");
		} finally {
			process.env.PATTERN_API_KEY = prevKey;
		}
	});
});
