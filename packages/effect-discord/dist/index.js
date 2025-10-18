import { Context, Data } from "effect";
// 1. NEW: Configuration service for secrets and settings.
export class DiscordConfig extends Context.Tag("DiscordConfig")() {
}
// 2. Define a tagged error for known failures during the export process.
export class DiscordExportError extends Data.TaggedError("DiscordExportError") {
}
export const DiscordMessage = Data.case();
export const ChannelExport = Data.case();
// 5. Define the Discord service interface using Context.Tag.
// This is the public API that consumers of the library will use.
export class Discord extends Context.Tag("Discord")() {
}
//# sourceMappingURL=index.js.map