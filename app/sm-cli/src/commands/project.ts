/**
 * Project Management Commands
 */

import { Effect } from "effect";
import { Command, Options } from "@effect/cli";
import { loadConfig, saveConfig } from "../services/index.js";
import {
  displayOutput,
  displaySuccess,
  displayJson,
  displayLines,
  createHeader,
  createInfoCard,
  createSuccess,
  createBadge,
} from "../helpers/index.js";
import type { OutputOptions } from '../types.js';

const formatOption = Options.choice('format', ['human', 'json'] as const)
  .pipe(Options.withDefault('human' as const));

/**
 * Set active project
 */
export const projectSet = Command.make(
  'set',
  {
    projectName: Options.text('projectName'),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      config.activeProject = options.projectName;

      yield* saveConfig(config);

      if (options.format === 'json') {
        yield* displayJson({ success: true, project: options.projectName });
      } else {
        const message =
          createHeader('Project Changed', `Now using: ${options.projectName}`) +
          '\n' +
          createInfoCard({
            'New Project': options.projectName,
            Status: 'Active ✓',
          });
        yield* Effect.sync(() => console.log(message));
      }
    }),
);

/**
 * List projects (stub - can be enhanced)
 */
export const projectList = Command.make(
  'list',
  {
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const projects = [
        { name: 'effect-patterns', description: 'Effect Patterns Library' },
        { name: 'default', description: 'Default Project' },
      ];

      if (options.format === 'json') {
        yield* displayJson(projects);
      } else {
        const lines = [
          'Available Projects:',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          ...projects.flatMap(project => [
            `  • ${project.name}`,
            `    ${project.description}`,
          ]),
        ];
        yield* displayLines(lines, 'info');
      }
    }),
);

/**
 * Show current project info
 */
export const projectInfo = Command.make(
  'info',
  {
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;

      const info = {
        activeProject: config.activeProject,
        apiKeyConfigured: !!config.apiKey,
        supermemoryUrl: config.supermemoryUrl,
        lastUpload: config.lastUpload || 'Never',
        uploadedPatterns: config.uploadedPatterns.length,
      };

      if (options.format === 'json') {
        yield* displayJson(info);
      } else {
        const message =
          createHeader('Project Information', 'Active project configuration') +
          '\n' +
          createInfoCard({
            'Project': info.activeProject || '(not set)',
            'API Key': info.apiKeyConfigured ? 'Configured ✓' : 'Not configured',
            'Supermemory': info.supermemoryUrl,
            'Last Upload': info.lastUpload,
            'Patterns': info.uploadedPatterns.toString(),
          });
        yield* Effect.sync(() => console.log(message));
      }
    }),
);

/**
 * Project command group
 */
export const projectCommand = Command.make(
  'project',
  {},
  () => Effect.void,
).pipe(
  Command.withSubcommands([
    projectSet.pipe(Command.withDescription('Set active project')),
    projectList.pipe(Command.withDescription('List available projects')),
    projectInfo.pipe(Command.withDescription('Show current project information')),
  ]),
);
