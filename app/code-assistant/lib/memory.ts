import Supermemory from "supermemory";
import * as Json from "effect-json";
import { Schema, Effect } from "effect";

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

// Schema for type-safe JSON parsing
const UserPreferencesSchema = Schema.Struct({
  selectedModel: Schema.optional(Schema.String),
  theme: Schema.optional(Schema.Union(Schema.Literal("light"), Schema.Literal("dark"), Schema.Literal("system"))),
  sidebarCollapsed: Schema.optional(Schema.Boolean),
  messageCount: Schema.optional(Schema.Number),
  lastActivity: Schema.optional(Schema.String),
  favoriteModels: Schema.optional(Schema.Array(Schema.String)),
  customInstructions: Schema.optional(Schema.String),
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
  private getPreferencesKey = (userId: string) => this.getUserKey(userId, "preferences");
  private getConversationKey = (userId: string, chatId: string) => this.getUserKey(userId, `chat:${chatId}`);

  // User preferences
  async getPreferences(userId: string): Promise<UserPreferences> {
    try {
      const key = this.getPreferencesKey(userId);

      const memories = await this.client.search.memories({
        q: key,
        limit: 1
      });

      if (memories.results && memories.results.length > 0) {
        const memory = memories.results[0];
        try {
          // Use effect-json for safe parsing with error handling
          const result = await Effect.runPromise(
            Json.parse(UserPreferencesSchema, memory.memory).pipe(
              Effect.catchTag("ParseError", () => Effect.succeed({})),
              Effect.catchTag("ValidationError", () => Effect.succeed({}))
            )
          );
          return result;
        } catch (parseError) {
          console.warn("Failed to parse preference data:", parseError);
          return {};
        }
      }

      return {};
    } catch (error) {
      console.warn("Failed to get user preferences:", error);
      return {};
    }
  }

  async setPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const key = this.getPreferencesKey(userId);
      const existing = await this.getPreferences(userId);
      const updated = { ...existing, ...preferences };

      await this.client.memories.add({
        content: JSON.stringify(updated),
        metadata: {
          type: "user_preferences",
          userId,
          key,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn("Failed to set user preferences:", error);
      throw error;
    }
  }

  // Conversation memory
  async getConversationMemory(userId: string, chatId: string): Promise<any> {
    try {
      const key = this.getConversationKey(userId, chatId);
      const memories = await this.client.search.memories({
        q: key,
        limit: 1
      });

      if (memories.results && memories.results.length > 0) {
        const memory = memories.results[0];
        try {
          // Use effect-json for safe parsing with error handling (using a lenient schema for any data)
          const result = await Effect.runPromise(
            Json.parse(Schema.Any, memory.memory).pipe(
              Effect.catchTag("ParseError", () => Effect.succeed(null)),
              Effect.catchTag("ValidationError", () => Effect.succeed(null))
            )
          );
          return result;
        } catch (parseError) {
          console.warn("Failed to parse conversation memory:", parseError);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.warn("Failed to get conversation memory:", error);
      return null;
    }
  }

  async setConversationMemory(userId: string, chatId: string, memoryData: any): Promise<void> {
    try {
      const key = this.getConversationKey(userId, chatId);

      await this.client.memories.add({
        content: JSON.stringify(memoryData),
        metadata: {
          type: "conversation_memory",
          userId,
          chatId,
          key,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn("Failed to set conversation memory:", error);
      throw error;
    }
  }

  // Generic user data storage
  async getUserData(userId: string, key: string): Promise<any> {
    try {
      const fullKey = this.getUserKey(userId, key);
      const memories = await this.client.search.memories({
        q: fullKey,
        limit: 1
      });

      if (memories.results && memories.results.length > 0) {
        const memory = memories.results[0];
        try {
          // Use effect-json for safe parsing with error handling (using a lenient schema for any data)
          const result = await Effect.runPromise(
            Json.parse(Schema.Any, memory.memory).pipe(
              Effect.catchTag("ParseError", () => Effect.succeed(null)),
              Effect.catchTag("ValidationError", () => Effect.succeed(null))
            )
          );
          return result;
        } catch (parseError) {
          console.warn("Failed to parse user data:", parseError);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.warn("Failed to get user data:", error);
      return null;
    }
  }

  async setUserData(userId: string, key: string, data: any): Promise<void> {
    try {
      const fullKey = this.getUserKey(userId, key);

      await this.client.memories.add({
        content: JSON.stringify(data),
        metadata: {
          type: "user_data",
          userId,
          key: fullKey,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn("Failed to set user data:", error);
      throw error;
    }
  }

  async deleteUserData(userId: string, key: string): Promise<boolean> {
    try {
      const fullKey = this.getUserKey(userId, key);
      // Note: Supermemory doesn't have direct delete, but we can mark as deleted
      console.warn("Delete not directly supported in Supermemory");
      return false;
    } catch (error) {
      console.warn("Failed to delete user data:", error);
      return false;
    }
  }

  async clearUserData(userId: string): Promise<void> {
    try {
      // Note: Supermemory doesn't have bulk delete
      console.warn("Bulk clear not directly supported in Supermemory");
    } catch (error) {
      console.warn("Failed to clear user data:", error);
      throw error;
    }
  }
}

// Singleton instance
export const userMemoryService = new UserMemoryService();

// Helper functions for common operations
export const getUserPreferences = (userId: string) =>
  userMemoryService.getPreferences(userId);

export const setUserPreferences = (userId: string, preferences: Partial<UserPreferences>) =>
  userMemoryService.setPreferences(userId, preferences);

export const rememberModelChoice = (userId: string, modelId: string) =>
  setUserPreferences(userId, {
    selectedModel: modelId,
    lastActivity: new Date().toISOString()
  });

export const getLastModelChoice = (userId: string) =>
  getUserPreferences(userId).then(prefs => prefs.selectedModel);

// Legacy Effect-based exports for compatibility
export const UserMemoryLive = {}; // Placeholder for now
