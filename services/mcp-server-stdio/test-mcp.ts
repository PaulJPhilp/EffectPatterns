#!/usr/bin/env tsx
/**
 * Simple test script to verify MCP server functionality
 * Tests the server by sending MCP protocol messages
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';

const serverPath = join(process.cwd(), 'dist/index.js');

console.log('🧪 Testing MCP Server...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  // Try to parse complete JSON-RPC messages
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || '';

  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        console.log('📨 Received:', JSON.stringify(message, null, 2));
      } catch (_e) {
        console.log('📝 Output:', line);
      }
    }
  }
});

// Test 1: Initialize
console.log('1️⃣ Sending initialize request...');
server.stdin.write(
  `${JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    },
  })}\n`,
);

// Test 2: List tools
setTimeout(() => {
  console.log('\n2️⃣ Sending tools/list request...');
  server.stdin.write(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    })}\n`,
  );
}, 1000);

// Test 3: Search patterns
setTimeout(() => {
  console.log('\n3️⃣ Sending search_patterns tool call...');
  server.stdin.write(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_patterns',
        arguments: {
          query: 'retry',
          limit: 3,
        },
      },
    })}\n`,
  );
}, 2000);

// Cleanup
setTimeout(() => {
  console.log('\n✅ Test complete!');
  server.kill();
  process.exit(0);
}, 3000);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
