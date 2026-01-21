import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            api: path.resolve(__dirname),
            packages: path.resolve(__dirname, "..", "packages"),
            server: path.resolve(__dirname, "..", "server"),
        },
    },
    test: {
        environment: "node",
        globals: true,
    },
});
