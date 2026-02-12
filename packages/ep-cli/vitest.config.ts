import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

export default defineConfig({
  resolve: {
    alias: {
      "@effect-patterns/ep-shared-services/logger": path.resolve(
        workspaceRoot,
        "ep-shared-services/src/logger/index.ts"
      ),
      "@effect-patterns/ep-shared-services/display": path.resolve(
        workspaceRoot,
        "ep-shared-services/src/display/index.ts"
      ),
      "@effect-patterns/ep-shared-services/execution": path.resolve(
        workspaceRoot,
        "ep-shared-services/src/execution/index.ts"
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
  },
});
