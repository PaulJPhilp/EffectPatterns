import { Effect } from "effect";
import { AuthService } from "./service.js";
export class AuthApi extends Effect.Service()("AuthApi", {
    accessors: true,
    effect: Effect.gen(function* () {
        const authService = yield* AuthService;
        return {
            // Get API key for a specific provider
            getApiKey: (provider) => authService.getApiKey(provider),
            // Set API key for a provider
            setApiKey: (provider, apiKey) => authService.setApiKey(provider, apiKey),
            // Remove API key for a provider
            removeApiKey: (provider) => authService.removeApiKey(provider),
            // List all configured providers
            listProviders: () => authService.listProviders(),
            // Get all auth configuration (with masked keys)
            getAllConfig: () => authService.getAllConfig(),
            // Get provider configuration
            getProviderConfig: (provider) => authService.getProviderConfig(provider),
            // Update last used timestamp
            updateLastUsed: (provider) => authService.updateLastUsed(provider),
            // Check if provider is configured
            isProviderConfigured: (provider) => authService.isProviderConfigured(provider),
            // Get auth file path
            authFile: () => authService.authFile,
        };
    }),
    dependencies: [AuthService.Default]
}) {
}
//# sourceMappingURL=api.js.map