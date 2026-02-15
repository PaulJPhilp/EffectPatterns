import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as SkillsApi from "../api.js";
import { Skills } from "../service.js";

const runSkills = <A>(effect: Effect.Effect<A, unknown, Skills>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Skills.Default), Effect.provide(NodeFileSystem.layer)));

describe("Skills service directory resolution", () => {
  const originalCwd = process.cwd();
  let tmpDir = "";

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-skills-service-"));
    delete process.env.EP_SKILLS_DIR;
  });

  afterEach(async () => {
    delete process.env.EP_SKILLS_DIR;
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("uses EP_SKILLS_DIR when provided", async () => {
    const skillsDir = path.join(tmpDir, "custom-skills", "concurrency");
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(
      path.join(skillsDir, "SKILL.md"),
      "# Concurrency\n\nbeginner\n\n### One\nGood Example\nAnti-Pattern\nRationale\n",
      "utf8"
    );

    process.env.EP_SKILLS_DIR = path.join(tmpDir, "custom-skills");
    process.chdir(tmpDir);

    const skills = await runSkills(SkillsApi.listAll());
    expect(skills).toHaveLength(1);
    expect(skills[0]?.category).toBe("concurrency");
  });

  it("auto-discovers skills directory by traversing parent folders", async () => {
    const repoRoot = path.join(tmpDir, "repo");
    const nestedCwd = path.join(repoRoot, "apps", "cli");
    const skillsDir = path.join(repoRoot, ".claude-plugin/plugins/effect-patterns/skills/testing");

    await fs.mkdir(skillsDir, { recursive: true });
    await fs.mkdir(nestedCwd, { recursive: true });
    await fs.writeFile(
      path.join(skillsDir, "SKILL.md"),
      "# Testing\n\nintermediate\n\n### One\nGood Example\nAnti-Pattern\nRationale\n",
      "utf8"
    );

    process.chdir(nestedCwd);

    const skills = await runSkills(SkillsApi.listAll());
    expect(skills).toHaveLength(1);
    expect(skills[0]?.category).toBe("testing");
    expect(skills[0]?.filePath).toContain(path.join(".claude-plugin", "plugins", "effect-patterns", "skills"));
  });
});

