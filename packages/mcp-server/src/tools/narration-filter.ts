/**
 * Narration Filter - Defense-in-depth protection against tool narration leakage
 *
 * Ensures internal logs and tool narration never appear in user-visible content.
 * This is a safety net in addition to proper logging (errors only to stderr).
 *
 * IMPORTANT: This filter is defense-in-depth ONLY. It should NOT be applied to
 * user-generated content (pattern descriptions, code examples, etc.), as it can
 * corrupt legitimate text.
 *
 * Primary guarantee: All tool narration/logs go to stderr via console.error(),
 * never to stdout where it could contaminate user-visible output.
 *
 * Secondary guarantee: This filter detects if the primary guarantee failed
 * (with telemetry counter). If the counter increments, it means logging control
 * failed and needs investigation.
 *
 * Usage:
 * - validateCleanContent(): Check if text contains forbidden patterns (testing)
 * - containsForbiddenNarration(): Query if pattern is present (testing)
 * - getNarrationFilterMetrics(): Monitor if filter ever triggered (telemetry)
 * - stripForbiddenNarration(): DO NOT USE ON USER CONTENT (dangerous)
 */

/**
 * Forbidden patterns that indicate tool narration / internal logs
 * (case-insensitive)
 */
const FORBIDDEN_NARRATION_PATTERNS = [
  /\[\d+\s+tools?\s+called\]/gi, // [1 tool called], [2 tools called]
  /\btool\s+called:\s*/gi, // Tool called: search_patterns (word boundary)
  /\bsearching\s+patterns/gi, // Searching patterns...
  /\brequest\s+(in\s+flight|timeout)/gi,
  /\bapi\s+(error|call)/gi,
  /\bcache\s+(hit|miss)/gi,
  /\bdedupe\s+hit/gi,
];

/**
 * Telemetry: track when narration filtering triggers
 */
let narrationFilterTriggered = 0;

/**
 * Check if text contains forbidden narration patterns
 */
export function containsForbiddenNarration(text: string): boolean {
  // Reset regex lastIndex for each test (important for global flag)
  for (const pattern of FORBIDDEN_NARRATION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Strip forbidden narration from text
 */
export function stripForbiddenNarration(text: string): string {
  let stripped = text;

  for (const pattern of FORBIDDEN_NARRATION_PATTERNS) {
    if (pattern.test(stripped)) {
      narrationFilterTriggered++;
      stripped = stripped.replace(pattern, "");
    }
  }

  return stripped.trim();
}

/**
 * Validate that rendered content is clean of narration
 * Returns error message if violations found, null otherwise
 */
export function validateCleanContent(text: string): string | null {
  if (containsForbiddenNarration(text)) {
    return `Content contains forbidden narration patterns: ${text.substring(0, 100)}...`;
  }
  return null;
}

/**
 * Get telemetry data
 */
export function getNarrationFilterMetrics() {
  return {
    triggeredCount: narrationFilterTriggered,
  };
}

/**
 * Reset metrics (for testing)
 */
export function resetNarrationFilterMetrics() {
  narrationFilterTriggered = 0;
}
