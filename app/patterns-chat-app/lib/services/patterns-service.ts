/**
 * PatternsService
 * Manages retrieval of Effect-TS patterns from Supermemory using the memory router API.
 * Provides RAG (Retrieval-Augmented Generation) capabilities for the patterns chat app.
 */

export interface Pattern {
    id: string;
    title: string;
    description: string;
    content: string;
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
    useCase?: string[];
    relevanceScore?: number;
    source?: 'supermemory';
    url?: string;
}

export interface PatternSearchResult {
    patterns: Pattern[];
    totalCount: number;
    query: string;
    timestamp: number;
}

export interface MemoryRouterRequest {
    query: string;
    projectId?: string;
    container?: string;
    limit?: number;
    threshold?: number;
    rerank?: boolean;
}

export interface MemoryRouterResponse {
    memories: Array<{
        id: string;
        content: string;
        metadata?: Record<string, unknown>;
        relevanceScore?: number;
    }>;
    totalCount: number;
    processedAt: string;
}

/**
 * PatternsService singleton instance
 * Uses Supermemory's memory router API to query pattern memories
 */
export class PatternsService {
    private apiKey: string;
    private projectId: string;
    private baseUrl: string = 'https://api.supermemory.ai/v1';
    private cache: Map<string, PatternSearchResult> = new Map();
    private cacheExpiry: number = 1000 * 60 * 5; // 5 minutes

    constructor(apiKey?: string, projectId?: string) {
        this.apiKey = apiKey || process.env.SUPERMEMORY_API_KEY || '';
        this.projectId = projectId || process.env.SUPERMEMORY_PROJECT_ID || 'effect-patterns';

        if (!this.apiKey) {
            throw new Error(
                'SUPERMEMORY_API_KEY environment variable is required. Set it in your .env.local file.'
            );
        }
    }

    /**
     * Search for patterns in Supermemory using the memory router API
     * Implements retrieval-augmented generation for pattern discovery
     */
    async searchPatterns(query: string, options?: Partial<MemoryRouterRequest>): Promise<PatternSearchResult> {
        // Check cache first
        const cacheKey = `${query}:${options?.limit || 10}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached;
        }

        try {
            const response = await this.queryMemoryRouter({
                query,
                projectId: this.projectId,
                limit: options?.limit || 10,
                threshold: options?.threshold || 0.5,
                rerank: options?.rerank ?? false,
            });

            const patterns = this.parseMemoriesToPatterns(response);
            const result: PatternSearchResult = {
                patterns,
                totalCount: response.totalCount,
                query,
                timestamp: Date.now(),
            };

            this.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error searching patterns:', error);
            throw new Error(`Failed to search patterns: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get patterns by skill level
     * Filters cached or newly searched patterns by difficulty
     */
    async getPatternsBySkillLevel(
        skillLevel: 'beginner' | 'intermediate' | 'advanced',
        query?: string
    ): Promise<Pattern[]> {
        const searchQuery = query || skillLevel;
        const result = await this.searchPatterns(searchQuery);

        return result.patterns.filter((p) => p.skillLevel === skillLevel);
    }

    /**
     * Get patterns by use case tag
     * Searches for patterns related to specific Effect-TS use cases
     */
    async getPatternsByUseCase(useCase: string): Promise<Pattern[]> {
        const result = await this.searchPatterns(useCase, { limit: 20 });

        return result.patterns.filter((p) => p.useCase?.includes(useCase));
    }

    /**
     * Query the Supermemory memory router API
     * Low-level API interaction with error handling and request formatting
     */
    private async queryMemoryRouter(request: MemoryRouterRequest): Promise<MemoryRouterResponse> {
        const url = `${this.baseUrl}/memory-router/search`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Project-Id': request.projectId || this.projectId,
        };

        const body = {
            query: request.query,
            limit: request.limit || 10,
            threshold: request.threshold || 0.5,
            rerank: request.rerank || false,
            container: request.container || undefined,
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Supermemory API error: ${response.status} ${response.statusText}`);
            }

            const data: MemoryRouterResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Memory router API request failed:', error);
            throw error;
        }
    }

    /**
     * Convert Supermemory memories to Pattern objects
     * Parses metadata and extracts relevant fields
     */
    private parseMemoriesToPatterns(response: MemoryRouterResponse): Pattern[] {
        return response.memories
            .map((memory) => {
                const metadata = memory.metadata as Record<string, unknown> | undefined;

                return {
                    id: memory.id,
                    title: (metadata?.title as string) || 'Untitled Pattern',
                    description: (metadata?.description as string) || '',
                    content: memory.content,
                    skillLevel: ((metadata?.skillLevel as string) || 'intermediate') as Pattern['skillLevel'],
                    tags: (metadata?.tags as string[]) || [],
                    useCase: (metadata?.useCase as string[]) || [],
                    relevanceScore: memory.relevanceScore || 0,
                    source: 'supermemory' as const,
                    url: (metadata?.url as string) || undefined,
                };
            })
            .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    /**
     * Clear the pattern cache
     * Useful for testing or forcing a refresh
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics for debugging
     */
    getCacheStats(): { size: number; entries: string[] } {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()),
        };
    }
}

/**
 * Singleton instance for use throughout the app
 * Initialize on first import
 */
let patternsServiceInstance: PatternsService | null = null;

export function getPatternsService(): PatternsService {
    if (!patternsServiceInstance) {
        patternsServiceInstance = new PatternsService();
    }
    return patternsServiceInstance;
}

export function setPatternsService(service: PatternsService): void {
    patternsServiceInstance = service;
}
