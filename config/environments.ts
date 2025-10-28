// Environment configuration for Effect Patterns Hub
export const environments = {
    staging: {
        mcpServer: {
            url: 'https://effect-patterns-mcp-staging.vercel.app',
            apiKey: process.env.PATTERN_API_KEY_STAGING,
        },
        codeAssistant: {
            url: 'https://effect-patterns-code-assistant-staging.vercel.app',
        },
        web: {
            url: 'https://effect-patterns-web-staging.vercel.app',
        },
    },
    production: {
        mcpServer: {
            url: 'https://effect-patterns-mcp.vercel.app',
            apiKey: process.env.PATTERN_API_KEY_PRODUCTION,
        },
        codeAssistant: {
            url: 'https://effect-patterns-code-assistant.vercel.app',
        },
        web: {
            url: 'https://effect-patterns-web.vercel.app',
        },
    },
} as const;

export type Environment = keyof typeof environments;
export type ServiceConfig = typeof environments[Environment];

// Get current environment
export const getCurrentEnvironment = (): Environment => {
    const env = process.env.NODE_ENV || 'production';
    return env === 'staging' ? 'staging' : 'production';
};

// Get service configuration for current environment
export const getServiceConfig = (env?: Environment): ServiceConfig => {
    const currentEnv = env || getCurrentEnvironment();
    return environments[currentEnv];
};

// Validate environment configuration
export const validateEnvironment = (env: Environment = getCurrentEnvironment()) => {
    const config = environments[env];

    if (!config.mcpServer.apiKey) {
        throw new Error(`PATTERN_API_KEY_${env.toUpperCase()} environment variable is required`);
    }

    return config;
};