import type { ApplicableFix, CodeFinding, FixSafety } from "./code-analyzer";

/**
 * Returns only fixes with given safety levels.
 */
export function filterFixesBySafety(
	fixes: readonly ApplicableFix[],
	allowed: readonly FixSafety[]
): ApplicableFix[] {
	return fixes.filter((f) => allowed.includes(f.safety));
}

/**
 * Returns findings that have at least one safe autofix.
 */
export function findingsWithSafeFixes(
	findings: readonly CodeFinding[]
): CodeFinding[] {
	return findings.filter((f) =>
		f.applicableFixes.some((fix) => fix.safety === "safe")
	);
}

const safetyOrder: Record<FixSafety, number> = {
	safe: 0,
	review: 1,
	risky: 2,
};

/**
 * Picks the "best" fix for a finding: prefers safe codemod, then review, then risky.
 * Returns undefined if no fixes available.
 */
export function pickDefaultFix(
	finding: CodeFinding
): ApplicableFix | undefined {
	const sorted = [...finding.applicableFixes].sort(
		(a, b) => safetyOrder[a.safety] - safetyOrder[b.safety]
	);
	return sorted[0];
}
