export interface AuthConfig {
	readonly provider: string;
	readonly apiKey: string;
	readonly createdAt: string;
	readonly lastUsed?: string;
}