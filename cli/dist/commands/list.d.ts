import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
export declare const effectPatternsList: Command.Command<"list", FileSystem.FileSystem | MetricsService | OtelService, never, {
    readonly pathspec: string[];
    readonly verbose: boolean;
}>;
