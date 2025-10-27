/**
 * Catalog service errors
 */

import { Data } from 'effect';

export class CatalogNotInitialized extends Data.TaggedError(
  'CatalogNotInitialized'
)<{
  message: string;
}> {}

export class CatalogLoadError extends Data.TaggedError('CatalogLoadError')<{
  message: string;
  cause?: unknown;
}> {}

export type CatalogError = CatalogNotInitialized | CatalogLoadError;
