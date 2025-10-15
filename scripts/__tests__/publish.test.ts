import { describe, expect, it } from 'vitest';
import { publishPatterns } from '../publish/publish.js';

describe('Publish script', () => {
  it('should export a function', () => {
    expect(typeof publishPatterns).toBe('function');
  });
});
