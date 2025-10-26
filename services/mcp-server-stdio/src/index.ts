#!/usr/bin/env node

/**
 * Effect Patterns MCP Server
 *
 * Provides MCP tools for searching Effect patterns and generating code
 * snippets. Communicates via stdio following the Model Context Protocol.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSnippet,
  getPatternById,
  type Pattern,
  searchPatterns,
} from '@effect-patterns/toolkit';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load patterns data
const patternsPath = join(__dirname, '../../../data/patterns-index.json');
let patterns: Pattern[] = [];

try {
  const data = readFileSync(patternsPath, 'utf-8');
  const parsed = JSON.parse(data);
  patterns = parsed.patterns || [];
  console.error(`Loaded ${patterns.length} patterns`);
} catch (error) {
  console.error('Failed to load patterns:', error);
  process.exit(1);
}

// Create MCP server
const server = new Server(
  {
    name: 'effect-patterns',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_patterns',
        description:
          'Search for Effect-TS patterns by query, category, or ' +
          'difficulty. Returns matching patterns with metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Search query to match against pattern titles, ' +
                'descriptions, tags, and categories',
            },
            category: {
              type: 'string',
              description: 'Filter by category',
              enum: [
                'error-handling',
                'concurrency',
                'data-transformation',
                'testing',
                'services',
                'streams',
                'caching',
                'observability',
                'scheduling',
                'resource-management',
              ],
            },
            difficulty: {
              type: 'string',
              description: 'Filter by difficulty level',
              enum: ['beginner', 'intermediate', 'advanced'],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 10,
            },
          },
        },
      },
      {
        name: 'get_pattern',
        description:
          'Get detailed information about a specific pattern by ID. ' +
          'Returns full pattern details including examples and use cases.',
        inputSchema: {
          type: 'object',
          properties: {
            patternId: {
              type: 'string',
              description: 'The unique identifier of the pattern',
            },
          },
          required: ['patternId'],
        },
      },
      {
        name: 'generate_snippet',
        description:
          'Generate a customized code snippet from a pattern. ' +
          'Supports custom names, inputs, and module types (ESM/CJS).',
        inputSchema: {
          type: 'object',
          properties: {
            patternId: {
              type: 'string',
              description: 'The pattern ID to generate code from',
            },
            customName: {
              type: 'string',
              description: 'Custom name for the generated function/constant',
            },
            customInput: {
              type: 'string',
              description: 'Custom input value for the example',
            },
            moduleType: {
              type: 'string',
              description: 'Module system to use',
              enum: ['esm', 'cjs'],
              default: 'esm',
            },
            effectVersion: {
              type: 'string',
              description: 'Effect version to include in comments',
            },
          },
          required: ['patternId'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    if (!args) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Missing arguments' }),
          },
        ],
        isError: true,
      };
    }

    try {
      switch (name) {
        case 'search_patterns': {
          const results = searchPatterns({
            patterns,
            query: args.query as string | undefined,
            category: args.category as string | undefined,
            difficulty: args.difficulty as string | undefined,
            limit: args.limit as number | undefined,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    count: results.length,
                    patterns: results.map((p) => ({
                      id: p.id,
                      title: p.title,
                      description: p.description,
                      category: p.category,
                      difficulty: p.difficulty,
                      tags: p.tags,
                    })),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case 'get_pattern': {
          const patternId = args.patternId as string;
          const pattern = getPatternById(patterns, patternId);

          if (!pattern) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: `Pattern not found: ${patternId}`,
                  }),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(pattern, null, 2),
              },
            ],
          };
        }

        case 'generate_snippet': {
          const patternId = args.patternId as string;
          const pattern = getPatternById(patterns, patternId);

          if (!pattern) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: `Pattern not found: ${patternId}`,
                  }),
                },
              ],
              isError: true,
            };
          }

          const snippet = buildSnippet({
            pattern,
            customName: args.customName as string | undefined,
            customInput: args.customInput as string | undefined,
            moduleType: (args.moduleType as 'esm' | 'cjs') || 'esm',
            effectVersion: args.effectVersion as string | undefined,
          });

          return {
            content: [
              {
                type: 'text',
                text: snippet,
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Unknown tool: ${name}` }),
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Effect Patterns MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
