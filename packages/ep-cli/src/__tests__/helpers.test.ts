/**
 * Tests for pure helper functions exported from index.ts
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  extractErrorMessage,
  findClosest,
  getCommandSuggestion,
  levenshtein,
  mapCliLogLevel,
  resolveLoggerConfig,
} from "../index.js";

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });

  it("returns length of other string when one is empty", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });

  it("returns 0 for two empty strings", () => {
    expect(levenshtein("", "")).toBe(0);
  });

  it("computes single-char edits", () => {
    expect(levenshtein("cat", "bat")).toBe(1);
    expect(levenshtein("cat", "cats")).toBe(1);
    expect(levenshtein("cat", "at")).toBe(1);
  });

  it("computes multi-char edits", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("findClosest", () => {
  it("returns null for empty candidates", () => {
    expect(findClosest("search", [])).toBeNull();
  });

  it("finds exact match", () => {
    expect(findClosest("search", ["search", "list", "show"])).toBe("search");
  });

  it("finds close match within threshold", () => {
    expect(findClosest("serch", ["search", "list", "show"])).toBe("search");
  });

  it("returns null when no candidate is close enough", () => {
    expect(findClosest("zzzzzzz", ["search", "list", "show"])).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(findClosest("SEARCH", ["search", "list"])).toBe("search");
  });
});

describe("getCommandSuggestion", () => {
  it("returns null when no args provided", () => {
    expect(getCommandSuggestion(["node", "ep"])).toBeNull();
  });

  it("suggests close root command", () => {
    const result = getCommandSuggestion(["node", "ep", "serch"]);
    expect(result).toContain("search");
  });

  it("returns null for valid root command", () => {
    expect(getCommandSuggestion(["node", "ep", "search"])).toBeNull();
  });

  it("suggests close nested command", () => {
    const result = getCommandSuggestion(["node", "ep", "install", "ad"]);
    expect(result).toContain("add");
  });

  it("returns null for valid nested command", () => {
    expect(getCommandSuggestion(["node", "ep", "install", "add"])).toBeNull();
  });

  it("returns null for command without nested subcommands", () => {
    expect(getCommandSuggestion(["node", "ep", "search", "anything"])).toBeNull();
  });
});

describe("extractErrorMessage", () => {
  const argv = ["node", "ep", "search", "foo"];

  it("returns string errors as-is", () => {
    expect(extractErrorMessage("some error", argv)).toBe("some error");
  });

  it("returns suggestion for CommandMismatch", () => {
    const err = new Error("CommandMismatch: blah");
    const result = extractErrorMessage(err, ["node", "ep", "serch"]);
    expect(result).toContain("search");
  });

  it("returns help message for CommandMismatch without suggestion", () => {
    const err = new Error("CommandMismatch: blah");
    const result = extractErrorMessage(err, ["node", "ep", "zzzzzzz"]);
    expect(result).toContain("ep --help");
  });

  it("handles network errors", () => {
    const err = new Error("Unable to connect. Is the computer able to access the url?");
    const result = extractErrorMessage(err, argv);
    expect(result).toContain("Effect Patterns API");
  });

  it("handles 401 errors", () => {
    const err = new Error("Pattern API unauthorized (401)");
    const result = extractErrorMessage(err, argv);
    expect(result).toContain("PATTERN_API_KEY");
  });

  it("handles SkillsDirectoryNotFoundError", () => {
    const err = new Error("SkillsDirectoryNotFoundError");
    const result = extractErrorMessage(err, argv);
    expect(result).toContain("Skills directory");
  });

  it("returns null for DisabledFeatureError", () => {
    const err = new Error("DisabledFeatureError");
    expect(extractErrorMessage(err, argv)).toBeNull();
  });

  it("returns null for ValidationFailedError", () => {
    const err = new Error("ValidationFailedError");
    expect(extractErrorMessage(err, argv)).toBeNull();
  });

  it("returns null for UnsupportedToolError", () => {
    const err = new Error("UnsupportedToolError");
    expect(extractErrorMessage(err, argv)).toBeNull();
  });

  it("returns null for generic 'An error has occurred'", () => {
    const err = new Error("An error has occurred");
    expect(extractErrorMessage(err, argv)).toBeNull();
  });

  it("includes docs URL for generic errors", () => {
    const err = new Error("Something went wrong");
    const result = extractErrorMessage(err, argv);
    expect(result).toContain("Something went wrong");
    expect(result).toContain("Docs:");
  });

  it("stringifies non-Error objects", () => {
    expect(extractErrorMessage(42, argv)).toBe("42");
  });
});

describe("mapCliLogLevel", () => {
  it("maps 'all' to debug", () => {
    expect(mapCliLogLevel("all")).toBe("debug");
  });

  it("maps 'trace' to debug", () => {
    expect(mapCliLogLevel("trace")).toBe("debug");
  });

  it("maps 'debug' to debug", () => {
    expect(mapCliLogLevel("debug")).toBe("debug");
  });

  it("maps 'info' to info", () => {
    expect(mapCliLogLevel("info")).toBe("info");
  });

  it("maps 'warning' to warn", () => {
    expect(mapCliLogLevel("warning")).toBe("warn");
  });

  it("maps 'error' to error", () => {
    expect(mapCliLogLevel("error")).toBe("error");
  });

  it("maps 'fatal' to error", () => {
    expect(mapCliLogLevel("fatal")).toBe("error");
  });

  it("maps 'none' to silent", () => {
    expect(mapCliLogLevel("none")).toBe("silent");
  });

  it("returns undefined for unknown values", () => {
    expect(mapCliLogLevel("unknown")).toBeUndefined();
  });

  it("trims and lowercases input", () => {
    expect(mapCliLogLevel("  DEBUG  ")).toBe("debug");
  });
});

describe("resolveLoggerConfig", () => {
  const savedEnv = { ...process.env };

  const cleanEnv = () => {
    delete process.env.LOG_LEVEL;
    delete process.env.DEBUG;
    delete process.env.VERBOSE;
  };

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("defaults to info", () => {
    cleanEnv();
    const config = resolveLoggerConfig(["node", "ep"]);
    expect(config.logLevel).toBe("info");
    expect(config.verbose).toBe(false);
  });

  it("respects LOG_LEVEL env", () => {
    cleanEnv();
    process.env.LOG_LEVEL = "debug";
    const config = resolveLoggerConfig(["node", "ep"]);
    expect(config.logLevel).toBe("debug");
  });

  it("respects DEBUG env", () => {
    cleanEnv();
    process.env.DEBUG = "1";
    const config = resolveLoggerConfig(["node", "ep"]);
    expect(config.logLevel).toBe("debug");
    expect(config.verbose).toBe(true);
  });

  it("respects VERBOSE env", () => {
    cleanEnv();
    process.env.VERBOSE = "1";
    const config = resolveLoggerConfig(["node", "ep"]);
    expect(config.logLevel).toBe("debug");
  });

  it("CLI --log-level overrides env", () => {
    cleanEnv();
    process.env.LOG_LEVEL = "error";
    const config = resolveLoggerConfig(["node", "ep", "--log-level", "debug"]);
    expect(config.logLevel).toBe("debug");
  });

  it("CLI --log-level=value syntax works", () => {
    cleanEnv();
    const config = resolveLoggerConfig(["node", "ep", "--log-level=error"]);
    expect(config.logLevel).toBe("error");
  });
});
