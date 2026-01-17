import { Effect, Schema } from "effect";
import * as fs from "fs";
import * as path from "path";
import type { Session } from "../types";
import { PersistenceError, SessionSchema } from "../types";
import { LoggerService } from "./LoggerService";
import { ConfigService } from "./SessionStore";

/**
 * PersistenceService manages saving and restoring sessions
 * Uses JSON file storage for sessions in the configured directory
 */
export class PersistenceService extends Effect.Service<PersistenceService>()(
  "PersistenceService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const logger = yield* LoggerService;
      const config = yield* ConfigService;

      // Helper to expand home directory path
      const expandPath = (p: string): string => {
        if (p.startsWith("~")) {
          return path.join(process.env.HOME || "/", p.slice(1));
        }
        return p;
      };

      // Ensure session directory exists
      const ensureDir = (dirPath: string): Effect.Effect<void, PersistenceError> =>
        Effect.sync(() => {
          try {
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
          } catch (cause) {
            throw new PersistenceError({
              operation: "write",
              path: dirPath,
              cause,
            });
          }
        });

      const getSessionPath = (sessionId: string): string => {
        const storePath = config.get("sessionStorePath");
        const expandedPath = expandPath(storePath);
        return path.join(expandedPath, `${sessionId}.json`);
      };

      return {
        /**
         * Save a session to JSON file
         */
        saveSession: (session: Session) =>
          Effect.gen(function* () {
            const storePath = config.get("sessionStorePath");
            const expandedPath = expandPath(storePath);
            const sessionFile = getSessionPath(session.id);

            yield* logger.info(`Saving session: ${session.id}`);

            // Validate session with schema
            const validSession = yield* Schema.parse(SessionSchema)(session);

            // Ensure directory exists
            yield* ensureDir(expandedPath);

            // Write to file
            try {
              yield* Effect.sync(() => {
                const json = JSON.stringify(validSession, null, 2);
                fs.writeFileSync(sessionFile, json, "utf-8");
              });
              yield* logger.debug(`Session saved to: ${sessionFile}`);
            } catch (cause) {
              yield* Effect.fail(
                new PersistenceError({
                  operation: "write",
                  path: sessionFile,
                  cause,
                }),
              );
            }
          }),

        /**
         * Load a session from JSON file by ID
         */
        loadSession: (sessionId: string) =>
          Effect.gen(function* () {
            const sessionFile = getSessionPath(sessionId);

            yield* logger.debug(`Loading session: ${sessionId}`);

            try {
              const json = yield* Effect.sync(() => {
                if (!fs.existsSync(sessionFile)) {
                  throw new Error(`Session file not found: ${sessionFile}`);
                }
                return fs.readFileSync(sessionFile, "utf-8");
              });

              const parsed = JSON.parse(json);
              const session = yield* Schema.parse(SessionSchema)(parsed);
              yield* logger.debug(`Loaded session: ${sessionId}`);
              return session;
            } catch (cause) {
              yield* Effect.fail(
                new PersistenceError({
                  operation: "read",
                  path: sessionFile,
                  cause,
                }),
              );
            }
          }),

        /**
         * List all available sessions (metadata only)
         */
        listSessions: () =>
          Effect.gen(function* () {
            const storePath = config.get("sessionStorePath");
            const expandedPath = expandPath(storePath);

            yield* logger.debug("Listing available sessions");

            try {
              const sessions = yield* Effect.sync(() => {
                if (!fs.existsSync(expandedPath)) {
                  return [];
                }

                const files = fs.readdirSync(expandedPath);
                return files
                  .filter((f) => f.endsWith(".json"))
                  .map((f) => {
                    const filePath = path.join(expandedPath, f);
                    const stat = fs.statSync(filePath);
                    const sessionId = f.replace(".json", "");
                    return {
                      id: sessionId,
                      createdAt: stat.birthtimeMs,
                    };
                  })
                  .sort((a, b) => b.createdAt - a.createdAt);
              });

              yield* logger.debug(
                `Found ${sessions.length} sessions`,
              );
              return sessions;
            } catch (cause) {
              yield* Effect.fail(
                new PersistenceError({
                  operation: "read",
                  path: expandedPath,
                  cause,
                }),
              );
            }
          }),

        /**
         * Delete a session from storage
         */
        deleteSession: (sessionId: string) =>
          Effect.gen(function* () {
            const sessionFile = getSessionPath(sessionId);

            yield* logger.info(`Deleting session: ${sessionId}`);

            try {
              yield* Effect.sync(() => {
                if (fs.existsSync(sessionFile)) {
                  fs.unlinkSync(sessionFile);
                }
              });
              yield* logger.debug(`Deleted session file: ${sessionFile}`);
            } catch (cause) {
              yield* Effect.fail(
                new PersistenceError({
                  operation: "delete",
                  path: sessionFile,
                  cause,
                }),
              );
            }
          }),

        /**
         * Get the most recent session for auto-restore
         */
        getLastSession: () =>
          Effect.gen(function* () {
            yield* logger.debug("Fetching last session");

            const sessions = yield* PersistenceService.listSessions();
            if (sessions.length === 0) {
              yield* logger.debug("No sessions found");
              return null;
            }

            const mostRecent = sessions[0];
            const session = yield* PersistenceService.loadSession(
              mostRecent.id,
            );
            return session;
          }),

        /**
         * Export a session as JSON string
         */
        exportSession: (sessionId: string) =>
          Effect.gen(function* () {
            const sessionFile = getSessionPath(sessionId);

            yield* logger.info(`Exporting session: ${sessionId}`);

            try {
              const json = yield* Effect.sync(() => {
                if (!fs.existsSync(sessionFile)) {
                  throw new Error(`Session file not found: ${sessionFile}`);
                }
                return fs.readFileSync(sessionFile, "utf-8");
              });

              return json;
            } catch (cause) {
              yield* Effect.fail(
                new PersistenceError({
                  operation: "read",
                  path: sessionFile,
                  cause,
                }),
              );
            }
          }),

        /**
         * Import a session from JSON string
         */
        importSession: (sessionJson: string) =>
          Effect.gen(function* () {
            yield* logger.info("Importing session from JSON");

            try {
              const parsed = JSON.parse(sessionJson);
              const session = yield* Schema.parse(SessionSchema)(parsed);
              // Save the imported session
              yield* PersistenceService.saveSession(session);
              return session;
            } catch (cause) {
              yield* Effect.fail(
                new PersistenceError({
                  operation: "write",
                  path: "<import>",
                  cause,
                }),
              );
            }
          }),
      };
    }),
    dependencies: [LoggerService.Default, ConfigService.Default],
  },
) { }
