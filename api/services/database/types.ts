/**
 * Database service types
 */

/**
 * Database configuration
 */
export interface DatabaseConfig {
    readonly url: string;
    readonly ssl?: boolean;
}

/**
 * Pattern data structure from database
 */
export interface DatabasePattern {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly skillLevel: string;
    readonly useCase: string[];
    readonly content: string;
}
