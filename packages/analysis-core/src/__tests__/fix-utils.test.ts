import { describe, expect, it } from "vitest";
import {
	filterFixesBySafety,
	findingsWithSafeFixes,
	pickDefaultFix,
} from "../services/fix-utils";
import type { ApplicableFix, CodeFinding } from "../services/code-analyzer";

const safeFix: ApplicableFix = {
	id: "replace-context-tag",
	title: "Replace Context.Tag with Effect.Service",
	safety: "safe",
	kind: "codemod",
};
const reviewFix: ApplicableFix = {
	id: "wrap-with-acquire-release",
	title: "Wrap with acquire-release",
	safety: "review",
	kind: "assisted",
};
const riskyFix: ApplicableFix = {
	id: "move-resource-to-app-layer",
	title: "Move resource to app layer",
	safety: "risky",
	kind: "manual",
};

function finding(applicableFixes: ApplicableFix[]): CodeFinding {
	return {
		id: "f1",
		ruleId: "context-tag-anti-pattern",
		title: "Use Effect.Service",
		message: "Use Effect.Service instead of Context.Tag",
		severity: "high",
		level: "error",
		range: { startLine: 1, startCol: 1, endLine: 1, endCol: 1 },
		refactoringIds: applicableFixes.map((f) => f.id),
		applicableFixes,
	};
}

describe("fix-utils", () => {
	it("filterFixesBySafety returns only allowed safety levels", () => {
		const fixes = [safeFix, reviewFix, riskyFix];
		expect(filterFixesBySafety(fixes, ["safe"])).toEqual([safeFix]);
		expect(filterFixesBySafety(fixes, ["safe", "review"])).toEqual([
			safeFix,
			reviewFix,
		]);
		expect(filterFixesBySafety(fixes, ["risky"])).toEqual([riskyFix]);
	});

	it("findingsWithSafeFixes returns only findings that have at least one safe fix", () => {
		const findings = [
			finding([safeFix]),
			finding([reviewFix]),
			finding([safeFix, reviewFix]),
			finding([riskyFix]),
		];
		const withSafe = findingsWithSafeFixes(findings);
		expect(withSafe).toHaveLength(2);
		expect(withSafe.map((f) => f.id)).toEqual(["f1", "f1"]);
	});

	it("pickDefaultFix prefers safe over review over risky", () => {
		expect(pickDefaultFix(finding([safeFix]))).toEqual(safeFix);
		expect(pickDefaultFix(finding([reviewFix, safeFix]))).toEqual(safeFix);
		expect(pickDefaultFix(finding([riskyFix, reviewFix]))).toEqual(reviewFix);
		expect(pickDefaultFix(finding([riskyFix]))).toEqual(riskyFix);
	});

	it("pickDefaultFix returns undefined when no fixes", () => {
		expect(pickDefaultFix(finding([]))).toBeUndefined();
	});
});
