/**
 * Presentation Contract Markers
 *
 * These hidden HTML comments serve as stable contract markers for automated testing
 * and client integration. They ensure that even if the visual markdown styling changes,
 * the structural semantics of the output remain verifiable.
 *
 * Usage:
 * - Renderers include these markers in the output.
 * - Tests assert the presence and count of these markers.
 */

export const MARKER_PATTERN_INDEX_V1 = "<!-- kind:pattern-index:v1 -->";
export const MARKER_PATTERN_CARD_V1 = "<!-- kind:pattern-card:v1 -->";
