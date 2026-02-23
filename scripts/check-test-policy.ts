/**
 * Test policy checker — ensures no behavioral mocks in test files.
 *
 * Scans for forbidden patterns: vi.mock, vi.spyOn, vi.fn, .toHaveBeenCalled,
 * .mockImplementation, .mockReturnValue, .mockResolvedValue, .mockRejectedValue
 *
 * Usage: bun run test:policy
 *
 * Structural exceptions can be documented with:
 *   // test-policy-ignore: <reason>        (per-line, on line above violation)
 *   // test-policy-ignore-file: <reason>   (file-level, in first 10 lines)
 */

import { globSync } from "glob";
import { readFileSync } from "node:fs";
import path from "node:path";

const FORBIDDEN_PATTERNS = [
	{ pattern: /\bvi\.mock\s*\(/, label: "vi.mock()" },
	{ pattern: /\bvi\.spyOn\s*\(/, label: "vi.spyOn()" },
	{ pattern: /\bvi\.fn\s*\(/, label: "vi.fn()" },
	{ pattern: /\.toHaveBeenCalled/, label: ".toHaveBeenCalled*()" },
	{ pattern: /\.mockImplementation\s*\(/, label: ".mockImplementation()" },
	{ pattern: /\.mockReturnValue\s*\(/, label: ".mockReturnValue()" },
	{ pattern: /\.mockResolvedValue\s*\(/, label: ".mockResolvedValue()" },
	{ pattern: /\.mockRejectedValue\s*\(/, label: ".mockRejectedValue()" },
] as const;

const IGNORE_COMMENT = "test-policy-ignore:";
const FILE_IGNORE_COMMENT = "test-policy-ignore-file:";

interface Violation {
	readonly file: string;
	readonly line: number;
	readonly column: number;
	readonly pattern: string;
	readonly text: string;
}

const checkFile = (filePath: string): Violation[] => {
	const content = readFileSync(filePath, "utf8");
	const lines = content.split("\n");

	// Check for file-level ignore (must appear in first 10 lines)
	const headerLines = lines.slice(0, 10).join("\n");
	if (headerLines.includes(FILE_IGNORE_COMMENT)) {
		return [];
	}

	const violations: Violation[] = [];

	for (const [index, line] of lines.entries()) {
		// Check if previous line has an ignore comment
		const prevLine = index > 0 ? lines[index - 1] : "";
		if (prevLine && prevLine.includes(IGNORE_COMMENT)) {
			continue;
		}

		for (const { pattern, label } of FORBIDDEN_PATTERNS) {
			const match = pattern.exec(line);
			if (match) {
				violations.push({
					file: filePath,
					line: index + 1,
					column: (match.index ?? 0) + 1,
					pattern: label,
					text: line.trim(),
				});
			}
		}
	}

	return violations;
};

const main = () => {
	const testFiles = globSync("packages/{ep-cli,ep-admin,toolkit}/{src,test}/**/*.test.ts", {
		cwd: path.resolve(import.meta.dirname, ".."),
		absolute: true,
		ignore: ["**/node_modules/**", "**/dist/**"],
	});

	let totalViolations = 0;
	const fileViolations: Array<{ file: string; violations: Violation[] }> = [];

	for (const file of testFiles) {
		const violations = checkFile(file);
		if (violations.length > 0) {
			totalViolations += violations.length;
			const relPath = path.relative(process.cwd(), file);
			fileViolations.push({ file: relPath, violations });
		}
	}

	if (totalViolations === 0) {
		console.log("✓ Test policy check passed — no forbidden mock patterns found.");
		process.exit(0);
	}

	console.error(`\n✗ Test policy check failed — ${totalViolations} violation(s) found:\n`);

	for (const { file, violations } of fileViolations) {
		console.error(`  ${file}:`);
		for (const v of violations) {
			console.error(`    line ${v.line}:${v.column}  ${v.pattern}`);
			console.error(`      ${v.text}`);
		}
		console.error();
	}

	console.error(
		`Add "// ${IGNORE_COMMENT} <reason>" on the line above to create a per-line exception.`
	);
	console.error(
		`Add "// ${FILE_IGNORE_COMMENT} <reason>" in the first 10 lines to exempt the entire file.\n`
	);

	process.exit(1);
};

main();
