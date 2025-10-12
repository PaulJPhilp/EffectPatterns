/**
 * Chunking Service for Discord Q&A Analyzer
 *
 * Implements smart chunking that respects Q&A pairs and conversation threads.
 * Uses a multi-signal heuristic to identify related messages and keep them together.
 */

import { Effect } from "effect";
import { ChunkingError, InvalidChunkSizeError } from "./errors.js";

// ============================================================================
// Types
// ============================================================================

// Message type matching the schema structure
interface Message {
    seqId: number;
    id: string;
    content: string;
    author: {
        id: string;
        name: string;
    };
    timestamp: string;
}

/**
 * Message with metadata for chunking analysis
 */
interface MessageWithMetadata {
    message: Message;
    isLikelyQuestion: boolean;
    isLikelyAnswer: boolean;
    relationshipScore: number;
}

/**
 * Configuration for chunking strategy
 */
export interface ChunkingConfig {
    readonly targetSize: number;
    readonly useSmartChunking: boolean;
    readonly minRelationshipScore: number;
    readonly maxChunkOverflow: number; // How much over target size is acceptable
}

/**
 * Chunking result with metadata
 */
export interface ChunkingResult {
    readonly chunks: readonly Message[][];
    readonly totalMessages: number;
    readonly chunkCount: number;
    readonly averageChunkSize: number;
    readonly strategy: "smart" | "simple";
}

// ============================================================================
// Chunking Service Implementation
// ============================================================================

/**
 * Analyze a message to determine if it's likely a question or answer
 */
const analyzeMessage = (msg: Message): MessageWithMetadata => {
    const content = String(msg.content);

    return {
        message: msg,
        isLikelyQuestion:
            content.includes("?") ||
            /how (do|to|can)|is there|what('s| is)|can i|why (does|is|are)/i.test(
                content,
            ),
        isLikelyAnswer:
            content.length > 100 || // Longer responses
            content.includes("```") || // Code examples
            /^(yes|no|you can|try|use|the answer|check out)/i.test(content),
        relationshipScore: 0,
    };
};

/**
 * Calculate relationship score between two consecutive messages
 *
 * Signals used (in priority order):
 * 1. Sequential seqId (100 points for consecutive, 50 for +2)
 * 2. Q&A author pattern (50 points for different author answering)
 * 3. Same author continuation (30 points)
 * 4. Timestamp proximity (25 points if <5min, 10 if <15min, -20 if >30min)
 */
const calculateRelationshipScore = (
    current: MessageWithMetadata,
    previous: MessageWithMetadata,
): number => {
    let score = 0;

    // Signal 1: Sequential seqId (strongest signal)
    if (current.message.seqId === previous.message.seqId + 1) {
        score += 100;
    } else if (current.message.seqId === previous.message.seqId + 2) {
        score += 50; // Allow for one intermediate message
    }

    // Signal 2: Q&A author pattern
    if (previous.isLikelyQuestion && current.isLikelyAnswer) {
        if (current.message.author.id !== previous.message.author.id) {
            score += 50; // Different author answering = strong relationship
        }
    }

    // Signal 3: Same author continuing
    if (current.message.author.id === previous.message.author.id) {
        score += 30; // Likely a continuation or follow-up
    }

    // Signal 4: Timestamp proximity
    const prevTime = new Date(previous.message.timestamp).getTime();
    const currTime = new Date(current.message.timestamp).getTime();
    const minutesDiff = (currTime - prevTime) / (1000 * 60);

    if (minutesDiff <= 5) {
        score += 25; // Very close in time
    } else if (minutesDiff <= 15) {
        score += 10; // Moderately close
    } else if (minutesDiff > 30) {
        score -= 20; // Likely different conversation
    }

    return score;
};

/**
 * Smart chunking that respects Q&A pairs and conversation threads
 */
const smartChunk = (
    messages: Message[],
    config: ChunkingConfig,
): Message[][] => {
    if (messages.length === 0) return [];
    if (messages.length <= config.targetSize) return [messages];

    const analyzed = messages.map(analyzeMessage);
    const chunks: Message[][] = [];
    let currentChunk: Message[] = [analyzed[0].message];

    for (let i = 1; i < analyzed.length; i++) {
        const relationshipScore = calculateRelationshipScore(
            analyzed[i],
            analyzed[i - 1],
        );

        analyzed[i].relationshipScore = relationshipScore;

        // Decision: Should we break the chunk here?
        const atTargetSize = currentChunk.length >= config.targetSize;
        const lowRelationship = relationshipScore < config.minRelationshipScore;
        const shouldBreakChunk = atTargetSize && lowRelationship;

        // Way over target and still low relationship - force break
        const maxOverflow = config.targetSize * config.maxChunkOverflow;
        const wayOverSize = currentChunk.length > maxOverflow;
        const forceBreak = wayOverSize && relationshipScore < 50;

        if (shouldBreakChunk || forceBreak) {
            // Start new chunk
            chunks.push(currentChunk);
            currentChunk = [analyzed[i].message];
        } else {
            // Add to current chunk (keeping pairs together even if over target)
            currentChunk.push(analyzed[i].message);
        }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
};

/**
 * Simple fixed-size chunking (fallback)
 */
const simpleChunk = (messages: Message[], chunkSize: number): Message[][] => {
    const chunks: Message[][] = [];
    for (let i = 0; i < messages.length; i += chunkSize) {
        chunks.push(messages.slice(i, i + chunkSize));
    }
    return chunks;
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Chunk messages using the configured strategy
 */
export const chunkMessages = (
    messages: Message[],
    config: ChunkingConfig,
): Effect.Effect<ChunkingResult, ChunkingError | InvalidChunkSizeError> =>
    Effect.gen(function* () {
        // Validate chunk size
        if (config.targetSize < 1 || config.targetSize > 500) {
            return yield* Effect.fail(
                new InvalidChunkSizeError({
                    size: config.targetSize,
                    min: 1,
                    max: 500,
                }),
            );
        }

        // Validate messages
        if (messages.length === 0) {
            return yield* Effect.fail(
                new ChunkingError({
                    reason: "No messages to chunk",
                    messageCount: 0,
                }),
            );
        }

        // Perform chunking
        const chunks = config.useSmartChunking
            ? smartChunk(messages, config)
            : simpleChunk(messages, config.targetSize);

        // Calculate statistics
        const result: ChunkingResult = {
            chunks,
            totalMessages: messages.length,
            chunkCount: chunks.length,
            averageChunkSize: Math.round(messages.length / chunks.length),
            strategy: config.useSmartChunking ? "smart" : "simple",
        };

        // Log chunking results
        yield* Effect.log({
            message: "Chunking complete",
            totalMessages: result.totalMessages,
            chunkCount: result.chunkCount,
            averageChunkSize: result.averageChunkSize,
            strategy: result.strategy,
            chunkSizes: chunks.map((c) => c.length),
        });

        return result;
    });

/**
 * Convenience function: chunk messages with default configuration
 */
export const chunkMessagesDefault = (
    messages: Message[],
): Effect.Effect<ChunkingResult, ChunkingError | InvalidChunkSizeError> =>
    chunkMessages(messages, {
        targetSize: 50,
        useSmartChunking: true,
        minRelationshipScore: 75,
        maxChunkOverflow: 1.5,
    });

/**
 * Convenience function: chunk messages with simple fixed-size strategy
 */
export const chunkMessagesSimple = (
    messages: Message[],
    chunkSize: number,
): Effect.Effect<ChunkingResult, ChunkingError | InvalidChunkSizeError> =>
    chunkMessages(messages, {
        targetSize: chunkSize,
        useSmartChunking: false,
        minRelationshipScore: 0,
        maxChunkOverflow: 1.0,
    });
