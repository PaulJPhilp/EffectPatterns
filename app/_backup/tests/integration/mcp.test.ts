import { describe, it, expect } from 'vitest';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('MCP Endpoints', () => {
    it('should return the x-trace-id header', async () => {
        await sleep(5000); // Wait for 5 seconds for the server to start
        const response = await fetch('http://localhost:3000/mcp/pattern_generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-key'
            },
            body: JSON.stringify({ patternId: '123' })
        });

        expect(response.headers.get('x-trace-id')).toBe('123');
    });
});
