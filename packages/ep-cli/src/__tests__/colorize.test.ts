/**
 * Tests for colorize utility
 */

import { afterEach, describe, expect, it } from "vitest";
import { colorize } from "../utils.js";
import { ANSI_COLORS } from "../constants.js";

describe("colorize", () => {
  const savedEnv = { ...process.env };
  const savedIsTTY = process.stdout.isTTY;

  afterEach(() => {
    process.env = { ...savedEnv };
    Object.defineProperty(process.stdout, "isTTY", { value: savedIsTTY, writable: true });
  });

  it("returns plain text when NO_COLOR is set", () => {
    process.env.NO_COLOR = "1";
    delete process.env.CI;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    expect(colorize("hello", "RED")).toBe("hello");
  });

  it("returns plain text when CI is set", () => {
    delete process.env.NO_COLOR;
    process.env.CI = "true";
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    expect(colorize("hello", "RED")).toBe("hello");
  });

  it("returns plain text when TERM=dumb", () => {
    delete process.env.NO_COLOR;
    delete process.env.CI;
    process.env.TERM = "dumb";
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    expect(colorize("hello", "RED")).toBe("hello");
  });

  it("returns plain text when stdout is not a TTY", () => {
    delete process.env.NO_COLOR;
    delete process.env.CI;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
    expect(colorize("hello", "RED")).toBe("hello");
  });

  it("returns colored text in TTY environment", () => {
    delete process.env.NO_COLOR;
    delete process.env.CI;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    const result = colorize("hello", "RED");
    expect(result).toBe(`${ANSI_COLORS.RED}hello${ANSI_COLORS.RESET}`);
  });

  it("works with all color keys", () => {
    delete process.env.NO_COLOR;
    delete process.env.CI;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    for (const key of Object.keys(ANSI_COLORS) as (keyof typeof ANSI_COLORS)[]) {
      if (key === "RESET") continue;
      const result = colorize("text", key);
      expect(result).toContain(ANSI_COLORS[key]);
      expect(result).toContain(ANSI_COLORS.RESET);
    }
  });
});
