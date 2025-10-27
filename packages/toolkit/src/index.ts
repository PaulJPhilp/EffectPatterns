/**
 * Effect Patterns Toolkit - Minimal Version for Deployment Testing
 */

// Mock implementations for deployment testing
export const searchPatterns = () => Promise.resolve([]);
export const toPatternSummary = () => ({});
export const buildSnippet = () => "";
export const GenerateRequest = {};

// Re-export what we can
export { splitSections } from './splitSections.js';

