/**
 * ValidationService Integration Tests
 *
 * Tests the pre-validation service for command arguments with
 * file validation, directory validation, range checking, and error accumulation.
 */

import { FileSystem } from "@effect/platform";
import { layer as NodeFileSystemLayer } from "@effect/platform-node/NodeFileSystem";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	runValidations,
	ValidationService,
	type ValidationResult,
} from "../index.js";
import {
	ArgumentValidationError,
	OptionValidationError,
} from "../../../errors.js";

describe("ValidationService - Integration", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "ep-admin-validation-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("File Validation", () => {
		it("should validate existing file", async () => {
			const testFile = join(tempDir, "test.txt");
			await writeFile(testFile, "content");

			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFileExists(testFile, "testFile");
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(
					Effect.provide(
						Layer.mergeAll(
							ValidationService.Default,
							NodeFileSystemLayer
						)
					)
				)
			);

			expect(result).toBe("success");
		});

		it("should fail for non-existent file", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFileExists(
					"/nonexistent/file.txt",
					"testFile"
				);
			});

			await expect(
				Effect.runPromise(
					program.pipe(
						Effect.provide(
							Layer.mergeAll(
								ValidationService.Default,
								NodeFileSystemLayer
							)
						)
					)
				)
			).rejects.toThrow();
		});

		it("should throw ArgumentValidationError with correct message", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFileExists("/nonexistent/file.txt", "myFile");
			});

			try {
				await Effect.runPromise(
					program.pipe(
						Effect.provide(
							Layer.mergeAll(
								ValidationService.Default,
								NodeFileSystemLayer
							)
						)
					)
				);
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(String(error)).toContain("ArgumentValidationError");
				expect(error.message).toContain("file does not exist");
			}
		});
	});

	describe("Directory Validation", () => {
		it("should validate existing directory", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateDirectoryExists(tempDir, "testDir");
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(
					Effect.provide(
						Layer.mergeAll(
							ValidationService.Default,
							NodeFileSystemLayer
						)
					)
				)
			);

			expect(result).toBe("success");
		});

		it("should fail for non-existent directory", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateDirectoryExists(
					"/nonexistent/dir",
					"testDir"
				);
			});

			await expect(
				Effect.runPromise(
					program.pipe(
						Effect.provide(
							Layer.mergeAll(
								ValidationService.Default,
								NodeFileSystemLayer
							)
						)
					)
				)
			).rejects.toThrow();
		});

		it("should throw with directory does not exist message", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateDirectoryExists("/nonexistent/dir", "myDir");
			});

			try {
				await Effect.runPromise(
					program.pipe(
						Effect.provide(
							Layer.mergeAll(
								ValidationService.Default,
								NodeFileSystemLayer
							)
						)
					)
				);
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(String(error)).toContain("ArgumentValidationError");
				expect(error.message).toContain("directory does not exist");
			}
		});
	});

	describe("Number Range Validation", () => {
		it("should accept value within range", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateNumberRange(50, 0, 100, "testNumber");
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ValidationService.Default))
			);

			expect(result).toBe("success");
		});

		it("should accept value at min boundary", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateNumberRange(0, 0, 100, "testNumber");
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ValidationService.Default))
			);

			expect(result).toBe("success");
		});

		it("should accept value at max boundary", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateNumberRange(100, 0, 100, "testNumber");
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ValidationService.Default))
			);

			expect(result).toBe("success");
		});

		it("should reject value below min", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateNumberRange(-10, 0, 100, "testNumber");
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow();
		});

		it("should reject value above max", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateNumberRange(150, 0, 100, "testNumber");
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow();
		});

		it("should include helpful message in error", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateNumberRange(-10, 0, 100, "count");
			});

			try {
				await Effect.runPromise(
					program.pipe(Effect.provide(ValidationService.Default))
				);
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(error.message).toContain("out of range");
			}
		});
	});

	describe("Enum Validation", () => {
		it("should accept valid enum value", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateEnum(
					"red",
					["red", "green", "blue"],
					"color"
				);
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ValidationService.Default))
			);

			expect(result).toBe("success");
		});

		it("should reject invalid enum value", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateEnum(
					"yellow",
					["red", "green", "blue"],
					"color"
				);
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow();
		});

		it("should throw ArgumentValidationError for argument enum", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateEnum(
					"invalid",
					["a", "b"],
					"myEnum",
					false
				);
			});

			try {
				await Effect.runPromise(
					program.pipe(Effect.provide(ValidationService.Default))
				);
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(String(error)).toContain("ArgumentValidationError");
				expect(error.message).toContain("not a valid choice");
			}
		});

		it("should throw OptionValidationError for option enum", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateEnum(
					"invalid",
					["a", "b"],
					"myEnum",
					true
				);
			});

			try {
				await Effect.runPromise(
					program.pipe(Effect.provide(ValidationService.Default))
				);
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(String(error)).toContain("OptionValidationError");
			}
		});
	});

	describe("Required Field Validation", () => {
		it("should accept non-empty value", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateRequired("value", "field");
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ValidationService.Default))
			);

			expect(result).toBe("success");
		});

		it("should accept non-zero number", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateRequired(42, "field");
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ValidationService.Default))
			);

			expect(result).toBe("success");
		});

		it("should reject undefined", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateRequired(undefined, "field");
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow("is required");
		});

		it("should reject null", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateRequired(null, "field");
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow("is required");
		});

		it("should reject empty string", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateRequired("", "field");
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow("is required");
		});

		it("should throw correct error type for argument", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateRequired(undefined, "myField", false);
			});

			try {
				await Effect.runPromise(
					program.pipe(Effect.provide(ValidationService.Default))
				);
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(String(error)).toContain("ArgumentValidationError");
			}
		});

		it("should throw correct error type for option", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateRequired(undefined, "myField", true);
			});

			try {
				await Effect.runPromise(
					program.pipe(Effect.provide(ValidationService.Default))
				);
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(String(error)).toContain("OptionValidationError");
			}
		});
	});

	describe("File Path Validation", () => {
		it("should accept valid file path", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFilePath("/path/to/file.txt", "filePath");
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ValidationService.Default))
			);

			expect(result).toBe("success");
		});

		it("should accept relative path by default", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFilePath("./path/to/file.txt", "filePath");
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ValidationService.Default))
			);

			expect(result).toBe("success");
		});

		it("should reject path with null bytes", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFilePath("/path/with/\0null", "filePath");
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow("contains null bytes");
		});

		it("should reject path traversal", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFilePath("../../etc/passwd", "filePath");
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow("path traversal");
		});

		it("should reject empty path", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFilePath("", "filePath");
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow("cannot be empty");
		});

		it("should reject whitespace-only path", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFilePath("   ", "filePath");
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow("cannot be empty");
		});

		it("should reject relative path when allowRelative=false", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFilePath("./relative/path.txt", "filePath", false);
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(ValidationService.Default)))
			).rejects.toThrow("must be an absolute path");
		});

		it("should accept absolute path when allowRelative=false", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;
				yield* validation.validateFilePath("/absolute/path.txt", "filePath", false);
				return "success";
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ValidationService.Default))
			);

			expect(result).toBe("success");
		});
	});

	describe("Error Accumulation", () => {
		it("should collect multiple validation errors", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;

				const validations = [
					validation.validateRequired(undefined, "field1"),
					validation.validateEnum("invalid", ["a", "b"], "field2"),
					validation.validateNumberRange(150, 0, 100, "field3"),
				];

				return yield* runValidations(validations);
			});

			const result = await Effect.runPromise(
				program.pipe(
					Effect.provide(
						Layer.mergeAll(
							ValidationService.Default,
							NodeFileSystemLayer
						)
					)
				)
			);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBe(3);
		});

		it("should return valid when all validations pass", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;

				const validations = [
					validation.validateRequired("value", "field1"),
					validation.validateEnum("a", ["a", "b"], "field2"),
					validation.validateNumberRange(50, 0, 100, "field3"),
				];

				return yield* runValidations(validations);
			});

			const result = await Effect.runPromise(
				program.pipe(
					Effect.provide(
						Layer.mergeAll(
							ValidationService.Default,
							NodeFileSystemLayer
						)
					)
				)
			);

			expect(result.isValid).toBe(true);
			expect(result.errors.length).toBe(0);
		});

		it("should accumulate errors without stopping", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;

				const validations = [
					validation.validateRequired(undefined, "field1"),
					validation.validateRequired("", "field2"),
					validation.validateRequired(null, "field3"),
				];

				return yield* runValidations(validations);
			});

			const result = await Effect.runPromise(
				program.pipe(
					Effect.provide(
						Layer.mergeAll(
							ValidationService.Default,
							NodeFileSystemLayer
						)
					)
				)
			);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBe(3);
		});

		it("should handle partial failure and success", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;

				const validations = [
					validation.validateRequired("good", "field1"),
					validation.validateRequired(undefined, "field2"),
					validation.validateRequired("also good", "field3"),
				];

				return yield* runValidations(validations);
			});

			const result = await Effect.runPromise(
				program.pipe(
					Effect.provide(
						Layer.mergeAll(
							ValidationService.Default,
							NodeFileSystemLayer
						)
					)
				)
			);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBe(1);
		});

		it("should handle empty validation list", async () => {
			const program = Effect.gen(function* () {
				return yield* runValidations([]);
			});

			const result = await Effect.runPromise(
				program.pipe(
					Effect.provide(
						Layer.mergeAll(
							ValidationService.Default,
							NodeFileSystemLayer
						)
					)
				)
			);

			expect(result.isValid).toBe(true);
			expect(result.errors.length).toBe(0);
		});
	});

	describe("Combined Validations", () => {
		it("should validate file path format and existence together", async () => {
			const testFile = join(tempDir, "test.txt");
			await writeFile(testFile, "content");

			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;

				const validations = [
					validation.validateFilePath(testFile, "path"),
					validation.validateFileExists(testFile, "file"),
				];

				return yield* runValidations(validations);
			});

			const result = await Effect.runPromise(
				program.pipe(
					Effect.provide(
						Layer.mergeAll(
							ValidationService.Default,
							NodeFileSystemLayer
						)
					)
				)
			);

			expect(result.isValid).toBe(true);
		});

		it("should catch both path format and existence errors", async () => {
			const program = Effect.gen(function* () {
				const validation = yield* ValidationService;

				const validations = [
					validation.validateFilePath("../../etc/passwd", "path"),
					validation.validateFileExists("/nonexistent/file.txt", "file"),
				];

				return yield* runValidations(validations);
			});

			const result = await Effect.runPromise(
				program.pipe(
					Effect.provide(
						Layer.mergeAll(
							ValidationService.Default,
							NodeFileSystemLayer
						)
					)
				)
			);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBe(2);
		});
	});
});
