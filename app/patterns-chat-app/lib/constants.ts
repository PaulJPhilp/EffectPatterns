import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = "dummy-password";

/**
 * Maximum length of a user message in characters.
 *
 * This limit:
 * - Prevents extremely long single messages that may overwhelm the model
 * - Keeps token usage reasonable (roughly 1000-1500 tokens per message)
 * - Encourages focused, conversational queries
 * - Maintains consistent UX across all supported models
 *
 * If you need to change this, update this constant and the smoke tests will
 * automatically validate the new limit.
 *
 * @default 4096 characters
 */
export const MAX_MESSAGE_LENGTH = 4096;
