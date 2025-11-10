/**
 * Memories Management Commands
 */

import { Effect, Option } from "effect";
import { Command, Options } from "@effect/cli";
import { ConfigService } from "../services/index.js";
import { SupermemoryService } from "../services/index.js";
import {
  displayOutput,
  displayJson,
  displayLines,
  displaySuccess,
  displayError,
  prompt,
  promptMultiline,
  promptChoice,
  createMemoryTable,
  createHeader,
  createStatPanel,
  createInfo,
  createInfoCard,
  createSuccess,
  createError,
  createBadge,
} from '../helpers/index.js';
import {
  formatMemoriesHuman,
  formatMemoriesJson,
} from '../formatters/index.js';
import type { DocumentSearchOptions } from '../types.js';

const formatOption = Options.choice('format', ['human', 'json'] as const)
  .pipe(Options.withDefault('human' as const));

/**
 * List memories
 */
export const memoriesList: any = Command.make(
  'list',
  {
    type: Options.optional(Options.text('type')),
    page: Options.integer('page').pipe(Options.withDefault(1)),
    limit: Options.integer('limit').pipe(Options.withDefault(50)),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;

      let memories: any[] = [];

      // Use supermemory service to list
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);
      memories = yield* supermemoryService.listMemories(options.page, options.limit);

      // Filter by type if provided - need to handle Option type
      const typeValue = options.type ? (typeof options.type === 'string' ? options.type : undefined) : undefined;
      if (typeValue !== undefined) {
        memories = memories.filter((m: any) => (m.metadata as any)?.type === typeValue);
      }

      if (options.format === 'json') {
        yield* displayOutput(formatMemoriesJson(memories), 'info');
      } else {
        const table = createMemoryTable(memories);
        const header = createHeader(`Memories (Page ${options.page})`, `Showing ${memories.length} of 640 memories`);
        yield* Effect.sync(() => console.log(header + '\n' + table));
      }
    }),
);

/**
 * Count memories
 */
export const memoriesCount: any = Command.make(
  'count',
  {
    type: Options.optional(Options.text('type')),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;

      let count = 0;

      // Use supermemory service to count
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);
      const typeValue = options.type ? (typeof options.type === 'string' ? options.type : undefined) : undefined;
      count = yield* supermemoryService.countMemories(typeValue);

      if (options.format === 'json') {
        yield* displayJson({
          count,
          type: typeValue || 'all',
        });
      } else {
        const header = createHeader('Memory Statistics', 'Total memories stored');
        const typeLabel = typeValue || 'all';
        const stats = createStatPanel(`Total ${typeLabel} Memories`, count.toString(), 'cyan');
        yield* Effect.sync(() => console.log(header + '\n' + stats));
      }
    }),
);

/**
 * Add a new memory using interactive dialog
 */
export const memoriesAdd: any = Command.make(
  'add',
  {},
  () =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      // Interactive dialog for memory creation
      yield* Effect.sync(() => {
        console.log('');
        console.log('╔═══════════════════════════════╗');
        console.log('║  Create New Memory             ║');
        console.log('╚═══════════════════════════════╝');
        console.log('');
      });

      // Get title
      const title = yield* prompt('Memory Title');

      // Get memory type
      const typeOptions = ['pattern_note', 'reference', 'learning', 'other'];
      const type = yield* promptChoice('Memory Type', typeOptions);

      // Get content - multiline input
      const content = yield* promptMultiline('Memory Content');

      // Validate inputs
      if (!title.trim()) {
        yield* displayError('Title cannot be empty');
        return;
      }

      if (!content.trim()) {
        yield* displayError('Content cannot be empty');
        return;
      }

      const metadata = {
        type,
        title,
      };

      // Create the memory
      const memoryId = yield* supermemoryService.addMemory(content, metadata);

      // Show success message
      const message =
        createHeader('Memory Created', `ID: ${memoryId}`) +
        '\n' +
        createInfoCard({
          'Memory ID': memoryId,
          'Title': title,
          'Type': type,
          'Status': 'Created ✓',
        });
      yield* Effect.sync(() => console.log(message));
    }),
);

/**
 * Search memories with advanced options (v4/search)
 *
 * Uses Supermemory's v4/search endpoint optimized for conversational AI
 * with support for similarity thresholds, reranking, and container filtering.
 */
export const memoriesSearch: any = Command.make(
  'search',
  {
    query: Options.text('query'),
    limit: Options.integer('limit').pipe(Options.withDefault(20)),
    threshold: Options.float('threshold').pipe(
      Options.optional,
      Options.withDescription('Similarity threshold (0.0-1.0): 0=broad, 1=precise'),
    ),
    rerank: Options.boolean('rerank').pipe(
      Options.optional,
      Options.withDefault(false),
      Options.withDescription('Re-score results with different algorithm for higher accuracy'),
    ),
    container: Options.text('container').pipe(
      Options.optional,
      Options.withDescription('Filter by container tag (user/project identifier)'),
    ),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      // Build search options for v4/search endpoint
      const searchOptions = {
        q: options.query,
        limit: options.limit,
        threshold: options.threshold ?? 0.5, // Default to balanced search
        rerank: options.rerank,
        containerTag: options.container,
      };

      // Call advanced search method using v4/search endpoint
      const result = yield* supermemoryService.searchMemoriesAdvanced(searchOptions);

      if (options.format === 'json') {
        yield* displayJson(result);
      } else {
        if (result.results.length === 0) {
          const filterInfo = options.threshold
            ? ` (threshold: ${options.threshold})`
            : '';
          const message =
            createHeader('Search Results', `Query: "${options.query}"${filterInfo}`) +
            '\n' +
            createError('No memories found matching your search.');
          yield* Effect.sync(() => console.log(message));
        } else {
          // Format results table with similarity scores
          const table = result.results
            .map((item) => ({
              id: item.id,
              memory: item.memory,
              similarity: (item.similarity * 100).toFixed(1) + '%',
              updated: item.updatedAt,
            }))
            .map((row) =>
              `  ${row.similarity.padStart(6)} | ${row.memory.substring(0, 50).padEnd(50)} | ${row.id.substring(0, 12)}`,
            )
            .join('\n');

          const thresholdInfo = options.threshold ? ` | threshold: ${options.threshold}` : '';
          const rerankInfo = options.rerank ? ' | rerank: on' : '';
          const containerInfo = options.container ? ` | container: ${options.container}` : '';

          const headerText =
            createHeader(
              'Search Results',
              `Query: "${options.query}" - Found ${result.results.length} result${
                result.results.length > 1 ? 's' : ''
              }${thresholdInfo}${rerankInfo}${containerInfo}`,
            ) +
            '\n' +
            '  Similarity | Memory                                             | ID\n' +
            '  ' +
            '─'.repeat(80) +
            '\n' +
            table;

          if (result.timing) {
            headerText.concat(`\n\n  Search completed in ${result.timing}ms`);
          }

          yield* Effect.sync(() => console.log(headerText));
        }
      }
    }),
);

/**
 * Search documents with advanced options (v3/search)
 *
 * Uses Supermemory's v3/search endpoint optimized for document-centric search
 * with support for document/chunk thresholds, reranking, query rewriting, and filtering.
 */
export const documentsSearch: any = Command.make(
  'search',
  {
    query: Options.text('query'),
    limit: Options.integer('limit').pipe(Options.withDefault(20)),
    documentThreshold: Options.float('document-threshold').pipe(
      Options.optional,
      Options.withDescription('Document relevance threshold (0.0-1.0)'),
    ),
    chunkThreshold: Options.float('chunk-threshold').pipe(
      Options.optional,
      Options.withDescription('Chunk relevance threshold (0.0-1.0)'),
    ),
    rerank: Options.boolean('rerank').pipe(
      Options.optional,
      Options.withDefault(false),
      Options.withDescription('Re-score results with different algorithm'),
    ),
    rewriteQuery: Options.boolean('rewrite-query').pipe(
      Options.optional,
      Options.withDefault(false),
      Options.withDescription('Expand query for better coverage (+400ms latency)'),
    ),
    includeFullDocs: Options.boolean('include-full-docs').pipe(
      Options.optional,
      Options.withDefault(false),
      Options.withDescription('Include full document context'),
    ),
    containers: Options.text('containers').pipe(
      Options.optional,
      Options.withDescription('Comma-separated container tags for filtering'),
    ),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      // Parse container tags if provided
      const containerTags = options.containers
        ? (typeof options.containers === 'string' ? options.containers : '')
            .split(',')
            .map((c) => c.trim())
        : undefined;

      // Build search options for v3/search endpoint
      const searchOptions: DocumentSearchOptions = {
        q: options.query,
        limit: options.limit,
        documentThreshold:
          typeof options.documentThreshold === 'number' ? options.documentThreshold : 0.5,
        chunkThreshold:
          typeof options.chunkThreshold === 'number' ? options.chunkThreshold : 0.6,
        rerank: typeof options.rerank === 'boolean' ? options.rerank : false,
        rewriteQuery: typeof options.rewriteQuery === 'boolean' ? options.rewriteQuery : false,
        includeFullDocs: typeof options.includeFullDocs === 'boolean' ? options.includeFullDocs : false,
        containerTags,
      };

      // Call advanced search method using v3/search endpoint
      const result = yield* supermemoryService.searchDocuments(searchOptions);

      if (options.format === 'json') {
        yield* displayJson(result);
      } else {
        if (result.results.length === 0) {
          const message =
            createHeader('Document Search Results', `Query: "${options.query}"`) +
            '\n' +
            createError('No documents found matching your search.');
          yield* Effect.sync(() => console.log(message));
        } else {
          // Format results table with relevance scores
          const table = result.results
            .map((chunk) => ({
              score: (chunk.score * 100).toFixed(1) + '%',
              title: chunk.title,
              docId: chunk.documentId.substring(0, 12),
            }))
            .map((row) =>
              `  ${row.score.padStart(6)} | ${row.title.substring(0, 50).padEnd(50)} | ${row.docId}`,
            )
            .join('\n');

          const thresholdInfo = options.documentThreshold
            ? ` | doc-threshold: ${options.documentThreshold}`
            : '';
          const chunkThresholdInfo = options.chunkThreshold
            ? ` | chunk-threshold: ${options.chunkThreshold}`
            : '';
          const rerankInfo = options.rerank ? ' | rerank: on' : '';
          const queryRewriteInfo = options.rewriteQuery ? ' | query-rewrite: on' : '';

          const headerText =
            createHeader(
              'Document Search Results',
              `Query: "${options.query}" - Found ${result.results.length} result${
                result.results.length > 1 ? 's' : ''
              }${thresholdInfo}${chunkThresholdInfo}${rerankInfo}${queryRewriteInfo}`,
            ) +
            '\n' +
            '  Relevance | Document Title                                         | Doc ID\n' +
            '  ' +
            '─'.repeat(80) +
            '\n' +
            table;

          if (result.timing) {
            headerText.concat(`\n\n  Search completed in ${result.timing}ms`);
          }

          yield* Effect.sync(() => console.log(headerText));
        }
      }
    }),
);

/**
 * Documents command group
 */
export const documentsCommand: any = Command.make(
  'documents',
  {},
  () => Effect.void,
).pipe(
  Command.withSubcommands([
    documentsSearch.pipe(
      Command.withDescription('Search documents (PDFs, text, images, videos)'),
    ),
  ]),
);

/**
 * Memories command group
 */
export const memoriesCommand: any = Command.make(
  'memories',
  {},
  () => Effect.void,
).pipe(
  Command.withSubcommands([
    memoriesList.pipe(Command.withDescription('List memories with pagination')),
    memoriesCount.pipe(Command.withDescription('Count total memories')),
    memoriesAdd.pipe(Command.withDescription('Add a new memory')),
    memoriesSearch.pipe(Command.withDescription('Search memories by query')),
  ]),
);
