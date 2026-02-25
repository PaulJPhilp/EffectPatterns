const defaultDbUrl =
	"postgresql://postgres:postgres@127.0.0.1:5432/" +
	"effect_patterns";

if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = defaultDbUrl;
}

// Disable Vercel KV in test environment to avoid network timeouts
// Tests will use in-memory fallback for rate limiting
if (!process.env.KV_REST_API_URL) {
	// Explicitly undefined so @vercel/kv won't initialize
	process.env.KV_REST_API_URL = "";
}

if (!process.env.KV_REST_API_TOKEN) {
	process.env.KV_REST_API_TOKEN = "";
}

if (!process.env.PATTERN_API_KEY) {
	process.env.PATTERN_API_KEY = "test-key";
}
