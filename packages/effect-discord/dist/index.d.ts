import { Context, Data, Effect, Secret } from 'effect';
declare const DiscordConfig_base: Context.TagClass<
  DiscordConfig,
  'DiscordConfig',
  {
    readonly botToken: Secret.Secret;
    readonly exporterPath: string;
  }
>;
export declare class DiscordConfig extends DiscordConfig_base {}
declare const DiscordExportError_base: new <A extends Record<string, any> = {}>(
  args: import('effect/Types').Equals<A, {}> extends true
    ? undefined
    : { readonly [P in keyof A as P extends '_tag' ? never : P]: A[P] },
) => import('effect/Cause').YieldableError & {
  readonly _tag: 'DiscordExportError';
} & Readonly<A>;
export declare class DiscordExportError extends DiscordExportError_base<{
  readonly reason: 'CommandFailed' | 'FileNotFound' | 'JsonParseError';
  readonly cause?: unknown;
}> {}
export interface DiscordMessage {
  readonly id: string;
  readonly content: string;
  readonly author: {
    readonly id: string;
    readonly name: string;
  };
}
export declare const DiscordMessage: Data.Case.Constructor<
  DiscordMessage,
  never
>;
export interface ChannelExport {
  readonly messages: readonly DiscordMessage[];
}
export declare const ChannelExport: Data.Case.Constructor<ChannelExport, never>;
declare const Discord_base: Context.TagClass<
  Discord,
  'Discord',
  {
    readonly exportChannel: (
      channelId: string,
    ) => Effect.Effect<ChannelExport, DiscordExportError, never>;
  }
>;
export declare class Discord extends Discord_base {}
//# sourceMappingURL=index.d.ts.map
