/**
 * Simple Tool Handlers
 *
 * Handles get_mcp_config, list_analysis_rules, list_skills, and get_skill.
 * These are straightforward API-call-and-format handlers.
 */

import type {
  GetMcpConfigArgs,
  GetSkillArgs,
  ListSkillsArgs,
} from "../../schemas/tool-schemas.js";
import {
  toToolResult,
  toToolResultEffect,
} from "../tool-result-builder.js";
import { normalizeContentBlocks } from "../tool-shared.js";
import type {
  CallToolResult,
  EffectToolContext,
  ToolContext,
} from "../tool-types.js";
import { Effect } from "effect";
import { MCPApiService } from "../../services/MCPApiService.js";
import { MCPCacheService } from "../../services/MCPCacheService.js";
import { MCPLoggerService } from "../../services/MCPLoggerService.js";

export async function handleGetMcpConfig(
  args: GetMcpConfigArgs,
  _ctx: ToolContext,
): Promise<CallToolResult> {
  const format = args.format || "markdown";
  const payload = {
    baseUrl: process.env.EFFECT_PATTERNS_API_URL || "",
    mcpEnv: process.env.MCP_ENV || "",
    debug: process.env.MCP_DEBUG || "",
    hasApiKey: !!(process.env.PATTERN_API_KEY && process.env.PATTERN_API_KEY.trim()),
  };

  const content: CallToolResult["content"] = [];

  if (format === "markdown" || format === "both") {
    content.push({
      type: "text",
      text: [
        "## MCP Config",
        "",
        `- baseUrl: ${payload.baseUrl || "(empty)"}`,
        `- mcpEnv: ${payload.mcpEnv || "(empty)"}`,
        `- debug: ${payload.debug || "(empty)"}`,
        `- hasApiKey: ${payload.hasApiKey}`,
        "",
      ].join("\n"),
      mimeType: "text/markdown",
    });
  }

  if (format === "json" || format === "both") {
    content.push({
      type: "text",
      text: JSON.stringify(payload, null, 2),
      mimeType: "application/json",
    });
  }

  return {
    content: normalizeContentBlocks(content),
    structuredContent: payload,
  };
}

export async function handleListAnalysisRules(
  ctx: ToolContext,
): Promise<CallToolResult> {
  const { callApi, log } = ctx;
  log("Tool called: list_analysis_rules", {});
  const result = await callApi("/list-rules", "POST", {});
  return toToolResult(result, "list_analysis_rules", log);
}

export async function handleListSkills(
  args: ListSkillsArgs,
  ctx: ToolContext,
): Promise<CallToolResult> {
  const { callApi, log } = ctx;
  log("Tool called: list_skills", args);

  const format = args.format || "markdown";
  const searchParams = new URLSearchParams();
  if (args.q) searchParams.append("q", args.q);
  if (args.category) searchParams.append("category", args.category);
  if (args.limit) searchParams.append("limit", String(args.limit));

  const result = await callApi(`/skills?${searchParams}`);

  if (!result.ok) {
    return toToolResult(result, "list_skills", log, undefined, format);
  }

  interface SkillSummary { slug: string; name: string; description: string; category: string; patternCount: number; version: number }
  const data = result.data as { count: number; skills: SkillSummary[] };

  const content: CallToolResult["content"] = [];

  if (format === "markdown" || format === "both") {
    const queryInfo = args.q ? ` for "${args.q}"` : "";
    let md = `## Effect Skills${queryInfo}\nFound **${data.count}** skills.\n\n`;

    for (const skill of data.skills) {
      md += `### ${skill.name}\n`;
      md += `- **Slug:** \`${skill.slug}\`\n`;
      md += `- **Category:** ${skill.category}\n`;
      md += `- **Patterns:** ${skill.patternCount}\n`;
      md += `${skill.description}\n\n`;
    }

    content.push({
      type: "text" as const,
      text: md,
      mimeType: "text/markdown" as const,
    });
  }

  if (format === "json" || format === "both") {
    content.push({
      type: "text" as const,
      text: JSON.stringify(data, null, 2),
      mimeType: "application/json" as const,
    });
  }

  return {
    content,
    structuredContent: data as Record<string, unknown>,
  };
}

export async function handleGetSkill(
  args: GetSkillArgs,
  ctx: ToolContext,
): Promise<CallToolResult> {
  const { callApi, log } = ctx;
  log("Tool called: get_skill", args);

  const format = args.format || "markdown";
  const result = await callApi(`/skills/${encodeURIComponent(args.slug)}`);

  if (!result.ok) {
    return toToolResult(result, "get_skill", log, undefined, format);
  }

  interface SkillDetail { slug: string; name: string; description: string; category: string; patternCount: number; version: number; content?: string }
  const data = result.data as { skill: SkillDetail };

  const content: CallToolResult["content"] = [];

  if (format === "markdown" || format === "both") {
    let md = `## ${data.skill.name}\n\n`;
    md += `- **Slug:** \`${data.skill.slug}\`\n`;
    md += `- **Category:** ${data.skill.category}\n`;
    md += `- **Patterns:** ${data.skill.patternCount}\n`;
    md += `- **Version:** ${data.skill.version}\n\n`;

    if (data.skill.content) {
      md += data.skill.content;
    } else {
      md += data.skill.description;
    }

    content.push({
      type: "text" as const,
      text: md,
      mimeType: "text/markdown" as const,
    });
  }

  if (format === "json" || format === "both") {
    content.push({
      type: "text" as const,
      text: JSON.stringify(data, null, 2),
      mimeType: "application/json" as const,
    });
  }

  return {
    content,
    structuredContent: data as Record<string, unknown>,
  };
}

// ============================================================================
// Effect.fn versions with automatic OTEL tracing
// ============================================================================

function listAnalysisRulesProgram(
  ctx: EffectToolContext,
): Effect.Effect<CallToolResult> {
  const { callApi, log } = ctx;

  return Effect.gen(function* () {
    yield* log("Tool called: list_analysis_rules", {});
    const result = yield* callApi("/list-rules", "POST", {});
    return yield* toToolResultEffect(result, "list_analysis_rules", log);
  });
}

function listSkillsProgram(
  args: ListSkillsArgs,
  ctx: EffectToolContext,
): Effect.Effect<CallToolResult> {
  const { callApi, log } = ctx;

  return Effect.gen(function* () {
    yield* log("Tool called: list_skills", args);

    const format = args.format || "markdown";
    const searchParams = new URLSearchParams();
    if (args.q) searchParams.append("q", args.q);
    if (args.category) searchParams.append("category", args.category);
    if (args.limit) searchParams.append("limit", String(args.limit));

    const result = yield* callApi(`/skills?${searchParams}`);

    if (!result.ok) {
      return yield* toToolResultEffect(
        result,
        "list_skills",
        log,
        undefined,
        format,
      );
    }

    interface SkillSummary {
      slug: string;
      name: string;
      description: string;
      category: string;
      patternCount: number;
      version: number;
    }

    const data = result.data as { count: number; skills: SkillSummary[] };

    const content: CallToolResult["content"] = [];

    if (format === "markdown" || format === "both") {
      const queryInfo = args.q ? ` for "${args.q}"` : "";
      let md = `## Effect Skills${queryInfo}\nFound **${data.count}** skills.\n\n`;

      for (const skill of data.skills) {
        md += `### ${skill.name}\n`;
        md += `- **Slug:** \`${skill.slug}\`\n`;
        md += `- **Category:** ${skill.category}\n`;
        md += `- **Patterns:** ${skill.patternCount}\n`;
        md += `${skill.description}\n\n`;
      }

      content.push({
        type: "text" as const,
        text: md,
        mimeType: "text/markdown" as const,
      });
    }

    if (format === "json" || format === "both") {
      content.push({
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
        mimeType: "application/json" as const,
      });
    }

    return {
      content,
      structuredContent: data as Record<string, unknown>,
    };
  });
}

function getSkillProgram(
  args: GetSkillArgs,
  ctx: EffectToolContext,
): Effect.Effect<CallToolResult> {
  const { callApi, log } = ctx;

  return Effect.gen(function* () {
    yield* log("Tool called: get_skill", args);

    const format = args.format || "markdown";
    const result = yield* callApi(`/skills/${encodeURIComponent(args.slug)}`);

    if (!result.ok) {
      return yield* toToolResultEffect(
        result,
        "get_skill",
        log,
        undefined,
        format,
      );
    }

    interface SkillDetail {
      slug: string;
      name: string;
      description: string;
      category: string;
      patternCount: number;
      version: number;
      content?: string;
    }

    const data = result.data as { skill: SkillDetail };

    const content: CallToolResult["content"] = [];

    if (format === "markdown" || format === "both") {
      let md = `## ${data.skill.name}\n\n`;
      md += `- **Slug:** \`${data.skill.slug}\`\n`;
      md += `- **Category:** ${data.skill.category}\n`;
      md += `- **Patterns:** ${data.skill.patternCount}\n`;
      md += `- **Version:** ${data.skill.version}\n\n`;

      if (data.skill.content) {
        md += data.skill.content;
      } else {
        md += data.skill.description;
      }

      content.push({
        type: "text" as const,
        text: md,
        mimeType: "text/markdown" as const,
      });
    }

    if (format === "json" || format === "both") {
      content.push({
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
        mimeType: "application/json" as const,
      });
    }

    return {
      content,
      structuredContent: data as Record<string, unknown>,
    };
  });
}

export const listAnalysisRulesEffect = Effect.fn("mcp.list_analysis_rules")(
  function* () {
    yield* Effect.annotateCurrentSpan({ "mcp.tool": "list_analysis_rules" });
    const api = yield* MCPApiService;
    const cache = yield* MCPCacheService;
    const logger = yield* MCPLoggerService;

    const ctx: EffectToolContext = {
      callApi: (endpoint, method, data) =>
        api.callApi(endpoint, method ?? "GET", data),
      log: (message, data) => logger.log(message, data),
      cache: {
        get: (key) => cache.get(key),
        set: (key, value, ttl) => cache.set(key, value, ttl),
      },
    };

    return yield* listAnalysisRulesProgram(ctx);
  }
);

export const listSkillsEffect = Effect.fn("mcp.list_skills")(
  function* (args: ListSkillsArgs) {
    yield* Effect.annotateCurrentSpan({
      "mcp.tool": "list_skills",
      "mcp.query": args.q ?? "",
      "mcp.category": args.category ?? "",
    });
    const api = yield* MCPApiService;
    const cache = yield* MCPCacheService;
    const logger = yield* MCPLoggerService;

    const ctx: EffectToolContext = {
      callApi: (endpoint, method, data) =>
        api.callApi(endpoint, method ?? "GET", data),
      log: (message, data) => logger.log(message, data),
      cache: {
        get: (key) => cache.get(key),
        set: (key, value, ttl) => cache.set(key, value, ttl),
      },
    };

    return yield* listSkillsProgram(args, ctx);
  }
);

export const getSkillEffect = Effect.fn("mcp.get_skill")(
  function* (args: GetSkillArgs) {
    yield* Effect.annotateCurrentSpan({
      "mcp.tool": "get_skill",
      "mcp.skill.slug": args.slug ?? "",
    });
    const api = yield* MCPApiService;
    const cache = yield* MCPCacheService;
    const logger = yield* MCPLoggerService;

    const ctx: EffectToolContext = {
      callApi: (endpoint, method, data) =>
        api.callApi(endpoint, method ?? "GET", data),
      log: (message, data) => logger.log(message, data),
      cache: {
        get: (key) => cache.get(key),
        set: (key, value, ttl) => cache.set(key, value, ttl),
      },
    };

    return yield* getSkillProgram(args, ctx);
  }
);
