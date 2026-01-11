/**
 * Ingest Service Helpers Tests
 */

import { describe, expect, it } from "vitest";
import {
	REQUIRED_CONTENT_SECTIONS,
	REQUIRED_FRONTMATTER_FIELDS,
	createPatternFromFile,
	createProcessResult,
	extractTypeScriptCode,
	filterMdxFiles,
	generatePatternId,
	generatePatternPaths,
	hasTypeScriptCode,
	parseFrontmatter,
	readMdxFile,
	validateContentStructure,
	validateFrontmatter,
	writeTypeScriptFile,
} from "../helpers.js";
import type { IngestConfig } from "../types.js";

describe("Ingest Service Helpers", () => {
	describe("Constants", () => {
		it("should have required frontmatter fields", () => {
			expect(REQUIRED_FRONTMATTER_FIELDS).toEqual([
				"id",
				"title",
				"skillLevel",
				"useCase",
				"summary",
			]);
		});

		it("should have required content sections", () => {
			expect(REQUIRED_CONTENT_SECTIONS).toEqual([
				"Good Example",
				"Anti-Pattern",
			]);
		});
	});

	describe("Frontmatter Parsing", () => {
		it("should parse valid frontmatter", () => {
			const content = `---
title: Test Pattern
skillLevel: beginner
---
# Content here`;

			const result = parseFrontmatter(content);

			expect(result.frontmatter).toEqual({
				title: "Test Pattern",
				skillLevel: "beginner",
			});
			expect(result.body).toBe("# Content here");
		});

		it("should handle missing frontmatter", () => {
			const content = "# No frontmatter here";

			const result = parseFrontmatter(content);

			expect(result.frontmatter).toEqual({});
			expect(result.body).toBe(content);
		});

		it("should handle invalid YAML", () => {
			const content = `---
invalid: yaml: content: here
---
# Content`;

			const result = parseFrontmatter(content);

			expect(result.frontmatter).toEqual({});
			expect(result.body).toBe(content);
		});
	});

	describe("Frontmatter Validation", () => {
		it("should validate complete frontmatter", () => {
			const frontmatter = {
				id: "test",
				title: "Test",
				skillLevel: "beginner",
				useCase: "testing",
				summary: "A test pattern",
			};

			const result = validateFrontmatter(frontmatter);

			expect(result.valid).toBe(true);
			expect(result.missing).toEqual([]);
		});

		it("should detect missing required fields", () => {
			const frontmatter = {
				title: "Test",
				skillLevel: "beginner",
			};

			const result = validateFrontmatter(frontmatter);

			expect(result.valid).toBe(false);
			expect(result.missing).toEqual(["id", "useCase", "summary"]);
		});
	});

	describe("Content Structure Validation", () => {
		it("should validate complete content", () => {
			const content = `
# Pattern

## Good Example

\`\`\`typescript
const x = 1;
\`\`\`

## Anti-Pattern

Don't do this.
			`;

			const result = validateContentStructure(content);

			expect(result.valid).toBe(true);
			expect(result.missing).toEqual([]);
		});

		it("should detect missing sections", () => {
			const content = `
# Pattern

## Some Other Section
			`;

			const result = validateContentStructure(content);

			expect(result.valid).toBe(false);
			expect(result.missing).toEqual(["Good Example", "Anti-Pattern"]);
		});
	});

	describe("TypeScript Code Extraction", () => {
		it("should extract TypeScript code", () => {
			const content = `
## Good Example

\`\`\`typescript
const example = "test";
console.log(example);
\`\`\`
			`;

			const result = extractTypeScriptCode(content);

			expect(result).toBe('const example = "test";\nconsole.log(example);');
		});

		it("should return null if no code found", () => {
			const content = `
## Good Example

No code block here.
			`;

			const result = extractTypeScriptCode(content);

			expect(result).toBeNull();
		});

		it("should detect TypeScript code presence", () => {
			const content = `
## Good Example

\`\`\`typescript
const x = 1;
\`\`\`
			`;

			expect(hasTypeScriptCode(content)).toBe(true);
		});

		it("should detect absence of TypeScript code", () => {
			const content = `
## Good Example

No code here.
			`;

			expect(hasTypeScriptCode(content)).toBe(false);
		});
	});

	describe("Pattern ID Generation", () => {
		it("should use frontmatter ID when available", () => {
			const frontmatter = { id: "custom-id" };
			const fileName = "pattern.mdx";

			const result = generatePatternId(fileName, frontmatter);

			expect(result).toBe("custom-id");
		});

		it("should use filename when no frontmatter ID", () => {
			const frontmatter = {};
			const fileName = "test-pattern.mdx";

			const result = generatePatternId(fileName, frontmatter);

			expect(result).toBe("test-pattern");
		});
	});

	describe("Pattern Path Generation", () => {
		it("should generate correct paths", () => {
			const id = "test-pattern";
			const config = {
				srcDir: "/src",
				processedDir: "/processed",
				rawDir: "/raw",
				publishedDir: "/published",
				targetPublishedDir: "/target-published",
				reportDir: "/reports",
			} as IngestConfig;

			const result = generatePatternPaths(id, config);

			expect(result).toEqual({
				srcPath: "/src/test-pattern.ts",
				processedPath: "/processed/test-pattern.mdx",
			});
		});
	});

	describe("File Operations", () => {
		it("should create process result", () => {
			const result = createProcessResult("test.mdx", true, "test-id");

			expect(result).toEqual({
				file: "test.mdx",
				success: true,
				id: "test-id",
			});
		});

		it("should filter MDX files", () => {
			const files = ["pattern.mdx", "readme.md", "test.ts", "another.mdx"];
			const filtered = filterMdxFiles(files);

			expect(filtered).toEqual(["pattern.mdx", "another.mdx"]);
		});

		it("should create pattern from file", () => {
			const frontmatter = { title: "Test", skillLevel: "beginner" };
			const config = {
				srcDir: "/src",
				processedDir: "/processed",
				rawDir: "/raw",
				publishedDir: "/published",
				targetPublishedDir: "/target-published",
				reportDir: "/reports",
			} as IngestConfig;

			const pattern = createPatternFromFile("test.mdx", config, frontmatter);

			expect(pattern).toEqual({
				id: "test",
				title: "Test",
				rawPath: "/raw/test.mdx",
				srcPath: "/src/test.ts",
				processedPath: "/processed/test.mdx",
				frontmatter,
				hasTypeScript: false,
			});
		});
	});

	describe("Effect Structure Tests", () => {
		it("should create read MDX file effect", () => {
			const program = readMdxFile("/test/file.mdx");

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should create write TypeScript file effect", () => {
			const program = writeTypeScriptFile("/test/file.ts", "code");

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});
	});
});
