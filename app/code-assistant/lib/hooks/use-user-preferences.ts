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

      try {
        const data = await response.json();
        setPreferences(data.preferences || {});
      } catch (parseError) {
        console.error("Error parsing preferences response:", parseError);
        throw new Error("Invalid preferences response format");
      }
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
        throw new Error(`Failed to save preferences: ${response.status}`);
      }

      // Try to parse response (may be empty)
      try {
        if (response.headers.get("content-length") !== "0") {
          await response.json();
        }
      } catch (parseError) {
        console.warn("Error parsing save preferences response:", parseError);
      }

      // Update local state
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error saving preferences:", errorMessage);
      setError(errorMessage);
      // Don't re-throw - allow UI to recover gracefully
      // The preference save failure shouldn't crash the app
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
