import { formatBytes, formatDuration, parseCommand } from "../types";

/**
 * Highlight code syntax with ANSI colors (basic support)
 */
export function highlightCode(
    code: string,
    language: string = "typescript",
): string {
    // TODO: Implement proper syntax highlighting with language support
    // For now, just return the code as-is
    return code;
}

/**
 * Generate a debounced version of a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number,
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * Generate a throttled version of a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    limit: number,
): (...args: Parameters<T>) => void {
    let lastRun = 0;

    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastRun >= limit) {
            fn(...args);
            lastRun = now;
        }
    };
}

// Re-export utilities from types for convenience
export { formatBytes, formatDuration, parseCommand };
