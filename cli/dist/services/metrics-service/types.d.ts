import { Data, DateTime } from "effect";
export declare class LLMUsage extends Data.Class<{
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    totalTokens: number;
    estimatedCost: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
}> {
}
export declare class MetricsData extends Data.Class<{
    command: string;
    startTime: DateTime.DateTime;
    endTime?: DateTime.DateTime;
    duration?: number;
    llmUsage?: LLMUsage;
    error?: {
        type: string;
        message: string;
        stack?: string;
    };
    success: boolean;
    runId?: string;
    promptLength?: number;
    responseLength?: number;
    inputTokens?: number;
    outputTokens?: number;
    modelParameters?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
    };
    environment: {
        nodeVersion: string;
        platform: string;
        cwd: string;
    };
}> {
}
export declare class MetricsSummary extends Data.Class<{
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
    totalTokens: number;
    totalCost: number;
    averageDuration: number;
    providerStats: Record<string, {
        commands: number;
        tokens: number;
        cost: number;
    }>;
    modelStats: Record<string, {
        commands: number;
        tokens: number;
        cost: number;
    }>;
}> {
}
export declare class MetricsHistory extends Data.Class<{
    runs: MetricsData[];
    summary: MetricsSummary;
}> {
}
