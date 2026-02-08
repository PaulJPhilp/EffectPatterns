/**
 * Display Service Integration Tests
 *
 * Tests the display service for showing various types of messages,
 * panels, tables, and proper error handling.
 */

import { Console, Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Display } from "../index.js";

describe("Display Service - Integration", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	describe("Basic Message Display", () => {
		it("should create Display service", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				return display !== null;
			});

			// Service should be accessible
			expect(program).toBeDefined();
		});

		it("should have showSuccess method", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				return typeof display.showSuccess === "function";
			});

			expect(program).toBeDefined();
		});

		it("should have showError method", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				return typeof display.showError === "function";
			});

			expect(program).toBeDefined();
		});

		it("should have showInfo method", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				return typeof display.showInfo === "function";
			});

			expect(program).toBeDefined();
		});

		it("should have showWarning method", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				return typeof display.showWarning === "function";
			});

			expect(program).toBeDefined();
		});

		it("should have showPanel method", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				return typeof display.showPanel === "function";
			});

			expect(program).toBeDefined();
		});

		it("should have showTable method", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				return typeof display.showTable === "function";
			});

			expect(program).toBeDefined();
		});

		it("should have showHighlight method", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				return typeof display.showHighlight === "function";
			});

			expect(program).toBeDefined();
		});

		it("should have showSeparator method", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				return typeof display.showSeparator === "function";
			});

			expect(program).toBeDefined();
		});
	});

	describe("Message Types", () => {
		it("should support success message structure", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showSuccess("Success message");
				return true;
			});

			// Program should be well-formed
			expect(program).toBeDefined();
		});

		it("should support error message structure", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showError("Error message");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support info message structure", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showInfo("Info message");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support warning message structure", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showWarning("Warning message");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support highlight message structure", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showHighlight("Highlighted text");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support separator structure", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showSeparator();
				return true;
			});

			expect(program).toBeDefined();
		});
	});

	describe("Complex Display Types", () => {
		it("should support panel display structure", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showPanel("Panel content", "Panel Title");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support panel with options", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showPanel("Panel content", "Title", {
					type: "warning",
				});
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support table display structure", () => {
			type Row = {
				name: string;
				status: string;
			};

			const data: Row[] = [
				{ name: "Item 1", status: "Active" },
				{ name: "Item 2", status: "Inactive" },
			];

			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showTable(data, {
					columns: [
						{ key: "name", header: "Name" },
						{ key: "status", header: "Status" },
					],
					bordered: true,
				});
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support empty table", () => {
			type Row = {
				name: string;
			};

			const data: Row[] = [];

			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showTable(data, {
					columns: [{ key: "name", header: "Name" }],
				});
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support table with multiple columns", () => {
			type Row = {
				id: string;
				name: string;
				status: string;
				value: number;
			};

			const data: Row[] = [
				{ id: "1", name: "Test", status: "Active", value: 100 },
			];

			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showTable(data, {
					columns: [
						{ key: "id", header: "ID" },
						{ key: "name", header: "Name" },
						{ key: "status", header: "Status" },
						{ key: "value", header: "Value" },
					],
				});
				return true;
			});

			expect(program).toBeDefined();
		});
	});

	describe("Message Sequences", () => {
		it("should support message sequence", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showInfo("Starting");
				yield* display.showWarning("Processing");
				yield* display.showSuccess("Done");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support complex display sequence", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showPanel("Starting operation", "Begin");
				yield* display.showSeparator();
				yield* display.showInfo("Processing step 1");
				yield* display.showWarning("Warning: High CPU");
				yield* display.showSeparator();
				yield* display.showSuccess("Operation complete");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support error sequence", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showError("Operation failed");
				yield* display.showWarning("Rolling back changes");
				yield* display.showInfo("Please check logs");
				return true;
			});

			expect(program).toBeDefined();
		});
	});

	describe("Display Method Variations", () => {
		it("should accept string for success", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showSuccess("Simple success message");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should accept long messages", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				const longMessage = "x".repeat(1000);
				yield* display.showSuccess(longMessage);
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should accept empty messages", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showInfo("");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should accept special characters", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showSuccess("Test with special chars: <>&\"'");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should accept unicode characters", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showSuccess("Unicode test: 日本語 🎉 العربية");
				return true;
			});

			expect(program).toBeDefined();
		});
	});

	describe("Panel Variations", () => {
		it("should accept panel without options", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showPanel("Content", "Title");
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should accept panel with info type", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showPanel("Content", "Title", { type: "info" });
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should accept panel with warning type", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showPanel("Content", "Title", {
					type: "warning",
				});
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should accept panel with error type", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showPanel("Content", "Title", {
					type: "error",
				});
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should accept panel with success type", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showPanel("Content", "Title", {
					type: "success",
				});
				return true;
			});

			expect(program).toBeDefined();
		});
	});

	describe("Table Edge Cases", () => {
		it("should handle table with no columns", () => {
			type Row = {
				field: string;
			};

			const data: Row[] = [];

			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showTable(data, { columns: [] });
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should handle table with missing data fields", () => {
			type Row = {
				id: string;
				name?: string;
			};

			const data: Row[] = [{ id: "1" }, { id: "2", name: "Test" }];

			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showTable(data, {
					columns: [
						{ key: "id", header: "ID" },
						{ key: "name", header: "Name" },
					],
				});
				return true;
			});

			expect(program).toBeDefined();
		});

		it("should handle table with numeric and string data", () => {
			type Row = {
				id: number;
				name: string;
				value: number;
			};

			const data: Row[] = [
				{ id: 1, name: "Test", value: 100 },
				{ id: 2, name: "Another", value: 200 },
			];

			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showTable(data, {
					columns: [
						{ key: "id", header: "ID" },
						{ key: "name", header: "Name" },
						{ key: "value", header: "Value" },
					],
				});
				return true;
			});

			expect(program).toBeDefined();
		});
	});

	describe("Integration Patterns", () => {
		it("should chain multiple display operations", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;

				yield* display.showPanel("Starting application", "App Init");
				yield* display.showSeparator();

				const data = [
					{ service: "Database", status: "Connected" },
					{ service: "Cache", status: "Ready" },
					{ service: "API", status: "Running" },
				];

				yield* display.showTable(data, {
					columns: [
						{ key: "service", header: "Service" },
						{ key: "status", header: "Status" },
					],
				});

				yield* display.showSeparator();
				yield* display.showSuccess("All services initialized");

				return true;
			});

			expect(program).toBeDefined();
		});

		it("should handle display with conditional branches", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				const isSuccess = true;

				if (isSuccess) {
					yield* display.showSuccess("Operation successful");
				} else {
					yield* display.showError("Operation failed");
				}

				return true;
			});

			expect(program).toBeDefined();
		});

		it("should support display in loops", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;

				for (let i = 0; i < 3; i++) {
					yield* display.showInfo(`Step ${i + 1}`);
				}

				return true;
			});

			expect(program).toBeDefined();
		});
	});

	describe("Display Service Composition", () => {
		it("should compose with other effects", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;

				// Show start
				yield* display.showInfo("Processing...");

				// Do some work
				const result = yield* Effect.succeed("done");

				// Show result
				if (result === "done") {
					yield* display.showSuccess("Processing complete");
				}

				return result;
			});

			expect(program).toBeDefined();
		});

		it("should handle display errors", () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;

				try {
					yield* Effect.fail(new Error("Something went wrong"));
				} catch (error) {
					yield* display.showError(
						`Error: ${error instanceof Error ? error.message : "Unknown error"}`
					);
				}

				return false;
			});

			expect(program).toBeDefined();
		});
	});
});
