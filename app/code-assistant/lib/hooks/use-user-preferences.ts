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

      // Handle 401 Unauthorized - user not authenticated
      if (response.status === 401) {
        console.debug("User not authenticated, using default preferences");
        setPreferences({});
        setError(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load preferences: ${response.status}`);
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
      // Only log as error if it's not a network/fetch error
      const isNetworkError = err instanceof TypeError && err.message.includes("fetch");
      if (isNetworkError) {
        console.debug("Network error loading preferences, using defaults:", err);
      } else {
        console.error("Error loading preferences:", err);
      }

      setError(null); // Don't show error to user - gracefully degrade
      setPreferences({}); // Use empty preferences object as fallback
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

      // Handle 401 Unauthorized - user not authenticated
      if (response.status === 401) {
        console.debug("User not authenticated, cannot save preferences");
        // Still update local state optimistically for guest experience
        setPreferences(prev => ({ ...prev, ...newPreferences }));
        setError(null);
        return;
      }

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
      // Only log network errors as debug, not as errors
      if (err instanceof TypeError && err.message.includes("fetch")) {
        console.debug("Network error saving preferences, using local state:", err);
      } else {
        console.warn("Error saving preferences:", err);
      }

      // Still update local state optimistically - app should work in offline mode
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      setError(null);
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
