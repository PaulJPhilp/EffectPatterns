/**
 * Catalog service - Public exports
 */

// API
export type { Catalog } from "./api.js";
export type { CatalogError } from "./errors.js";

// Errors
export { CatalogLoadError, CatalogNotInitialized } from "./errors.js";
// Service
export { CatalogService } from "./service.js";
// Types
export type {
  CatalogIndices,
  CatalogPattern,
  ModulePlacement,
  ModuleStageGroup,
  ModuleView,
} from "./types.js";
