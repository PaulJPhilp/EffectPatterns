import { Schema } from "effect";
export declare const RunInfoSchema: Schema.Struct<{
    name: typeof Schema.String;
    directory: typeof Schema.String;
    timestamp: typeof Schema.Date;
    number: typeof Schema.Number;
}>;
export interface RunInfo extends Schema.Schema.Type<typeof RunInfoSchema> {
}
export declare const RunConfigSchema: Schema.Struct<{
    namePrefix: Schema.optional<typeof Schema.String>;
    includeTimestamp: Schema.optional<typeof Schema.Boolean>;
    includeNumber: Schema.optional<typeof Schema.Boolean>;
}>;
export interface RunConfig extends Schema.Schema.Type<typeof RunConfigSchema> {
}
export declare const RunStateSchema: Schema.Struct<{
    lastRunNumber: typeof Schema.Number;
}>;
export interface RunState extends Schema.Schema.Type<typeof RunStateSchema> {
}
export interface RunDirectoryStructure {
    readonly root: string;
    readonly outputs: string;
    readonly logs: string;
    readonly metrics: string;
    readonly metadata: string;
}
export declare const StandardFiles: {
    readonly response: "response.md";
    readonly metrics: "metrics.jsonl";
    readonly log: "log.txt";
    readonly prompt: "prompt.mdx";
    readonly runInfo: "run-info.json";
};
export interface RunState {
    readonly lastRunNumber: number;
}
export interface RunInfo {
    readonly name: string;
    readonly directory: string;
    readonly timestamp: Date;
    readonly number: number;
}
