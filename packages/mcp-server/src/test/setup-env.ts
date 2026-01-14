const defaultDbUrl =
	"postgresql://postgres:postgres@127.0.0.1:5432/" +
	"effect_patterns";

if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = defaultDbUrl;
}
