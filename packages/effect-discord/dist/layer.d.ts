import { FileSystem } from '@effect/platform/FileSystem';
import { CommandExecutor } from '@effect/platform/CommandExecutor';
import { Layer } from 'effect';
import { Discord, DiscordConfig } from './index.js';
export declare const DiscordLive: Layer.Layer<
  Discord,
  never,
  DiscordConfig | FileSystem | CommandExecutor
>;
//# sourceMappingURL=layer.d.ts.map
