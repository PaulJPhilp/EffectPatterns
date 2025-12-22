import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./packages/toolkit/src/db/schema/index.ts",
  out: "./packages/toolkit/src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/effect_patterns",
  },
})

