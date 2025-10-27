/**
 * Unit tests for production-ready toolkit services
 */

import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { ToolkitConfig } from '../src/services/config.js';

describe('Production Services', () => {
    describe('ToolkitConfig', () => {
        it('should provide default configuration values', () =>
            Effect.gen(function* () {
                const config = yield* ToolkitConfig;

                const maxResults = yield* config.getMaxSearchResults();
                const cacheTtl = yield* config.getCacheTtlMs();
                const isLogging = yield* config.isLoggingEnabled();

                expect(typeof maxResults).toBe('number');
                expect(maxResults).toBeGreaterThan(0);
                expect(typeof cacheTtl).toBe('number');
                expect(cacheTtl).toBeGreaterThan(0);
                expect(typeof isLogging).toBe('boolean');
            }).pipe(Effect.provide(ToolkitConfig.Default))
        );
    });
});