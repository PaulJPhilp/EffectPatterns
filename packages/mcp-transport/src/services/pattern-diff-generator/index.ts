/**
 * Pattern Diff Generator Service
 *
 * Exports the pattern diff generation functionality.
 */

export {
  generateMigrationDiff,
  listMigrationPatterns,
  isMigrationPattern,
  type MigrationExample,
  type DiffBlock,
} from "./api.js";
