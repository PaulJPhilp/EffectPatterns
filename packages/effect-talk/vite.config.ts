import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        target: "ES2020",
        lib: {
            entry: path.resolve(__dirname, "src/index.ts"),
            name: "EffectTalk",
            fileName: (format) => `effect-talk.${format === "es" ? "mjs" : "cjs"}`,
            formats: ["es", "cjs"],
        },
        rollupOptions: {
            external: ["react", "react-dom", "effect"],
            output: {
                globals: {
                    react: "React",
                    "react-dom": "ReactDOM",
                    effect: "Effect",
                },
            },
        },
    },
    server: {
        port: 5173,
        open: true,
    },
});
