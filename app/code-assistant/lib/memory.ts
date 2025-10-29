import Supermemory from "supermemory";

// User preferences types
export interface UserPreferences {
  selectedModel?: string;
  theme?: "light" | "dark" | "system";
  sidebarCollapsed?: boolean;
  messageCount?: number;
  lastActivity?: string;
  favoriteModels?: string[];
  customInstructions?: string;
}

// Simple memory service using the published supermemory package
class UserMemoryService {
  private client: Supermemory;

  constructor() {
    this.client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY || "sm_BpkYMBGxk4M4jYH2LbiFWx_IDnzEaZotdMhLYnsvFzmmhIBuHDVCcrjWolHBQyPOwajLrEeNmOwnqDasgCjvruf",
    });
  }

  private getUserKey = (userId: string, key: string) => `user:${userId}:${key}`;
  private getPreferencesKey = (userId: string) => this.getUserKey(userId, "preferences");
  private getConversationKey = (userId: string, chatId: string) => this.getUserKey(userId, `chat:${chatId}`);

  // User preferences
  async getPreferences(userId: string): Promise<UserPreferences> {
    try {
      const key = this.getPreferencesKey(userId);

      // Try Supermemory API first
      try {
        const memories = await this.client.search.memories({
          q: key,
          limit: 1
        });

        if (memories.results && memories.results.length > 0) {
          const memory = memories.results[0];
          return JSON.parse(memory.memory);
        }
      } catch (apiError) {
        console.warn("Supermemory API error, falling back to localStorage:", apiError);
      }

      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : {};
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

      // Try Supermemory API first
      try {
        await this.client.memories.add({
          content: JSON.stringify(updated),
          metadata: {
            type: "user_preferences",
            userId,
            key,
            timestamp: new Date().toISOString()
          }
        });
      } catch (apiError) {
        console.warn("Supermemory API error, falling back to localStorage:", apiError);
        // Fallback to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(updated));
        }
        throw apiError;
      }

      // Also update localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (error) {
      console.warn("Failed to set user preferences:", error);
      throw error;
    }
  }

  // Conversation memory
  async getConversationMemory(userId: string, chatId: string): Promise<any> {
    try {
      const key = this.getConversationKey(userId, chatId);
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
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
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(memoryData));
      }
    } catch (error) {
      console.warn("Failed to set conversation memory:", error);
      throw error;
    }
  }

  // Generic user data storage
  async getUserData(userId: string, key: string): Promise<any> {
    try {
      const fullKey = this.getUserKey(userId, key);
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(fullKey);
        return stored ? JSON.parse(stored) : null;
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
      if (typeof window !== 'undefined') {
        localStorage.setItem(fullKey, JSON.stringify(data));
      }
    } catch (error) {
      console.warn("Failed to set user data:", error);
      throw error;
    }
  }

  async deleteUserData(userId: string, key: string): Promise<boolean> {
    try {
      const fullKey = this.getUserKey(userId, key);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(fullKey);
      }
      return true;
    } catch (error) {
      console.warn("Failed to delete user data:", error);
      return false;
    }
  }

  async clearUserData(userId: string): Promise<void> {
    try {
      // This is a simple implementation - in production you'd want to clear all user keys
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(`user:${userId}:`));
        keys.forEach(key => localStorage.removeItem(key));
      }
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
