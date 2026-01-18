/**
 * String Utilities Tests
 */

import { describe, expect, it } from "vitest";
import { colorize, toKebabCase } from "../string.js";

describe("String Utils", () => {
  describe("colorize", () => {
    it("should wrap text with color codes", () => {
      const result = colorize("test", "red");
      expect(result).toContain("\x1b[31m");
      expect(result).toContain("test");
      expect(result).toContain("\x1b[0m");
    });

    it("should apply reset code at end", () => {
      const result = colorize("test", "green");
      expect(result.endsWith("\x1b[0m")).toBe(true);
    });

    it("should support multiple colors", () => {
      const colors = ["red", "green", "yellow", "blue", "cyan", "bright", "dim"];
      colors.forEach((color) => {
        const result = colorize("text", color);
        expect(result).toContain("\x1b");
        expect(result).toContain("text");
      });
    });

    it("should handle invalid color gracefully", () => {
      const result = colorize("test", "invalid-color");
      expect(result).toContain("test");
      expect(result).toContain("\x1b[0m");
    });

    it("should preserve exact text", () => {
      const text = "Hello World!";
      const result = colorize(text, "blue");
      expect(result).toContain(text);
    });

    it("should handle empty text", () => {
      const result = colorize("", "red");
      expect(result).toContain("\x1b[31m");
      expect(result).toContain("\x1b[0m");
    });

    it("should handle special characters", () => {
      const result = colorize("test@#$%", "cyan");
      expect(result).toContain("test@#$%");
    });
  });

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
