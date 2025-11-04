/**
 * Memories Management Commands
 */

import { Effect, Option } from 'effect';
import { Command, Options } from '@effect/cli';
import { loadConfig, ConfigServiceLive } from '../services/config.js';
import { SupermemoryServiceLive } from '../services/supermemory.js';
import { displayOutput, displayJson, displayLines, displaySuccess, displayError } from '../services/ui.js';
import {
  formatMemoriesHuman,
  formatMemoriesJson,
} from '../formatters/index.js';
import {
  createMemoryTable,
  createHeader,
  createStatPanel,
  createInfo,
  createInfoCard,
  createSuccess,
  createError,
  createBadge,
} from '../services/tui-formatter.js';

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
 * Add a new memory
 */
export const memoriesAdd: any = Command.make(
  'add',
  {
    content: Options.text('content'),
    type: Options.optional(Options.text('type')),
    title: Options.optional(Options.text('title')),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      const typeValue = Option.match(options.type, {
        onNone: () => 'memory',
        onSome: (v) => v,
      });
      const titleValue = Option.match(options.title, {
        onNone: () => 'Untitled',
        onSome: (v) => v,
      });

      const metadata = {
        type: typeValue,
        title: titleValue,
      };

      const memoryId = yield* supermemoryService.addMemory(options.content, metadata);

      if (options.format === 'json') {
        yield* displayJson({
          success: true,
          id: memoryId,
          type: metadata.type,
          title: metadata.title,
        });
      } else {
        const message =
          createHeader('Memory Added', `ID: ${memoryId}`) +
          '\n' +
          createInfoCard({
            'Memory ID': memoryId,
            'Type': metadata.type,
            'Title': metadata.title,
            'Status': 'Created ✓',
          });
        yield* Effect.sync(() => console.log(message));
      }
    }),
);

/**
 * Search memories
 */
export const memoriesSearch: any = Command.make(
  'search',
  {
    query: Options.text('query'),
    limit: Options.integer('limit').pipe(Options.withDefault(20)),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      const memories = yield* supermemoryService.searchMemories(options.query, options.limit);

      if (options.format === 'json') {
        yield* displayJson(memories);
      } else {
        if (memories.length === 0) {
          const message =
            createHeader('Search Results', `Query: "${options.query}"`) +
            '\n' +
            createError('No memories found matching your search.');
          yield* Effect.sync(() => console.log(message));
        } else {
          const table = createMemoryTable(memories);
          const header = createHeader(
            'Search Results',
            `Query: "${options.query}" - Found ${memories.length} result${memories.length > 1 ? 's' : ''}`,
          );
          yield* Effect.sync(() => console.log(header + '\n' + table));
        }
      }
    }),
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
