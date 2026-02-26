/**
 * Parse ep list output for harness (e.g. to get a pattern id for ep show).
 */

/** Best-effort parse first pattern ID from `ep list` human output. */
export function parseFirstPatternIdFromList(stdout: string): string | null {
  const nextShowMatch = stdout.match(/Next:\s*ep show\s+([a-z0-9-]+)/i)
  if (nextShowMatch?.[1]) return nextShowMatch[1]
  const slugLine = stdout.match(/^\s{2,}([a-z][a-z0-9-]+)\s*$/m)
  if (slugLine?.[1]) return slugLine[1]
  return null
}
