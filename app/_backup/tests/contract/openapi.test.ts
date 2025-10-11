import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const openapiFile = path.resolve(process.cwd(), '.well-known', 'openapi.json');

describe('OpenAPI Contract', () => {
    it('should have the correct paths', () => {
        const openapi = JSON.parse(fs.readFileSync(openapiFile, 'utf-8'));
        expect(openapi.paths).toHaveProperty('/mcp/pattern_search');
        expect(openapi.paths).toHaveProperty('/mcp/pattern_explain');
        expect(openapi.paths).toHaveProperty('/mcp/pattern_generate');
    });
});
