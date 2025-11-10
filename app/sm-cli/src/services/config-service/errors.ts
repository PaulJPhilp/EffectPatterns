import { Data } from 'effect';

/**
 * ConfigService Errors
 * Tagged error types for configuration management
 */

export class ConfigError extends Data.TaggedError('ConfigError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class ConfigLoadError extends Data.TaggedError('ConfigLoadError')<{
  readonly path: string;
  readonly cause?: unknown;
}> {}

export class ConfigSaveError extends Data.TaggedError('ConfigSaveError')<{
  readonly path: string;
  readonly cause?: unknown;
}> {}

export class ConfigParseError extends Data.TaggedError('ConfigParseError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

