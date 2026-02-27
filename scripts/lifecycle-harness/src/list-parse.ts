/**
 * Parse ep list output for harness (e.g. to get a pattern id for ep show).
 */

/** Best-effort parse first pattern ID from `ep list` human output. */
export function parseFirstPatternIdFromList(stdout: string): string | null {
  const ids = parsePatternIdsFromList(stdout, 1)
  return ids.length > 0 ? ids[0] ?? null : null
}

/** Parse up to `max` pattern IDs from `ep list` output (Next: ep show id first, then slug lines). */
export function parsePatternIdsFromList(stdout: string, max: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  const nextShowMatch = stdout.match(/Next:\s*ep show\s+([a-z0-9-]+)/i)
  if (nextShowMatch?.[1]) {
    const id = nextShowMatch[1]
    if (!seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }

  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    if (result.length >= max) break
    const bulletedIdMatch = line.match(/^\s*•\s+.*\(([a-z][a-z0-9-]+)\)\s*$/)
    const legacySlugMatch = line.match(/^\s{2,}([a-z][a-z0-9-]+)\s*$/)
    const id = bulletedIdMatch?.[1] ?? legacySlugMatch?.[1]
    if (id && !seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }

  return result.slice(0, max)
}
