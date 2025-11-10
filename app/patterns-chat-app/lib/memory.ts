import { Data, Effect, Schema } from "effect";
import * as Json from "effect-json";
import Supermemory from "supermemory";

// Error types for memory operations
class MemoryError extends Data.TaggedError("MemoryError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
}> {}

class ParseError extends Data.TaggedError("ParseError")<{
  readonly message: string;
}> {}

// User preferences types
export interface UserPreferences {
  selectedModel?: string;
  theme?: "light" | "dark" | "system";
  sidebarCollapsed?: boolean;
  messageCount?: number;
  lastActivity?: string;
  favoriteModels?: readonly string[];
  customInstructions?: string;
}

// Conversation context types
export interface ConversationSummary {
  topic?: string;
  mainPoints?: string[];
  keyTerms?: string[];
  userIntent?: string;
}

export interface ConversationContext {
  chatId: string;
  userId: string;
  summary?: ConversationSummary;
  lastUpdated: string;
  messageCount: number;
  themes: string[];
}

// Conversation metadata and outcomes
export interface ConversationMetadata {
  chatId: string;
  userId: string;
  tags: readonly string[];
  outcome: "solved" | "unsolved" | "partial" | "revisited";
  satisfactionScore?: number; // 1-5
  keyLearnings: readonly string[];
  relatedPatternIds: readonly string[];
  createdAt: string;
  updatedAt: string;
  duration: number; // minutes
}

// User activity analytics
export interface UserActivity {
  userId: string;
  conversationCount: number;
  totalMessages: number;
  averageConversationLength: number;
  topicFrequency: Record<string, number>;
  preferredModels: readonly string[];
  peakActivityHours: readonly number[];
  lastActivityDate: string;
  expertiseLevel: "beginner" | "intermediate" | "advanced";
  topicsExplored: readonly string[];
  patternPreference: readonly string[];
}

// Schema for type-safe JSON parsing
const UserPreferencesSchema: Schema.Schema<UserPreferences> = Schema.Struct({
  selectedModel: Schema.optional(Schema.String),
  theme: Schema.optional(
    Schema.Union(
      Schema.Literal("light"),
      Schema.Literal("dark"),
      Schema.Literal("system")
    )
  ),
  sidebarCollapsed: Schema.optional(Schema.Boolean),
  messageCount: Schema.optional(Schema.Number),
  lastActivity: Schema.optional(Schema.String),
  favoriteModels: Schema.optional(Schema.Array(Schema.String)),
  customInstructions: Schema.optional(Schema.String),
}) as Schema.Schema<UserPreferences>;

const ConversationSummarySchema = Schema.Struct({
  topic: Schema.optional(Schema.String),
  mainPoints: Schema.optional(Schema.Array(Schema.String)),
  keyTerms: Schema.optional(Schema.Array(Schema.String)),
  userIntent: Schema.optional(Schema.String),
});

const ConversationContextSchema = Schema.Struct({
  chatId: Schema.String,
  userId: Schema.String,
  summary: Schema.optional(ConversationSummarySchema),
  lastUpdated: Schema.String,
  messageCount: Schema.Number,
  themes: Schema.Array(Schema.String),
});

const ConversationMetadataSchema = Schema.Struct({
  chatId: Schema.String,
  userId: Schema.String,
  tags: Schema.Array(Schema.String),
  outcome: Schema.Union(
    Schema.Literal("solved"),
    Schema.Literal("unsolved"),
    Schema.Literal("partial"),
    Schema.Literal("revisited")
  ),
  satisfactionScore: Schema.optional(Schema.Number),
  keyLearnings: Schema.Array(Schema.String),
  relatedPatternIds: Schema.Array(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
  duration: Schema.Number,
});

const UserActivitySchema = Schema.Struct({
  userId: Schema.String,
  conversationCount: Schema.Number,
  totalMessages: Schema.Number,
  averageConversationLength: Schema.Number,
  topicFrequency: Schema.Record({
    key: Schema.String,
    value: Schema.Number,
  }),
  preferredModels: Schema.Array(Schema.String),
  peakActivityHours: Schema.Array(Schema.Number),
  lastActivityDate: Schema.String,
  expertiseLevel: Schema.Union(
    Schema.Literal("beginner"),
    Schema.Literal("intermediate"),
    Schema.Literal("advanced")
  ),
  topicsExplored: Schema.Array(Schema.String),
  patternPreference: Schema.Array(Schema.String),
});

// Memory service using Supermemory API
class UserMemoryService {
  private client: Supermemory;

  constructor() {
    const apiKey = process.env.SUPERMEMORY_API_KEY;
    if (!apiKey) {
      throw new Error(
        "SUPERMEMORY_API_KEY environment variable is required. Set it in your .env.local file."
      );
    }
    this.client = new Supermemory({
      apiKey,
    });
  }

  private getUserKey = (userId: string, key: string) => `user:${userId}:${key}`;
  private getPreferencesKey = (userId: string) =>
    this.getUserKey(userId, "preferences");
  private getConversationKey = (userId: string, chatId: string) =>
    this.getUserKey(userId, `chat:${chatId}`);

  // User preferences
  async getPreferences(userId: string): Promise<UserPreferences> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const key = this.getPreferencesKey(userId);

          const memories = await this.client.search.memories({
            q: key,
            limit: 1,
          });

          if (memories.results && memories.results.length > 0) {
            const memory = memories.results[0];

            return await Effect.runPromise(
              (
                Json.parse(UserPreferencesSchema as any, memory.memory) as any
              ).pipe(
                Effect.map((data: unknown) => data as UserPreferences),
                Effect.catchAll(() => Effect.succeed({} as UserPreferences))
              )
            );
          }

          return {} as UserPreferences;
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to get user preferences",
            cause: error,
          }),
      }).pipe(Effect.catchAll(() => Effect.succeed({} as UserPreferences)))
    ) as Promise<UserPreferences>;
  }

  async setPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const key = this.getPreferencesKey(userId);
          const existing = await this.getPreferences(userId);
          const updated = { ...existing, ...preferences };

          await this.client.memories.add({
            content: JSON.stringify(updated),
            metadata: {
              type: "user_preferences",
              userId,
              key,
              timestamp: new Date().toISOString(),
            },
          });
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to set user preferences",
            cause: error,
          }),
      }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            console.warn("Failed to set user preferences:", error);
          })
        )
      )
    );
  }

  // Conversation memory
  async getConversationMemory(userId: string, chatId: string): Promise<any> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const key = this.getConversationKey(userId, chatId);
          const memories = await this.client.search.memories({
            q: key,
            limit: 1,
          });

          if (memories.results && memories.results.length > 0) {
            const memory = memories.results[0];
            return await Effect.runPromise(
              (Json.parse(Schema.Unknown as any, memory.memory) as any).pipe(
                Effect.catchAll(() => Effect.succeed(null))
              )
            );
          }

          return null;
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to get conversation memory",
            cause: error,
          }),
      }).pipe(Effect.catchAll(() => Effect.succeed(null)))
    );
  }

  async setConversationMemory(
    userId: string,
    chatId: string,
    memoryData: any
  ): Promise<void> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const key = this.getConversationKey(userId, chatId);

          await this.client.memories.add({
            content: JSON.stringify(memoryData),
            metadata: {
              type: "conversation_memory",
              userId,
              chatId,
              key,
              timestamp: new Date().toISOString(),
            },
          });
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to set conversation memory",
            cause: error,
          }),
      }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            console.warn("Failed to set conversation memory:", error);
          })
        )
      )
    );
  }

  // Generic user data storage
  async getUserData(userId: string, key: string): Promise<any> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const fullKey = this.getUserKey(userId, key);
          const memories = await this.client.search.memories({
            q: fullKey,
            limit: 1,
          });

          if (memories.results && memories.results.length > 0) {
            const memory = memories.results[0];

            return await Effect.runPromise(
              (Json.parse(Schema.Unknown as any, memory.memory) as any).pipe(
                Effect.catchAll(() => Effect.succeed(null))
              )
            );
          }

          return null;
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to get user data",
            cause: error,
          }),
      }).pipe(Effect.catchAll(() => Effect.succeed(null)))
    );
  }

  async setUserData(userId: string, key: string, data: any): Promise<void> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const fullKey = this.getUserKey(userId, key);

          await this.client.memories.add({
            content: JSON.stringify(data),
            metadata: {
              type: "user_data",
              userId,
              key: fullKey,
              timestamp: new Date().toISOString(),
            },
          });
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to set user data",
            cause: error,
          }),
      }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            console.warn("Failed to set user data:", error);
          })
        )
      )
    );
  }

  async deleteUserData(userId: string, key: string): Promise<boolean> {
    return Effect.runPromise(
      Effect.sync(() => {
        console.warn("Delete not directly supported in Supermemory");
        return false;
      })
    );
  }

  async clearUserData(userId: string): Promise<void> {
    return Effect.runPromise(
      Effect.sync(() => {
        console.warn("Bulk clear not directly supported in Supermemory");
      })
    );
  }

  // Conversation metadata
  private getConversationMetadataKey = (userId: string, chatId: string) =>
    this.getUserKey(userId, `metadata:${chatId}`);

  async getConversationMetadata(
    userId: string,
    chatId: string
  ): Promise<ConversationMetadata | null> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const key = this.getConversationMetadataKey(userId, chatId);
          const memories = await this.client.search.memories({
            q: key,
            limit: 1,
          });

          if (memories.results && memories.results.length > 0) {
            const memory = memories.results[0];

            return await Effect.runPromise(
              (
                Json.parse(
                  ConversationMetadataSchema as any,
                  memory.memory
                ) as any
              ).pipe(
                Effect.map(
                  (data: unknown) => data as ConversationMetadata | null
                ),
                Effect.catchAll(() => Effect.succeed(null))
              )
            );
          }
          return null;
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to get conversation metadata",
            cause: error,
          }),
      }).pipe(Effect.catchAll(() => Effect.succeed(null)))
    ) as Promise<ConversationMetadata | null>;
  }

  async setConversationMetadata(
    userId: string,
    chatId: string,
    metadata: ConversationMetadata
  ): Promise<void> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const key = this.getConversationMetadataKey(userId, chatId);

          await this.client.memories.add({
            content: JSON.stringify(metadata),
            metadata: {
              type: "conversation_metadata",
              userId,
              chatId,
              key,
              timestamp: new Date().toISOString(),
            },
          });
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to set conversation metadata",
            cause: error,
          }),
      }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            console.warn("Failed to set conversation metadata:", error);
          })
        )
      )
    );
  }

  // User activity
  private getUserActivityKey = (userId: string) =>
    this.getUserKey(userId, "activity");

  async getUserActivity(userId: string): Promise<UserActivity | null> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const key = this.getUserActivityKey(userId);
          const memories = await this.client.search.memories({
            q: key,
            limit: 1,
          });

          if (memories.results && memories.results.length > 0) {
            const memory = memories.results[0];

            return await Effect.runPromise(
              (
                Json.parse(UserActivitySchema as any, memory.memory) as any
              ).pipe(
                Effect.map((data: unknown) => data as UserActivity | null),
                Effect.catchAll(() => Effect.succeed(null))
              )
            );
          }
          return null;
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to get user activity",
            cause: error,
          }),
      }).pipe(Effect.catchAll(() => Effect.succeed(null)))
    ) as Promise<UserActivity | null>;
  }

  async setUserActivity(userId: string, activity: UserActivity): Promise<void> {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const key = this.getUserActivityKey(userId);

          await this.client.memories.add({
            content: JSON.stringify(activity),
            metadata: {
              type: "user_activity",
              userId,
              key,
              timestamp: new Date().toISOString(),
            },
          });
        },
        catch: (error) =>
          new MemoryError({
            message: "Failed to set user activity",
            cause: error,
          }),
      }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            console.warn("Failed to set user activity:", error);
          })
        )
      )
    );
  }
}

// Singleton instance
export const userMemoryService = new UserMemoryService();

// Helper functions for common operations
export const getUserPreferences = (userId: string) =>
  userMemoryService.getPreferences(userId);

export const setUserPreferences = (
  userId: string,
  preferences: Partial<UserPreferences>
) => userMemoryService.setPreferences(userId, preferences);

export const rememberModelChoice = (userId: string, modelId: string) =>
  setUserPreferences(userId, {
    selectedModel: modelId,
    lastActivity: new Date().toISOString(),
  });

export const getLastModelChoice = (userId: string) =>
  getUserPreferences(userId).then((prefs) => prefs.selectedModel);

// Conversation context helpers
export const getConversationContext = (userId: string, chatId: string) =>
  userMemoryService.getConversationMemory(userId, chatId);

export const setConversationContext = (
  userId: string,
  chatId: string,
  context: ConversationContext
) => userMemoryService.setConversationMemory(userId, chatId, context);

export const extractConversationSummary = (
  messages: any[]
): ConversationSummary => {
  if (messages.length === 0) {
    return {};
  }

  // Extract key terms from recent messages
  const recentMessages = messages
    .slice(-10)
    .map((m: any) =>
      typeof m.parts === "string" ? m.parts : m.parts?.[0]?.text || ""
    );

  const allText = recentMessages.join(" ");
  const words = allText
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const keyTerms = [...new Set(words)].slice(0, 10);

  // Extract main points from user messages (every few messages)
  const mainPoints: string[] = [];
  for (
    let i = messages.length - 1;
    i >= Math.max(0, messages.length - 6);
    i--
  ) {
    const message = messages[i];
    if (message.role === "user" && message.parts) {
      const text =
        typeof message.parts === "string"
          ? message.parts
          : message.parts[0]?.text;
      if (text && text.length > 10) {
        mainPoints.push(text.substring(0, 100));
      }
    }
  }

  // Infer user intent from recent messages
  const lastUserMessage =
    messages.findLast((m: any) => m.role === "user")?.parts?.[0]?.text || "";
  const userIntent = lastUserMessage.substring(0, 50) || undefined;

  // Infer topic from overall conversation
  const topic = keyTerms.length > 0 ? keyTerms[0] : undefined;

  return {
    topic,
    mainPoints: mainPoints.reverse(),
    keyTerms,
    userIntent,
  };
};

export const updateConversationContext = async (
  userId: string,
  chatId: string,
  messages: any[]
): Promise<void> => {
  const summary = extractConversationSummary(messages);
  const context: ConversationContext = {
    chatId,
    userId,
    summary,
    lastUpdated: new Date().toISOString(),
    messageCount: messages.length,
    themes: summary.keyTerms || [],
  };

  await setConversationContext(userId, chatId, context);
};

// Conversation metadata helpers
export const getConversationMetadata = (userId: string, chatId: string) =>
  userMemoryService.getConversationMetadata(userId, chatId);

export const setConversationMetadata = (
  userId: string,
  chatId: string,
  metadata: ConversationMetadata
) => userMemoryService.setConversationMetadata(userId, chatId, metadata);

export const createConversationMetadata = (
  userId: string,
  chatId: string,
  options: {
    tags?: string[];
    outcome?: ConversationMetadata["outcome"];
    keyLearnings?: string[];
    relatedPatternIds?: string[];
    satisfactionScore?: number;
    duration?: number;
  } = {}
): ConversationMetadata => {
  const now = new Date().toISOString();
  return {
    chatId,
    userId,
    tags: (options.tags || []) as readonly string[],
    outcome: options.outcome || "partial",
    satisfactionScore: options.satisfactionScore,
    keyLearnings: (options.keyLearnings || []) as readonly string[],
    relatedPatternIds: (options.relatedPatternIds || []) as readonly string[],
    createdAt: now,
    updatedAt: now,
    duration: options.duration || 0,
  };
};

// User activity helpers
export const getUserActivity = (userId: string) =>
  userMemoryService.getUserActivity(userId);

export const setUserActivity = (userId: string, activity: UserActivity) =>
  userMemoryService.setUserActivity(userId, activity);

export const initializeUserActivity = (userId: string): UserActivity => {
  return {
    userId,
    conversationCount: 0,
    totalMessages: 0,
    averageConversationLength: 0,
    topicFrequency: {},
    preferredModels: [],
    peakActivityHours: [],
    lastActivityDate: new Date().toISOString(),
    expertiseLevel: "beginner",
    topicsExplored: [],
    patternPreference: [],
  } as const;
};

export const updateUserActivity = async (
  userId: string,
  updates: Partial<UserActivity>
): Promise<void> => {
  const existing = await getUserActivity(userId);
  const activity = existing || initializeUserActivity(userId);
  const updated = {
    ...activity,
    ...updates,
    userId,
    lastActivityDate: new Date().toISOString(),
  };
  await setUserActivity(userId, updated);
};

export const recordTopicInteraction = async (
  userId: string,
  topic: string
): Promise<void> => {
  const activity = await getUserActivity(userId);
  const current = activity || initializeUserActivity(userId);

  // Update topic frequency
  const topicFrequency = { ...current.topicFrequency };
  topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;

  // Add to explored topics if new
  const topicsExplored = Array.from(
    new Set([...current.topicsExplored, topic])
  );

  // Detect expertise level based on topic diversity and conversation count
  let expertiseLevel: "beginner" | "intermediate" | "advanced" = "beginner";
  if (current.conversationCount > 20 && topicsExplored.length > 10) {
    expertiseLevel = "advanced";
  } else if (current.conversationCount > 10 && topicsExplored.length > 5) {
    expertiseLevel = "intermediate";
  }

  await updateUserActivity(userId, {
    topicFrequency,
    topicsExplored,
    expertiseLevel,
  });
};

export const recordActivityHour = async (userId: string): Promise<void> => {
  const activity = await getUserActivity(userId);
  const current = activity || initializeUserActivity(userId);

  const now = new Date();
  const hour = now.getHours();

  // Track peak activity hours
  const peakActivityHours = Array.from(
    new Set([...current.peakActivityHours, hour])
  );

  // Keep only top 5 peak hours
  if (peakActivityHours.length > 5) {
    // In a real implementation, would track frequencies and keep top 5
    peakActivityHours.pop();
  }

  await updateUserActivity(userId, { peakActivityHours });
};

// Auto-tag conversation based on content
export const autoTagConversation = (messages: any[]): string[] => {
  const tags = new Set<string>();

  // Extract all text from messages
  const allText = messages
    .map((m: any) => {
      if (typeof m.parts === "string") return m.parts;
      return m.parts?.[0]?.text || "";
    })
    .join(" ")
    .toLowerCase();

  // Pattern-based tagging (keywords and phrases)
  const patterns: { [key: string]: RegExp } = {
    "effect-ts": /\b(effect|effect-ts|effectts)\b/i,
    "error-handling": /\b(error|catch|handle|exception|try)\b/i,
    concurrency: /\b(parallel|concurrent|race|fork|fiber)\b/i,
    "async-await": /\b(async|await|promise|effect)\b/i,
    validation: /\b(valid|schema|parse|zod|effect-schema)\b/i,
    typescript: /\b(typescript|ts|type|interface)\b/i,
    performance: /\b(performance|optimize|speed|slow|fast)\b/i,
    testing: /\b(test|jest|vitest|unit|integration)\b/i,
    database: /\b(database|db|sql|query|prisma|drizzle)\b/i,
    "api-design": /\b(api|endpoint|rest|graphql|route)\b/i,
    "state-management": /\b(state|redux|context|provider|store)\b/i,
    react: /\b(react|jsx|component|hook|useState)\b/i,
    security: /\b(security|auth|token|password|encrypt)\b/i,
    documentation: /\b(doc|example|guide|tutorial|readme)\b/i,
  };

  for (const [tag, pattern] of Object.entries(patterns)) {
    if (pattern.test(allText)) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
};

// Detect conversation outcome from final message
export const detectConversationOutcome = (
  messages: any[]
): ConversationMetadata["outcome"] => {
  if (messages.length === 0) return "partial";

  const lastMessage = messages[messages.length - 1]?.parts?.[0]?.text || "";
  const lowerText = lastMessage.toLowerCase();

  // Check for solved indicators
  if (
    /\b(solved|fixed|working|thanks|perfect|great|helped|thank you)\b/.test(
      lowerText
    )
  ) {
    return "solved";
  }

  // Check for revisited indicators
  if (/\b(still|again|another|next|continue)\b/.test(lowerText)) {
    return "revisited";
  }

  // Check for unsolved indicators
  if (
    /\b(still stuck|not working|doesn't work|error|failed)\b/.test(lowerText)
  ) {
    return "unsolved";
  }

  return "partial";
};

// Legacy Effect-based exports for compatibility
export const UserMemoryLive = {}; // Placeholder for now
