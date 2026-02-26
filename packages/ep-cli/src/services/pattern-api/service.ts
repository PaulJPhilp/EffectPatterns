/**
 * Pattern API service implementation
 */

import { Effect } from "effect";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type {
  PatternApiService,
  PatternDetail,
  PatternSearchParams,
  PatternSummary,
} from "./api.js";

const DEFAULT_API_BASE_URL = "https://effect-patterns-mcp-server-buddybuilder.vercel.app";
const DEFAULT_TIMEOUT_MS = 10_000;

const resolveConfigPath = () => {
  const explicit = process.env.EP_CONFIG_FILE;
  if (explicit && explicit.trim().length > 0) {
    return explicit;
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config");
  return path.join(configHome, "ep-cli", "config.json");
};

const readApiKeyFromFile = (filePath: string): string => {
  const content = readFileSync(filePath, "utf8").trim();
  if (!content) {
    throw new Error(`API key file is empty: ${filePath}`);
  }
  return content;
};

const readApiKeyFromConfig = (): string => {
  const configPath = resolveConfigPath();
  if (!existsSync(configPath)) {
    return "";
  }

  const raw = readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const value = parsed.apiKey;

  return typeof value === "string" ? value.trim() : "";
};

const resolveApiKey = (): string => {
  const direct = process.env.PATTERN_API_KEY?.trim();
  if (direct) return direct;

  const fromFilePath = process.env.EP_API_KEY_FILE?.trim();
  if (fromFilePath) {
    return readApiKeyFromFile(fromFilePath);
  }

  return readApiKeyFromConfig();
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const asString = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new Error(`Invalid API response: expected string for '${field}'`);
  }
  return value;
};

const asStringArray = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
};

const mapPatternSummary = (value: unknown): PatternSummary => {
  const obj = asObject(value);
  if (!obj) {
    throw new Error("Invalid API response: pattern summary is not an object");
  }

  return {
    id: asString(obj.id, "id"),
    title: asString(obj.title, "title"),
    description: asString(obj.description, "description"),
    category: asString(obj.category, "category"),
    difficulty: asString(obj.difficulty, "difficulty"),
    tags: asStringArray(obj.tags),
    examples: Array.isArray(obj.examples) ? obj.examples : [],
    useCases: asStringArray(obj.useCases),
    relatedPatterns: asStringArray(obj.relatedPatterns),
  };
};

const mapPatternDetail = (value: unknown): PatternDetail => {
  const summary = mapPatternSummary(value);
  const obj = value as Record<string, unknown>;

  return {
    ...summary,
    slug: typeof obj.slug === "string" ? obj.slug : undefined,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : undefined,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : undefined,
  };
};

const mapSearchResponse = (value: unknown): readonly PatternSummary[] => {
  const obj = asObject(value);
  if (!obj || !Array.isArray(obj.patterns)) {
    throw new Error("Invalid API response: expected 'patterns' array");
  }
  return obj.patterns.map(mapPatternSummary);
};

const mapDetailResponse = (value: unknown): PatternDetail => {
  const obj = asObject(value);
  if (!obj || !("pattern" in obj)) {
    throw new Error("Invalid API response: expected 'pattern' object");
  }
  return mapPatternDetail(obj.pattern);
};

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

const getTimeoutMs = (): number => {
  const raw = process.env.EP_API_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
};

const makeRequest = <T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  map: (value: unknown) => T
): Effect.Effect<T, Error> =>
  Effect.tryPromise({
    try: async () => {
      const controller = new AbortController();
      const timeoutMs = getTimeoutMs();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const headers: Record<string, string> = {
        accept: "application/json",
      };

      if (apiKey.trim()) {
        headers["x-api-key"] = apiKey;
      }

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        if (response.status === 404) {
          throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
        }

        if (!response.ok) {
          const body = await response.text();
          if (response.status === 401) {
            throw new Error(
              "Pattern API unauthorized (401). Set PATTERN_API_KEY, use --api-key-stdin, or configure EP_API_KEY_FILE."
            );
          }
          throw new Error(
            `Pattern API request failed (${response.status}): ${body || response.statusText}`
          );
        }

        const json = await response.json();
        return map(json);
      } finally {
        clearTimeout(timeout);
      }
    },
    catch: (error) => {
      if (typeof error === "object" && error !== null && "code" in error) {
        if ((error as { code?: string }).code === "NOT_FOUND") {
          return new Error("NOT_FOUND");
        }
      }

      if (error instanceof Error && error.name === "AbortError") {
        return new Error(
          `Pattern API request timed out after ${getTimeoutMs()}ms. Check EFFECT_PATTERNS_API_URL or network connectivity.`
        );
      }

      return error instanceof Error ? error : new Error(String(error));
    },
  });

export class PatternApi extends Effect.Service<PatternApi>()("PatternApi", {
  accessors: true,
  effect: Effect.gen(function* () {
    const baseUrl = normalizeBaseUrl(
      process.env.EFFECT_PATTERNS_API_URL || DEFAULT_API_BASE_URL
    );
    const apiKey = yield* Effect.try({
      try: () => resolveApiKey(),
      catch: (error) =>
        error instanceof Error
          ? error
          : new Error("Failed to resolve API key from configuration"),
    });

    const search: PatternApiService["search"] = (params: PatternSearchParams) =>
      Effect.gen(function* () {
        const searchParams = new URLSearchParams();
        if (params.query) searchParams.set("q", params.query);
        if (params.category) searchParams.set("category", params.category);
        if (params.difficulty) searchParams.set("difficulty", params.difficulty);
        if (params.limit !== undefined) searchParams.set("limit", String(params.limit));

        const query = searchParams.toString();
        const path = query ? `/api/patterns?${query}` : "/api/patterns";

        return yield* makeRequest(baseUrl, apiKey, path, mapSearchResponse);
      });

    const getById: PatternApiService["getById"] = (id: string) =>
      makeRequest(
        baseUrl,
        apiKey,
        `/api/patterns/${encodeURIComponent(id)}`,
        mapDetailResponse
      ).pipe(
        Effect.catchAll((error) =>
          error.message === "NOT_FOUND"
            ? Effect.succeed(null)
            : Effect.fail(error)
        )
      );

    return {
      search,
      getById,
    } as PatternApiService;
  }),
}) {}
