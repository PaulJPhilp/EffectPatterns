/**
 * PatternScorer
 * Evaluates user queries to determine if pattern retrieval is needed.
 * Implements a scoring system to avoid unnecessary pattern searches while ensuring
 * patterns are provided when relevant to the user's question.
 */

/**
 * Pattern relevance keywords for different Effect-TS topics
 * Used to score user queries for pattern relevance
 */
const PATTERN_KEYWORDS: Record<string, string[]> = {
    'error-handling': [
        'error',
        'fail',
        'catch',
        'throw',
        'exception',
        'try',
        'result',
        'either',
        'option',
        'validation',
    ],
    'dependency-injection': [
        'dependency',
        'inject',
        'di',
        'service',
        'layer',
        'provide',
        'dependency injection',
    ],
    'async-programming': [
        'async',
        'await',
        'promise',
        'callback',
        'concurrent',
        'parallel',
        'task',
        'effect',
    ],
    'type-safety': [
        'type',
        'typing',
        'types',
        'typesafe',
        'type-safe',
        'schema',
        'validation',
        'narrowing',
    ],
    'testing': ['test', 'unit', 'integration', 'mock', 'spy', 'stub', 'coverage'],
    'performance': [
        'performance',
        'optimize',
        'optimization',
        'fast',
        'slow',
        'memory',
        'gc',
        'garbage collection',
    ],
    'composition': [
        'compose',
        'composition',
        'combine',
        'combine',
        'pipe',
        'functional',
        'fp',
    ],
    'context-propagation': [
        'context',
        'propagat',
        'request',
        'trace',
        'tracing',
        'span',
        'correlation',
    ],
};

/**
 * Effect-TS specific terms that increase pattern relevance
 */
const EFFECT_KEYWORDS = [
    'effect',
    'effect-ts',
    'effectts',
    'effect.ts',
    'layer',
    'service',
    'gen',
    'pipe',
    'schema',
    'either',
    'option',
    'result',
];

/**
 * Keywords that suggest the user needs pattern guidance
 */
const GUIDANCE_INDICATORS = [
    'how to',
    'how do i',
    'what is',
    'what are',
    'best practice',
    'best practices',
    'pattern',
    'example',
    'examples',
    'should i',
    'can i',
    'is it',
    'understand',
    'learn',
    'help',
    'guide',
];

export interface ScoringResult {
    needsPatterns: boolean;
    score: number;
    reasons: string[];
    suggestedTopics?: string[];
}

/**
 * Scores user queries to determine if pattern retrieval is beneficial
 * Uses a multi-factor scoring system considering:
 * - Effect-TS relevance
 * - Topic specificity
 * - Learning/guidance indicators
 * - Negation (if user explicitly doesn't want patterns)
 */
export class PatternScorer {
    private readonly minScoreForPatterns: number = 0.5;

    /**
     * Score a user query for pattern relevance
     * Returns a decision object with score, decision, and reasoning
     */
    scoreQuery(query: string): ScoringResult {
        const normalizedQuery = query.toLowerCase();
        const reasons: string[] = [];
        const suggestedTopics: Set<string> = new Set();

        let score = 0;

        // 1. Check for explicit "no patterns" indicators
        if (this.hasNegation(normalizedQuery)) {
            return {
                needsPatterns: false,
                score: 0,
                reasons: ['User explicitly indicated no patterns needed'],
            };
        }

        // 2. Effect-TS specificity (strong signal)
        const effectScore = this.scoreEffectSpecificity(normalizedQuery);
        if (effectScore > 0) {
            score += effectScore * 0.4;
            reasons.push(`Effect-TS specificity: ${(effectScore * 100).toFixed(0)}%`);
        }

        // 3. Topic matching (strong signal)
        const topicMatch = this.matchTopics(normalizedQuery);
        if (topicMatch.score > 0) {
            score += topicMatch.score * 0.35;
            reasons.push(`Topic match: ${topicMatch.topics.join(', ')}`);
            topicMatch.topics.forEach((t) => suggestedTopics.add(t));
        }

        // 4. Learning/guidance indicators (moderate signal)
        const guidanceScore = this.scoreGuidance(normalizedQuery);
        if (guidanceScore > 0) {
            score += guidanceScore * 0.25;
            reasons.push(`Learning/guidance indicators present`);
        }

        // Normalize score to 0-1 range
        score = Math.min(1, score);

        return {
            needsPatterns: score >= this.minScoreForPatterns,
            score,
            reasons,
            suggestedTopics: Array.from(suggestedTopics),
        };
    }

    /**
     * Check if query contains explicit negations
     * Examples: "don't use patterns", "no examples needed", etc.
     */
    private hasNegation(query: string): boolean {
        const negationPatterns = [
            /don't.*pattern/i,
            /no.*pattern/i,
            /without.*pattern/i,
            /no.*example/i,
            /don't.*example/i,
            /off-topic|unrelated|not effect/i,
        ];

        return negationPatterns.some((pattern) => pattern.test(query));
    }

    /**
     * Score how specific to Effect-TS this query is
     * Returns 0-1 score based on presence of Effect keywords
     */
    private scoreEffectSpecificity(query: string): number {
        let keywordCount = 0;
        let totalScore = 0;

        for (const keyword of EFFECT_KEYWORDS) {
            if (query.includes(keyword)) {
                keywordCount++;
                // Effect.ts is worth more than general keywords
                if (keyword === 'effect' || keyword === 'effect-ts') {
                    totalScore += 1;
                } else {
                    totalScore += 0.5;
                }
            }
        }

        // Normalize: max score is based on number of possible keywords
        return Math.min(1, totalScore / EFFECT_KEYWORDS.length);
    }

    /**
     * Match query against pattern topics
     * Returns matched topics and a combined score
     */
    private matchTopics(query: string): { topics: string[]; score: number } {
        const matchedTopics: string[] = [];
        let matchScore = 0;

        for (const [topic, keywords] of Object.entries(PATTERN_KEYWORDS)) {
            const matches = keywords.filter((keyword) => query.includes(keyword.toLowerCase()));

            if (matches.length > 0) {
                matchedTopics.push(topic);
                // Score increases with more keyword matches (diminishing returns)
                matchScore += Math.min(0.5, matches.length * 0.15);
            }
        }

        // Normalize
        matchScore = Math.min(1, matchScore);

        return {
            topics: matchedTopics,
            score: matchScore,
        };
    }

    /**
     * Score presence of learning/guidance indicators
     * Returns 0-1 score based on how much the query suggests guidance is needed
     */
    private scoreGuidance(query: string): number {
        let indicatorCount = 0;

        for (const indicator of GUIDANCE_INDICATORS) {
            if (query.includes(indicator)) {
                indicatorCount++;
            }
        }

        // Normalize: presence of 2+ indicators is strong signal
        return Math.min(1, indicatorCount * 0.3);
    }

    /**
     * Set minimum score threshold for pattern retrieval
     * Allows tuning the sensitivity of pattern suggestions
     * @param threshold value between 0 and 1
     */
    setMinimumThreshold(threshold: number): void {
        if (threshold < 0 || threshold > 1) {
            throw new Error('Threshold must be between 0 and 1');
        }
        (this as any).minScoreForPatterns = threshold;
    }

    /**
     * Get detailed scoring breakdown for debugging
     */
    getDetailedScore(query: string): Omit<ScoringResult, 'needsPatterns'> & {
        effectScore: number;
        topicScore: number;
        guidanceScore: number;
        threshold: number;
    } {
        const normalizedQuery = query.toLowerCase();
        const effectScore = this.scoreEffectSpecificity(normalizedQuery);
        const topicMatch = this.matchTopics(normalizedQuery);
        const guidanceScore = this.scoreGuidance(normalizedQuery);

        const totalScore =
            effectScore * 0.4 +
            topicMatch.score * 0.35 +
            guidanceScore * 0.25;

        return {
            score: Math.min(1, totalScore),
            effectScore,
            topicScore: topicMatch.score,
            guidanceScore,
            threshold: this.minScoreForPatterns,
            reasons: [
                `Effect-TS score: ${(effectScore * 100).toFixed(0)}%`,
                `Topic match: ${topicMatch.topics.join(', ') || 'none'} (${(topicMatch.score * 100).toFixed(0)}%)`,
                `Guidance indicators: ${(guidanceScore * 100).toFixed(0)}%`,
            ],
            suggestedTopics: topicMatch.topics,
        };
    }
}

/**
 * Singleton instance for use throughout the app
 */
let scorerInstance: PatternScorer | null = null;

export function getPatternScorer(): PatternScorer {
    if (!scorerInstance) {
        scorerInstance = new PatternScorer();
    }
    return scorerInstance;
}

export function setPatternScorer(scorer: PatternScorer): void {
    scorerInstance = scorer;
}
