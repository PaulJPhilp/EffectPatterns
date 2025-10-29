import { useState, useEffect } from "react";
import { UserPreferences } from "../memory";

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/preferences");

      if (!response.ok) {
        throw new Error("Failed to load preferences");
      }

      const data = await response.json();
      setPreferences(data.preferences || {});
      setError(null);
    } catch (err) {
      console.error("Error loading preferences:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setPreferences({});
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferences: newPreferences }),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      // Update local state
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      setError(null);
    } catch (err) {
      console.error("Error saving preferences:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err; // Re-throw so caller can handle
    }
  };

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    await savePreferences({ [key]: value } as Partial<UserPreferences>);
  };

  return {
    preferences,
    loading,
    error,
    loadPreferences,
    savePreferences,
    updatePreference,
  };
}
