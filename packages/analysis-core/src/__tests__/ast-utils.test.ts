import ts from "typescript";
import { describe, expect, it } from "vitest";

import { ASTUtils } from "../tools/ast-utils";

describe("ASTUtils", () => {
	it("createSourceFile creates TS SourceFile", () => {
		const sf = ASTUtils.createSourceFile("a.ts", "const x = 1;\n");
		expect(sf.kind).toBe(ts.SyntaxKind.SourceFile);
	});

	it("isMethodCall detects Effect.map call", () => {
		const sf = ASTUtils.createSourceFile(
			"a.ts",
			"import { Effect } from \"effect\";\nEffect.map(1, (n) => n);\n"
		);

		let found = false;
		const visit = (node: ts.Node): void => {
			if (ASTUtils.isMethodCall(node, "Effect", "map")) {
				found = true;
				return;
			}
			ts.forEachChild(node, visit);
		};
		visit(sf);

		expect(found).toBe(true);
	});

	it("isFunctionCall detects direct function call", () => {
		const sf = ASTUtils.createSourceFile("a.ts", "filterOrFail(x);\n");

		let found = false;
		const visit = (node: ts.Node): void => {
			if (ASTUtils.isFunctionCall(node, "filterOrFail")) {
				found = true;
				return;
			}
			ts.forEachChild(node, visit);
		};
		visit(sf);

		expect(found).toBe(true);
	});

	it("hasImport detects module specifier", () => {
		const sf = ASTUtils.createSourceFile(
			"a.ts",
			"import { Effect } from \"effect\";\n"
		);
		expect(ASTUtils.hasImport(sf, "effect")).toBe(true);
		expect(ASTUtils.hasImport(sf, "node:fs")).toBe(false);
	});
});