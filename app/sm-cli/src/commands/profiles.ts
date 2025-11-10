/**
 * User Profile Management Commands
 *
 * Commands for managing user profiles in Supermemory
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import Table from "cli-table3";
import chalk from "chalk";
import { SupermemoryService } from "../services/index.js";
import type { OutputOptions } from '../types.js';

// Helper function to format timestamp
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

// Helper function to create a header box
const createHeader = (title: string): string => {
  const width = 70;
  const padding = Math.max(0, width - title.length - 2) / 2;
  const line = '═'.repeat(width);
  return `╔${line}╗\n║${' '.repeat(Math.floor(padding))}${title}${' '.repeat(Math.ceil(padding))}║\n╚${line}╝`;
};

/**
 * profiles show - Show user profile
 */
const profilesShowCommand = Command.make(
  'show',
  {
    user: Options.text('user').pipe(
      Options.withDescription('User ID or container tag'),
    ),
    section: Options.choice('section', ['static', 'dynamic', 'both']).pipe(
      Options.optional,
      Options.withDefault('both'),
      Options.withDescription('Profile section to show (default: both)'),
    ),
    format: Options.choice('format', ['human', 'json']).pipe(
      Options.optional,
      Options.withDefault('human'),
      Options.withDescription('Output format (default: human)'),
    ),
  },
  ({ user, section, format }) =>
    Effect.gen(function* () {
      const service = yield* SupermemoryService;
      const profile = yield* service.getUserProfile(user);

      if (format === 'json') {
        console.log(JSON.stringify(profile, null, 2));
        return;
      }

      // Human format
      console.log('\n' + createHeader(`User Profile: ${user}`));
      console.log(chalk.gray(`Retrieved: ${formatDate(profile.retrievedAt)}\n`));

      const table = new Table({
        head: [chalk.cyan('Section'), chalk.cyan('Facts')],
        wordWrap: true,
        colWidths: [20, 50],
      });

      if (section === 'static' || section === 'both') {
        const staticFacts = profile.static.map((f) => `  • ${f}`).join('\n');
        table.push([chalk.blue('📋 Static Profile'), staticFacts || chalk.gray('(empty)')]);
      }

      if (section === 'dynamic' || section === 'both') {
        const dynamicFacts = profile.dynamic.map((f) => `  • ${f}`).join('\n');
        table.push([chalk.yellow('🔄 Dynamic Profile'), dynamicFacts || chalk.gray('(empty)')]);
      }

      console.log(table.toString());
      console.log();
    }),
);

/**
 * profiles search - Search user profile with query
 */
const profilesSearchCommand = Command.make(
  'search',
  {
    user: Options.text('user').pipe(
      Options.withDescription('User ID or container tag'),
    ),
    query: Options.text('query').pipe(
      Options.withDescription('Search query to combine with profile'),
    ),
    format: Options.choice('format', ['human', 'json']).pipe(
      Options.optional,
      Options.withDefault('human'),
      Options.withDescription('Output format (default: human)'),
    ),
  },
  ({ user, query, format }) =>
    Effect.gen(function* () {
      const service = yield* SupermemoryService;
      const result = yield* service.getUserProfileWithSearch(user, query);

      if (format === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      // Human format
      console.log('\n' + createHeader(`Profile Search: ${user}`));
      console.log(chalk.gray(`Query: "${query}"`));
      console.log(chalk.gray(`Retrieved: ${formatDate(result.profile.retrievedAt)}\n`));

      const profileTable = new Table({
        head: [chalk.cyan('Profile'), chalk.cyan('Content')],
        wordWrap: true,
        colWidths: [20, 50],
      });

      const staticFacts = result.profile.static.map((f) => `  • ${f}`).join('\n');
      const dynamicFacts = result.profile.dynamic.map((f) => `  • ${f}`).join('\n');

      profileTable.push([chalk.blue('📋 Static'), staticFacts || chalk.gray('(empty)')]);
      profileTable.push([chalk.yellow('🔄 Dynamic'), dynamicFacts || chalk.gray('(empty)')]);

      console.log(profileTable.toString());

      if (result.searchResults && result.searchResults.length > 0) {
        console.log('\n' + chalk.cyan('🔍 Search Results') + '\n');

        const searchTable = new Table({
          head: [chalk.cyan('Score'), chalk.cyan('Content')],
          wordWrap: true,
          colWidths: [15, 55],
        });

        result.searchResults.slice(0, 5).forEach((res) => {
          const content = (res as any).content || (res as any).id || 'N/A';
          const preview = content.substring(0, 50) + (content.length > 50 ? '...' : '');
          const score = (res as any).score ? (res as any).score.toFixed(2) : 'N/A';
          searchTable.push([chalk.green(score), preview]);
        });

        console.log(searchTable.toString());
        console.log(chalk.gray(`\nTiming: ${result.searchTiming}ms`));
      }

      console.log();
    }),
);

/**
 * profiles export - Export user profile
 */
const profilesExportCommand = Command.make(
  'export',
  {
    user: Options.text('user').pipe(
      Options.withDescription('User ID or container tag'),
    ),
    format: Options.choice('format', ['json', 'prompt', 'text']).pipe(
      Options.optional,
      Options.withDefault('json'),
      Options.withDescription('Export format (default: json)'),
    ),
    output: Options.text('output').pipe(
      Options.optional,
      Options.withDescription('Output file path (optional, default: stdout)'),
    ),
  },
  ({ user, format, output }) =>
    Effect.gen(function* () {
      const service = yield* SupermemoryService;
      const profile = yield* service.getUserProfile(user);

      let content = '';

      if (format === 'json') {
        content = JSON.stringify(profile, null, 2);
      } else if (format === 'prompt') {
        content = `ABOUT THE USER:\n`;
        content += `User ID: ${user}\n\n`;

        if (profile.static.length > 0) {
          content += `Stable Facts:\n`;
          profile.static.forEach((fact) => {
            content += `- ${fact}\n`;
          });
        }

        content += `\nCURRENT CONTEXT:\n`;
        if (profile.dynamic.length > 0) {
          profile.dynamic.forEach((fact) => {
            content += `- ${fact}\n`;
          });
        } else {
          content += `(No recent context)\n`;
        }

        content += `\nRetrieved: ${profile.retrievedAt}\n`;
      } else if (format === 'text') {
        content = `User Profile: ${user}\n`;
        content += `Retrieved: ${formatDate(profile.retrievedAt)}\n`;
        content += `${'='.repeat(60)}\n\n`;

        content += `STATIC PROFILE (Stable Facts):\n`;
        content += `${'-'.repeat(60)}\n`;
        if (profile.static.length > 0) {
          profile.static.forEach((fact) => {
            content += `• ${fact}\n`;
          });
        } else {
          content += `(empty)\n`;
        }

        content += `\nDYNAMIC PROFILE (Recent Context):\n`;
        content += `${'-'.repeat(60)}\n`;
        if (profile.dynamic.length > 0) {
          profile.dynamic.forEach((fact) => {
            content += `• ${fact}\n`;
          });
        } else {
          content += `(empty)\n`;
        }
      }

      if (output) {
        yield* Effect.tryPromise({
          try: () => {
            const fs = require('fs').promises;
            return fs.writeFile(output, content, 'utf-8');
          },
          catch: (error) => new Error(`Failed to write file: ${error}`),
        });

        console.log(`\n✓ Profile exported to ${chalk.green(output)}\n`);
      } else {
        console.log('\n' + content + '\n');
      }
    }),
);

/**
 * profiles list - List profiles in container
 */
const profilesListCommand = Command.make(
  'list',
  {
    container: Options.text('container').pipe(
      Options.withDescription('Container tag to query'),
    ),
    limit: Options.integer('limit').pipe(
      Options.optional,
      Options.withDefault(20),
      Options.withDescription('Maximum profiles to show (default: 20)'),
    ),
    format: Options.choice('format', ['human', 'json']).pipe(
      Options.optional,
      Options.withDefault('human'),
      Options.withDescription('Output format (default: human)'),
    ),
  },
  ({ container, limit, format }) =>
    Effect.gen(function* () {
      const service = yield* SupermemoryService;
      const stats = yield* service.getProfileStats(container);

      if (format === 'json') {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      // Human format
      console.log('\n' + createHeader(`Container Profiles: ${container}`));
      console.log(chalk.gray(`Retrieved: ${formatDate(stats.retrievedAt)}\n`));

      const table = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        wordWrap: true,
        colWidths: [30, 40],
      });

      table.push([chalk.blue('Total Users'), chalk.green(stats.totalUsers.toString())]);
      table.push([
        chalk.blue('Average Static Facts'),
        chalk.yellow(stats.avgStaticFacts.toFixed(2)),
      ]);
      table.push([
        chalk.blue('Average Dynamic Facts'),
        chalk.yellow(stats.avgDynamicFacts.toFixed(2)),
      ]);
      table.push([chalk.blue('Max Static Facts'), chalk.cyan(stats.maxStaticFacts.toString())]);
      table.push([
        chalk.blue('Max Dynamic Facts'),
        chalk.cyan(stats.maxDynamicFacts.toString()),
      ]);

      console.log(table.toString());

      if (Object.keys(stats.commonTopics).length > 0) {
        console.log('\n' + chalk.cyan('📊 Common Topics') + '\n');

        const topicTable = new Table({
          head: [chalk.cyan('Topic'), chalk.cyan('Count')],
          wordWrap: true,
          colWidths: [40, 20],
        });

        Object.entries(stats.commonTopics)
          .sort(([, a], [, b]) => (b as any) - (a as any))
          .slice(0, 10)
          .forEach(([topic, count]) => {
            topicTable.push([topic, chalk.green(count.toString())]);
          });

        console.log(topicTable.toString());
      }

      console.log();
    }),
);

/**
 * profiles compare - Compare two user profiles
 */
const profilesCompareCommand = Command.make(
  'compare',
  {
    user1: Options.text('user1').pipe(
      Options.withDescription('First user ID'),
    ),
    user2: Options.text('user2').pipe(
      Options.withDescription('Second user ID'),
    ),
    show: Options.choice('show', ['all', 'similarities', 'differences']).pipe(
      Options.optional,
      Options.withDefault('all'),
      Options.withDescription('What to compare (default: all)'),
    ),
    format: Options.choice('format', ['human', 'json']).pipe(
      Options.optional,
      Options.withDefault('human'),
      Options.withDescription('Output format (default: human)'),
    ),
  },
  ({ user1, user2, show, format }) =>
    Effect.gen(function* () {
      const service = yield* SupermemoryService;
      const comparison = yield* service.compareUserProfiles(user1, user2);

      if (format === 'json') {
        console.log(JSON.stringify(comparison, null, 2));
        return;
      }

      // Human format
      console.log('\n' + createHeader(`Profile Comparison: ${user1} vs ${user2}`));
      console.log();

      const table = new Table({
        head: [chalk.cyan('Category'), chalk.cyan(user1), chalk.cyan(user2)],
        wordWrap: true,
        colWidths: [30, 20, 20],
      });

      if (show === 'all' || show === 'similarities') {
        if (comparison.commonStatic.length > 0) {
          table.push([
            chalk.blue('Common Static Facts'),
            chalk.green(comparison.commonStatic.length.toString()),
            chalk.green(comparison.commonStatic.length.toString()),
          ]);
        }

        if (comparison.commonDynamic.length > 0) {
          table.push([
            chalk.yellow('Common Dynamic Facts'),
            chalk.green(comparison.commonDynamic.length.toString()),
            chalk.green(comparison.commonDynamic.length.toString()),
          ]);
        }
      }

      if (show === 'all' || show === 'differences') {
        table.push([
          chalk.blue('Unique Static Facts'),
          chalk.cyan(comparison.uniqueStatic1.length.toString()),
          chalk.cyan(comparison.uniqueStatic2.length.toString()),
        ]);

        table.push([
          chalk.yellow('Unique Dynamic Facts'),
          chalk.cyan(comparison.uniqueDynamic1.length.toString()),
          chalk.cyan(comparison.uniqueDynamic2.length.toString()),
        ]);
      }

      console.log(table.toString());

      if (show === 'all' || show === 'similarities') {
        if (comparison.commonStatic.length > 0) {
          console.log('\n' + chalk.green('Common Static Facts') + '\n');
          comparison.commonStatic.slice(0, 5).forEach((fact) => {
            console.log(`  • ${fact}`);
          });
          if (comparison.commonStatic.length > 5) {
            console.log(chalk.gray(`  ... and ${comparison.commonStatic.length - 5} more`));
          }
        }

        if (comparison.commonDynamic.length > 0) {
          console.log('\n' + chalk.yellow('Common Dynamic Facts') + '\n');
          comparison.commonDynamic.slice(0, 5).forEach((fact) => {
            console.log(`  • ${fact}`);
          });
          if (comparison.commonDynamic.length > 5) {
            console.log(chalk.gray(`  ... and ${comparison.commonDynamic.length - 5} more`));
          }
        }
      }

      if (show === 'all' || show === 'differences') {
        if (comparison.uniqueStatic1.length > 0) {
          console.log(`\n${chalk.cyan(`Unique to ${user1} (Static)`)} \n`);
          comparison.uniqueStatic1.slice(0, 3).forEach((fact) => {
            console.log(`  • ${fact}`);
          });
          if (comparison.uniqueStatic1.length > 3) {
            console.log(
              chalk.gray(
                `  ... and ${comparison.uniqueStatic1.length - 3} more`
              ),
            );
          }
        }

        if (comparison.uniqueStatic2.length > 0) {
          console.log(`\n${chalk.cyan(`Unique to ${user2} (Static)`)} \n`);
          comparison.uniqueStatic2.slice(0, 3).forEach((fact) => {
            console.log(`  • ${fact}`);
          });
          if (comparison.uniqueStatic2.length > 3) {
            console.log(
              chalk.gray(
                `  ... and ${comparison.uniqueStatic2.length - 3} more`
              ),
            );
          }
        }
      }

      console.log();
    }),
);

/**
 * profiles stats - Show profile statistics
 */
const profilesStatsCommand = Command.make(
  'stats',
  {
    container: Options.text('container').pipe(
      Options.withDescription('Container tag to analyze'),
    ),
    format: Options.choice('format', ['human', 'json']).pipe(
      Options.optional,
      Options.withDefault('human'),
      Options.withDescription('Output format (default: human)'),
    ),
  },
  ({ container, format }) =>
    Effect.gen(function* () {
      const service = yield* SupermemoryService;
      const stats = yield* service.getProfileStats(container);

      if (format === 'json') {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      // Human format
      console.log('\n' + createHeader(`Profile Statistics: ${container}`));
      console.log(chalk.gray(`Retrieved: ${formatDate(stats.retrievedAt)}\n`));

      const table = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        wordWrap: true,
        colWidths: [35, 35],
      });

      table.push([chalk.blue('Total Users'), chalk.green(stats.totalUsers.toString())]);
      table.push([
        chalk.blue('Avg Static Facts per User'),
        chalk.yellow(stats.avgStaticFacts.toFixed(1)),
      ]);
      table.push([
        chalk.blue('Avg Dynamic Facts per User'),
        chalk.yellow(stats.avgDynamicFacts.toFixed(1)),
      ]);
      table.push([chalk.blue('Max Static Facts'), chalk.cyan(stats.maxStaticFacts.toString())]);
      table.push([
        chalk.blue('Max Dynamic Facts'),
        chalk.cyan(stats.maxDynamicFacts.toString()),
      ]);

      console.log(table.toString());

      if (Object.keys(stats.commonTopics).length > 0) {
        console.log('\n' + chalk.cyan('📊 Top 10 Common Topics') + '\n');

        const topicTable = new Table({
          head: [chalk.cyan('Topic'), chalk.cyan('Frequency')],
          wordWrap: true,
          colWidths: [40, 20],
        });

        Object.entries(stats.commonTopics)
          .sort(([, a], [, b]) => (b as any) - (a as any))
          .slice(0, 10)
          .forEach(([topic, count]) => {
            const bar = '█'.repeat(Math.min((count as any) / 2, 10));
            topicTable.push([topic, chalk.green(`${count} ${bar}`)]);
          });

        console.log(topicTable.toString());
      }

      console.log();
    }),
);

/**
 * Create profiles command group with all subcommands
 */
export const profilesCommand = Command.make(
  'profiles',
  {},
  () => Effect.void,
).pipe(
  Command.withSubcommands([
    profilesShowCommand.pipe(Command.withDescription('Show user profile')),
    profilesSearchCommand.pipe(Command.withDescription('Search user profile with query')),
    profilesExportCommand.pipe(Command.withDescription('Export user profile to file')),
    profilesListCommand.pipe(Command.withDescription('List profiles in container')),
    profilesCompareCommand.pipe(Command.withDescription('Compare two user profiles')),
    profilesStatsCommand.pipe(Command.withDescription('Show profile statistics')),
  ]),
);
