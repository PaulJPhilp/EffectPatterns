/**
 * Ingest Service Helper tests
 */

import { describe, expect, it } from "vitest";
import {
    createProcessResult,
    extractTypeScriptCode,
    filterMdxFiles,
    generatePatternId,
    generatePatternPaths,
    hasTypeScriptCode,
    parseFrontmatter,
    validateContentStructure,
    validateFrontmatter
} from "../helpers.js";

describe("Ingest Helpers", () => {
	describe("Frontmatter Parsing", () => {
		it("should parse valid frontmatter", () => {
			const content = "---\nid: test\ntitle: Test\n---\nBody content";
			const { frontmatter, body } = parseFrontmatter(content);
			expect(frontmatter.id).toBe("test");
			expect(frontmatter.title).toBe("Test");
			expect(body.trim()).toBe("Body content");
		});

		it("should handle content without frontmatter", () => {
			const content = "Just body content";
			const { frontmatter, body } = parseFrontmatter(content);
			expect(frontmatter).toEqual({});
			expect(body).toBe("Just body content");
		});

		it("should handle malformed YAML", () => {
			const content = "---\n[\n---\nBody";
			const { frontmatter } = parseFrontmatter(content);
			expect(frontmatter).toEqual({});
		});
	});

	describe("Validation", () => {
		it("should validate complete frontmatter", () => {
			const fm = { id: "1", title: "T", skillLevel: "B", useCase: "U", summary: "S" };
			const { valid, missing } = validateFrontmatter(fm);
			expect(valid).toBe(true);
			expect(missing).toHaveLength(0);
		});

		it("should identify missing frontmatter fields", () => {
			const fm = { id: "1", title: "T" };
			const { valid, missing } = validateFrontmatter(fm);
			expect(valid).toBe(false);
			expect(missing).toContain("skillLevel");
		});

		it("should validate content structure", () => {
			const content = "## Good Example\n## Anti-Pattern";
			const { valid, missing } = validateContentStructure(content);
			expect(valid).toBe(true);
			expect(missing).toHaveLength(0);
		});

		it("should identify missing sections", () => {
			const content = "## Good Example";
			const { valid, missing } = validateContentStructure(content);
			expect(valid).toBe(false);
			expect(missing).toContain("Anti-Pattern");
		});
	});

	describe("TypeScript Extraction", () => {
		it("should extract code from Good Example", () => {
			const content = "## Good Example\n```typescript\nconst x = 1;\n```";
			const code = extractTypeScriptCode(content);
			expect(code).toBe("const x = 1;");
		});

		it("should return null if no code found", () => {
			const content = "## Good Example\nNo code here";
			expect(extractTypeScriptCode(content)).toBeNull();
		});

		it("should detect presence of TypeScript code", () => {
			expect(hasTypeScriptCode("```typescript\ncode\n```")).toBe(true);
			expect(hasTypeScriptCode("No code")).toBe(false);
		});
	});

	describe("ID and Path Generation", () => {
		it("should generate pattern ID", () => {
			expect(generatePatternId("file.mdx", { id: "custom" })).toBe("custom");
			expect(generatePatternId("file.mdx", {})).toBe("file");
		});

		it("should generate pattern paths", () => {
			const config = { srcDir: "src", processedDir: "proc" } as any;
			const paths = generatePatternPaths("test", config);
			expect(paths.srcPath).toBe("src/test.ts");
			expect(paths.processedPath).toBe("proc/test.mdx");
		});
	});

	describe("Utilities", () => {
		it("should filter MDX files", () => {
			const files = ["a.mdx", "b.ts", "c.mdx"];
			expect(filterMdxFiles(files)).toEqual(["a.mdx", "c.mdx"]);
		});

		it("should create process result", () => {
			const result = createProcessResult("file.mdx", true, "test");
			expect(result.file).toBe("file.mdx");
			expect(result.success).toBe(true);
			expect(result.id).toBe("test");
		});
	});
});
