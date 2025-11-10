/**
 * Queue Management Commands
 */

import { Effect } from "effect";
import { Command, Options } from "@effect/cli";
import { loadConfig, SupermemoryService } from "../services/index.js";
import {
  displayError,
  displaySuccess,
  createHeader,
  createInfoCard,
  createSuccess,
  prompt,
} from "../helpers/index.js";
import chalk from 'chalk';
import Table from 'cli-table3';

const formatOption = Options.choice('format', ['human', 'json'] as const)
  .pipe(Options.withDefault('human' as const));

const getStatusColor = (status: string): (text: string) => string => {
  switch (status) {
    case 'queued':
      return chalk.yellow;
    case 'extracting':
    case 'chunking':
    case 'embedding':
    case 'indexing':
      return chalk.blue;
    case 'done':
      return chalk.green;
    case 'failed':
      return chalk.red;
    default:
      return chalk.gray;
  }
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'queued':
      return '⏳';
    case 'extracting':
    case 'chunking':
    case 'embedding':
    case 'indexing':
      return '⚙️ ';
    case 'done':
      return '✅';
    case 'failed':
      return '❌';
    default:
      return '❓';
  }
};

/**
 * List all documents in processing queue
 */
export const queueList: any = Command.make(
  'list',
  {
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      const queue = yield* supermemoryService.getProcessingQueue();

      if (options.format === 'json') {
        yield* Effect.sync(() => console.log(JSON.stringify(queue, null, 2)));
      } else {
        if (queue.documents.length === 0) {
          const message =
            createHeader('Processing Queue', 'No documents being processed') +
            '\n' +
            createSuccess('Queue is empty! All documents have completed processing.');
          yield* Effect.sync(() => console.log(message));
        } else {
          // Create table
          const table = new Table({
            head: ['ID', 'Status', 'Created', 'Updated', 'Tags'].map((h) => chalk.cyan(h)),
            style: { head: [], border: ['grey'] },
            wordWrap: true,
            colWidths: [25, 15, 12, 12, 20],
          });

          queue.documents.forEach((doc) => {
            const createdDate = new Date(doc.created_at);
            const updatedDate = new Date(doc.updated_at);
            const statusColor = getStatusColor(doc.status);
            const statusIcon = getStatusIcon(doc.status);

            table.push([
              chalk.gray(doc.id.substring(0, 22) + '...'),
              statusColor(`${statusIcon} ${doc.status}`),
              createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              updatedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              chalk.gray(doc.container_tags.join(', ') || '(none)'),
            ]);
          });

          const header = createHeader(
            'Processing Queue',
            `${queue.total} document${queue.total > 1 ? 's' : ''} in queue`,
          );
          yield* Effect.sync(() => console.log(header + '\n' + table.toString()));
        }
      }
    }),
);

/**
 * Check status of a specific document
 */
export const queueStatus: any = Command.make(
  'status',
  {
    id: Options.text('id'),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      const doc = yield* supermemoryService.getDocumentStatus(options.id);

      if (options.format === 'json') {
        yield* Effect.sync(() => console.log(JSON.stringify(doc, null, 2)));
      } else {
        const statusColor = getStatusColor(doc.status);
        const statusIcon = getStatusIcon(doc.status);
        const createdDate = new Date(doc.created_at);
        const updatedDate = new Date(doc.updated_at);

        // Calculate time elapsed
        const elapsedMs = updatedDate.getTime() - createdDate.getTime();
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);
        let timeStr = '';
        if (elapsedMin > 0) {
          timeStr = `${elapsedMin}m ${elapsedSec % 60}s`;
        } else {
          timeStr = `${elapsedSec}s`;
        }

        const header = createHeader('Document Status', options.id.substring(0, 30));
        const details = createInfoCard({
          'Status': statusColor(`${statusIcon} ${doc.status}`),
          'Created': createdDate.toLocaleString('en-US'),
          'Updated': updatedDate.toLocaleString('en-US'),
          'Elapsed Time': timeStr,
          'Container Tags': doc.container_tags.join(', ') || '(none)',
          'Metadata': JSON.stringify(doc.metadata || {}),
        });

        yield* Effect.sync(() => console.log(header + '\n' + details));
      }
    }),
);

/**
 * Delete a document from the queue (retry)
 */
export const queueDelete: any = Command.make(
  'delete',
  {
    id: Options.text('id'),
    force: Options.boolean('force').pipe(Options.withDefault(false)),
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      // Confirm deletion unless force flag is set
      if (!options.force) {
        yield* Effect.sync(() => {
          console.log('');
          console.log(chalk.yellow('⚠️  Warning: This will delete the document from the queue.'));
          console.log('');
        });

        const confirm = yield* prompt('Continue? (yes/no)');
        if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
          yield* displayError('Deletion cancelled');
          return;
        }
      }

      yield* supermemoryService.deleteDocument(options.id);

      const message =
        createHeader('Document Deleted', `ID: ${options.id}`) +
        '\n' +
        createSuccess('Document removed from queue');
      yield* Effect.sync(() => console.log(message));
    }),
);

/**
 * Clear all failed documents from the queue
 */
export const queueClear: any = Command.make(
  'clear',
  {
    statusFilter: Options.optional(
      Options.choice('status', ['failed', 'queued', 'all'] as const),
    ),
    force: Options.boolean('force').pipe(Options.withDefault(false)),
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      const queue = yield* supermemoryService.getProcessingQueue();

      // Get filter value
      const filterValue = options.statusFilter
        ? typeof options.statusFilter === 'string'
          ? options.statusFilter
          : 'failed'
        : 'failed';

      // Filter documents
      let toDelete = queue.documents;
      if (filterValue !== 'all') {
        toDelete = queue.documents.filter((doc) => doc.status === filterValue);
      }

      if (toDelete.length === 0) {
        const message =
          createHeader('Queue Clear', `No documents with status "${filterValue}"`) +
          '\n' +
          createSuccess('Nothing to delete');
        yield* Effect.sync(() => console.log(message));
        return;
      }

      // Confirm deletion unless force flag is set
      if (!options.force) {
        yield* Effect.sync(() => {
          console.log('');
          console.log(
            chalk.yellow(`⚠️  Warning: This will delete ${toDelete.length} document(s) from the queue.`),
          );
          console.log('');
        });

        const confirm = yield* prompt('Continue? (yes/no)');
        if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
          yield* displayError('Clear cancelled');
          return;
        }
      }

      // Delete each document
      let deleted = 0;
      let failed = 0;

      for (const doc of toDelete) {
        const result = yield* Effect.either(supermemoryService.deleteDocument(doc.id));
        if (result._tag === 'Right') {
          deleted++;
        } else {
          failed++;
        }
      }

      const message =
        createHeader(
          'Queue Cleared',
          `Processed ${toDelete.length} document${toDelete.length > 1 ? 's' : ''}`,
        ) +
        '\n' +
        createInfoCard({
          'Deleted': chalk.green(deleted.toString()),
          'Failed': failed > 0 ? chalk.red(failed.toString()) : chalk.green('0'),
          'Total': toDelete.length.toString(),
        });

      yield* Effect.sync(() => console.log(message));
    }),
);

/**
 * Watch a document's processing status in real-time
 */
export const queueWatch: any = Command.make(
  'watch',
  {
    id: Options.text('id'),
    maxWait: Options.integer('max-wait').pipe(Options.withDefault(300)),
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      const supermemoryService = yield* SupermemoryServiceLive(config.apiKey);

      yield* Effect.sync(() => {
        console.log('');
        console.log(chalk.cyan('👀 Watching document processing...'));
        console.log(chalk.gray(`ID: ${options.id}`));
        console.log(chalk.gray(`Max wait: ${options.maxWait} seconds`));
        console.log('');
      });

      const doc = yield* supermemoryService.pollDocumentStatus(
        options.id,
        options.maxWait * 1000,
      );

      const statusColor = getStatusColor(doc.status);
      const statusIcon = getStatusIcon(doc.status);
      const finalMessage =
        createHeader('Processing Complete', `Status: ${statusColor(doc.status)}`) +
        '\n' +
        createInfoCard({
          'Status': statusColor(`${statusIcon} ${doc.status}`),
          'Document ID': doc.id,
          'Completed At': new Date(doc.updated_at).toLocaleString('en-US'),
        });

      yield* Effect.sync(() => console.log(finalMessage));
    }),
);

/**
 * Queue command group
 */
export const queueCommand: any = Command.make(
  'queue',
  {},
  () => Effect.void,
).pipe(
  Command.withSubcommands([
    queueList.pipe(Command.withDescription('List all documents in processing queue')),
    queueStatus.pipe(Command.withDescription('Check status of a specific document')),
    queueDelete.pipe(Command.withDescription('Delete a document from the queue')),
    queueClear.pipe(Command.withDescription('Clear failed or stuck documents from queue')),
    queueWatch.pipe(Command.withDescription('Watch a document process in real-time')),
  ]),
);
