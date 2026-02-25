import { getPatternById, searchPatterns, type Pattern } from "@effect-patterns/toolkit";
import { readFile } from "fs/promises";
import path from "path";

interface ExportPatternRecord {
  readonly id?: string | number;
  readonly slug?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly category?: string;
  readonly difficulty?: string;
  readonly skill_level?: string;
  readonly tags?: unknown;
  readonly examples?: unknown;
  readonly use_cases?: unknown;
  readonly created_at?: string;
  readonly updated_at?: string;
}

interface ExportData {
  readonly effect_patterns?: ReadonlyArray<ExportPatternRecord>;
}

let cachedPatterns: ReadonlyArray<Pattern> | undefined;
let loadingPatterns: Promise<ReadonlyArray<Pattern>> | undefined;

const FALLBACK_EXPORT_PATHS = [
  path.resolve(process.cwd(), "mcp-data-export.json"),
  path.resolve(process.cwd(), "packages/mcp-server/mcp-data-export.json"),
];

const toStringArray = (value: unknown): ReadonlyArray<string> =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const toExamples = (value: unknown): Pattern["examples"] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        entry
      ): entry is { readonly language: string; readonly code: string; readonly description?: string } =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { language?: unknown }).language === "string" &&
        typeof (entry as { code?: unknown }).code === "string"
    )
    .map((entry) => ({
      language: entry.language,
      code: entry.code,
      ...(typeof entry.description === "string" ? { description: entry.description } : {}),
    }));
};

const normalizeDifficulty = (value: string | undefined): Pattern["difficulty"] => {
  if (value === "beginner" || value === "intermediate" || value === "advanced") {
    return value;
  }
  return "intermediate";
};

const toPattern = (record: ExportPatternRecord): Pattern => {
  const slug =
    (typeof record.slug === "string" && record.slug.trim().length > 0
      ? record.slug.trim()
      : undefined) ??
    (typeof record.id === "string" ? record.id : String(record.id ?? "")).trim();

  return {
    id: slug,
    slug,
    title: record.title ?? slug,
    description: record.summary ?? "",
    category: (record.category as Pattern["category"]) ?? "error-handling",
    difficulty: normalizeDifficulty(record.difficulty ?? record.skill_level),
    tags: toStringArray(record.tags),
    examples: toExamples(record.examples),
    useCases: toStringArray(record.use_cases),
    relatedPatterns: undefined,
    effectVersion: undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
};

const loadFallbackPatterns = async (): Promise<ReadonlyArray<Pattern>> => {
  if (cachedPatterns) {
    return cachedPatterns;
  }

  if (loadingPatterns) {
    return loadingPatterns;
  }

  loadingPatterns = (async () => {
    let lastError: unknown;

    for (const filePath of FALLBACK_EXPORT_PATHS) {
      try {
        const fileContent = await readFile(filePath, "utf8");
        const parsed = JSON.parse(fileContent) as ExportData;
        const patterns = (parsed.effect_patterns ?? []).map(toPattern);
        cachedPatterns = patterns;
        return patterns;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Unable to load fallback pattern data");
  })();

  try {
    return await loadingPatterns;
  } finally {
    loadingPatterns = undefined;
  }
};

export async function searchPatternsFallback(params: {
  readonly query?: string;
  readonly category?: string;
  readonly difficulty?: string;
  readonly limit?: number;
}): Promise<ReadonlyArray<Pattern>> {
  const patterns = await loadFallbackPatterns();
  return searchPatterns({
    patterns: [...patterns],
    query: params.query,
    category: params.category,
    difficulty: params.difficulty,
    limit: params.limit,
  });
}

export async function getPatternByIdFallback(
  patternId: string
): Promise<Pattern | undefined> {
  const patterns = await loadFallbackPatterns();
  return (
    getPatternById([...patterns], patternId) ??
    patterns.find((pattern) => pattern.slug === patternId || pattern.id === patternId)
  );
}
