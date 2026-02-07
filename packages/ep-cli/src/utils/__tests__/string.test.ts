/**
 * String Utilities Tests
 */

import { describe, expect, it } from "vitest";
import { toKebabCase } from "../string.js";

describe("String Utils", () => {
  describe("toKebabCase", () => {
    it("should convert to lowercase", () => {
      expect(toKebabCase("UPPERCASE")).toBe("uppercase");
      expect(toKebabCase("MixedCase")).toBe("mixedcase");
    });

    it("should replace spaces with hyphens", () => {
      expect(toKebabCase("hello world")).toBe("hello-world");
      expect(toKebabCase("multiple word phrase")).toBe("multiple-word-phrase");
    });

    it("should remove leading and trailing hyphens", () => {
      expect(toKebabCase("-test-")).toBe("test");
      expect(toKebabCase("_leading_underscore_")).toBe("leading-underscore");
    });

    it("should handle multiple consecutive special characters", () => {
      expect(toKebabCase("test---multiple")).toBe("test-multiple");
      expect(toKebabCase("word___word")).toBe("word-word");
    });

    it("should keep numbers", () => {
      expect(toKebabCase("test123")).toBe("test123");
      expect(toKebabCase("v2")).toBe("v2");
    });

    it("should handle already kebab-case strings", () => {
      expect(toKebabCase("already-kebab-case")).toBe("already-kebab-case");
      expect(toKebabCase("kebab-case-v1")).toBe("kebab-case-v1");
    });

    it("should handle empty string", () => {
      expect(toKebabCase("")).toBe("");
    });

    it("should replace non-alphanumeric characters with hyphens", () => {
      expect(toKebabCase("test!@#$%case")).toBe("test-case");
      expect(toKebabCase("hello&world")).toBe("hello-world");
    });

    it("should handle single words", () => {
      expect(toKebabCase("hello")).toBe("hello");
      expect(toKebabCase("HELLO")).toBe("hello");
    });

    it("should replace underscores with hyphens", () => {
      expect(toKebabCase("hello_world")).toBe("hello-world");
      expect(toKebabCase("test_case_string")).toBe("test-case-string");
    });

    it("should handle dots as non-alphanumeric", () => {
      expect(toKebabCase("file.name.txt")).toBe("file-name-txt");
    });

    it("should handle slashes as non-alphanumeric", () => {
      expect(toKebabCase("path/to/file")).toBe("path-to-file");
    });
  });
});
