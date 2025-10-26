import { Context, Data, type Effect, type Secret } from 'effect';

// 1. NEW: Configuration service for secrets and settings.
export class DiscordConfig extends Context.Tag('DiscordConfig')<
  DiscordConfig,
  {
    readonly botToken: Secret.Secret;
    // We can add the path to the exporter CLI here for configurability
    readonly exporterPath: string;
  }
>() {}

// 2. Define a tagged error for known failures during the export process.
export class DiscordExportError extends Data.TaggedError('DiscordExportError')<{
  readonly reason: 'CommandFailed' | 'FileNotFound' | 'JsonParseError';
  readonly cause?: unknown;
}> {}

// 3. Define the data model for a single Discord message.
// This should match the structure of the JSON output from DiscordChatExporter.
export type DiscordMessage = {
  readonly id: string;
  readonly content: string;
  readonly author: {
    readonly id: string;
    readonly name: string;
  };
  // ... add other relevant fields as needed
};
export const DiscordMessage = Data.case<DiscordMessage>();

// 4. Define the data model for the entire channel export.
export type ChannelExport = {
  readonly messages: readonly DiscordMessage[];
};
export const ChannelExport = Data.case<ChannelExport>();

// 5. Define the Discord service interface using Context.Tag.
// This is the public API that consumers of the library will use.
export class Discord extends Context.Tag('Discord')<
  Discord,
  {
    readonly exportChannel: (
      channelId: string,
    ) => Effect.Effect<ChannelExport, DiscordExportError, never>;
  }
>() {}
