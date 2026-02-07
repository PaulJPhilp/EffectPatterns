import { FileSystem, HttpBody, HttpClient } from "@effect/platform";
import { Config, Context, Effect, Layer } from "effect";
import { Display } from "../display/index.js";

export interface AutofixOptions {
    readonly reportPath: string;
    readonly provider: "google" | "openai" | "anthropic";
    readonly model: string;
    readonly limit: number | undefined;
    readonly attempts: number;
    readonly dryRun: boolean;
}

export interface AutofixService {
    readonly fixPrepublishErrors: (
        options: AutofixOptions,
    ) => Effect.Effect<void, Error>;
}

export const AutofixService = Context.GenericTag<AutofixService>(
    "@ep-admin/services/AutofixService",
);

// Helper to call Google Gemini
const callGemini = (
    prompt: string,
    model: string,
    apiKey: string,
    client: HttpClient.HttpClient,
) =>
    Effect.gen(function* () {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const body = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        const response = yield* client.post(url, {
            body: HttpBody.unsafeJson(body),
        });

        if (response.status >= 400) {
             const text = yield* response.text;
             return yield* Effect.fail(new Error(`Gemini API Error: ${text}`));
        }

        const json = yield* response.json;
        const candidates = (json as Record<string, unknown>).candidates as Array<Record<string, unknown>> | undefined;
        const content = candidates?.[0]?.content as Record<string, unknown> | undefined;
        const parts = content?.parts as Array<Record<string, unknown>> | undefined;
        return parts?.[0]?.text as string | undefined;
    });

export const DefaultAutofixService = Layer.effect(
    AutofixService,
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const display = yield* Display;
        const client = yield* HttpClient.HttpClient;

        return {
            fixPrepublishErrors: (options) =>
                Effect.gen(function* () {
                    if (options.dryRun) {
                        yield* display.showInfo(
                            "Running in DRY RUN mode. No files will be modified.",
                        );
                    }

                    yield* display.showInfo(`Reading report from ${options.reportPath}...`);

                    const reportExists = yield* fs.exists(options.reportPath);
                    if (!reportExists) {
                        return yield* Effect.fail(
                            new Error(`Report file not found: ${options.reportPath}`),
                        );
                    }

                    const reportContent = yield* fs.readFileString(options.reportPath);
                    
                    const report = yield* Effect.try({
                        try: () => JSON.parse(reportContent),
                        catch: () => new Error("Invalid JSON report")
                    });

                    // Handle report structure (adapt as needed)
                    // Assumes prepublish-check output format
                    const diagnostics = ((report as Record<string, unknown>).diagnostics ?? []) as Array<Record<string, unknown>>;
                    if (diagnostics.length === 0) {
                        yield* display.showInfo("No errors found in report.");
                        return;
                    }

                    // Group by file
                    const filesMap = new Map<string, Array<Record<string, unknown>>>();
                    for (const d of diagnostics) {
                        if (!d.file) continue;
                        const filePath = String(d.file);
                        const existing = filesMap.get(filePath) || [];
                        existing.push(d);
                        filesMap.set(filePath, existing);
                    }

                    let processed = 0;
                    for (const [file, errors] of filesMap.entries()) {
                        if (options.limit && processed >= options.limit) break;
                        processed++;

                        yield* display.showInfo(
                            `Processing ${file} (${errors.length} errors)...`,
                        );

                        const exists = yield* fs.exists(file);
                        if (!exists) {
                            yield* display.showError(`File not found: ${file}`);
                            continue;
                        }

                        const fileContent = yield* fs.readFileString(file);

                        // Construct Prompt
                        const prompt = `Fix the following TypeScript errors in the file below.\n\nErrors:\n${JSON.stringify(errors, null, 2)}\n\nFile Content:\n\`\`\`typescript\n${fileContent}\n\`\`\`\n\nReturn only the fixed file content in a code block. Do not add markdown backticks if not requested, but usually the model wraps it.`;

                        if (options.provider === "google") {
                            const apiKey = yield* Config.string("GOOGLE_API_KEY").pipe(
                                Config.withDefault(""),
                            );
                            if (!apiKey) {
                                yield* display.showWarning(
                                    "GOOGLE_API_KEY not set. Skipping AI call.",
                                );
                                continue;
                            }

                            if (!options.dryRun) {
                                yield* callGemini(
                                    prompt,
                                    options.model,
                                    apiKey,
                                    client,
                                ).pipe(
                                    Effect.flatMap((result) => Effect.gen(function*() {
                                        if (result) {
                                            // Strip code blocks
                                            let clean = result.trim();
                                            if (clean.startsWith("```typescript")) {
                                                clean = clean.substring(13);
                                            } else if (clean.startsWith("```")) {
                                                clean = clean.substring(3);
                                            }
                                            if (clean.endsWith("```")) {
                                                clean = clean.substring(0, clean.length - 3);
                                            }
                                            
                                            yield* fs.writeFileString(file, clean);
                                            yield* display.showSuccess(`Fixed ${file}`);
                                        } else {
                                            yield* display.showError(`Failed to generate fix for ${file}`);
                                        }
                                    })),
                                    Effect.catchAll((e) => display.showError(`AI Error: ${e}`))
                                );
                            } else {
                                yield* display.showInfo(
                                    `[Dry Run] Would call Gemini to fix ${file}`,
                                );
                            }
                        } else {
                            yield* display.showWarning(
                                `Provider ${options.provider} implementation pending.`,
                            );
                        }
                    }
                }).pipe(
                    Effect.catchAll((e) => Effect.fail(e instanceof Error ? e : new Error(String(e))))
                ) as any,
        };
    }),
);
