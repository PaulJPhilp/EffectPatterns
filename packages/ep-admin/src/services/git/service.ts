/**
 * Git service implementation
 */

import { Effect } from "effect";
import { GIT } from "../../constants.js";
import type { GitService } from "./api.js";
import { GitCommandError, GitRepositoryError } from "./errors.js";
import {
	execGitCommand,
	execGitCommandVoid,
	getGitRoot,
	parseGitStatus
} from "./helpers.js";
import type { GitTag } from "./types.js";

/**
 * Git service using Effect.Service pattern
 */
export class Git extends Effect.Service<Git>()("Git", {
	accessors: true,
	effect: Effect.gen(function* () {
		const getRepository: GitService["getRepository"] = () =>
			Effect.gen(function* () {
				const root = yield* getGitRoot();
				const branch = yield* getCurrentBranch();
				const commit = yield* getCurrentCommit();
				const status = yield* getStatus();

				// Try to get remote
				const remote = yield* execGitCommand("remote", [...GIT.COMMANDS.REMOTE_GET_URL.split(" "), GIT.DEFAULT_REMOTE]).pipe(
					Effect.catchAll(() => Effect.succeed(undefined))
				);

				return {
					root,
					branch,
					remote,
					commit,
					status,
				};
			});

		const getStatus: GitService["getStatus"] = () =>
			Effect.gen(function* () {
				const statusOutput = yield* execGitCommand("status", [GIT.COMMANDS.STATUS_PORCELAIN]);
				const status = parseGitStatus(statusOutput);
				const branchOutput = yield* execGitCommand("branch", [GIT.COMMANDS.BRANCH_SHOW_CURRENT]);

				return {
					branch: branchOutput,
					clean: status.staged === 0 && status.unstaged === 0 && status.untracked === 0,
					...status,
				};
			});

		const getCurrentBranch: GitService["getCurrentBranch"] = () =>
			execGitCommand("branch", [GIT.COMMANDS.BRANCH_SHOW_CURRENT]);

		const getCurrentCommit: GitService["getCurrentCommit"] = () =>
			execGitCommand("rev-parse", [GIT.COMMANDS.REV_PARSE_HEAD]);

		const getLatestTag: GitService["getLatestTag"] = () =>
			Effect.gen(function* () {
				return yield* execGitCommand("describe", GIT.COMMANDS.DESCRIBE_TAGS.split(" ")).pipe(
					Effect.catchAll((error) => {
						if (error instanceof GitCommandError && error.message.includes("No names found")) {
							return Effect.fail(
								GitRepositoryError.make(
									"No git tags found in this repository.\n\n" +
									"This is likely the first release. Create an initial tag:\n" +
									`  git tag ${GIT.INITIAL_TAG}\n` +
									`  git push ${GIT.DEFAULT_REMOTE} ${GIT.INITIAL_TAG}\n\n` +
									"Then try again."
								)
							) as Effect.Effect<never, GitCommandError | GitRepositoryError>;
						}
						return Effect.fail(error);
					})
				);
			});

		const getAllTags: GitService["getAllTags"] = () =>
			Effect.gen(function* () {
				const tagOutput = yield* execGitCommand("tag", GIT.COMMANDS.TAG_SORT_VERSION.split(" "));
				const tags = tagOutput
					.split("\n")
					.filter((tag) => tag.trim() !== "")
					.map((tag) => tag.trim());

				const tagDetails: GitTag[] = [];
				for (const tag of tags) {
					const result = yield* Effect.all([
						execGitCommand("rev-list", [...GIT.COMMANDS.REV_LIST_ONE.split(" "), tag]),
						execGitCommand("log", GIT.COMMANDS.LOG_FORMAT_DATE.split(" ").concat([tag])),
						execGitCommand("tag", [...GIT.COMMANDS.TAG_FORMAT_CONTENTS.split(" "), tag])
					]).pipe(
						Effect.catchAll(() => Effect.succeed([null, null, null]))
					);

					const [commit, date, message] = result;

					if (commit && date && message) {
						tagDetails.push({
							name: tag,
							commit: commit.trim(),
							date: date.trim(),
							message: message.trim() || undefined,
						});
					}
				}

				return tagDetails;
			});

		const createTag: GitService["createTag"] = (name: string, message?: string) =>
			Effect.gen(function* () {
				const args = message ? ["-a", name, "-m", message] : ["-a", name];
				yield* execGitCommandVoid("tag", args);
			});

		const pushTag: GitService["pushTag"] = (name: string) =>
			execGitCommandVoid("push", [GIT.DEFAULT_REMOTE, name]);

		const getCommitHistory: GitService["getCommitHistory"] = (limit = 10) =>
			Effect.gen(function* () {
				const output = yield* execGitCommand("log", [
					`-${limit}`,
					GIT.COMMANDS.LOG_COMMIT_FORMAT,
				]);

				return output
					.split("\n")
					.filter((line) => line.trim() !== "")
					.map((line) => {
						const [hash, message, author, date] = line.split("|");
						return {
							hash,
							message,
							author,
							date,
						};
					});
			});

		const add: GitService["add"] = (files: string[]) =>
			execGitCommandVoid("add", files);

		const commit: GitService["commit"] = (message: string) =>
			execGitCommandVoid("commit", ["-m", message]);

		const push: GitService["push"] = (remote = GIT.DEFAULT_REMOTE, branch = GIT.DEFAULT_BRANCH) =>
			execGitCommandVoid("push", [remote, branch]);

		const createBranch: GitService["createBranch"] = (name: string) =>
			execGitCommandVoid("branch", [name]);

		const checkoutBranch: GitService["checkoutBranch"] = (name: string) =>
			execGitCommandVoid("checkout", [name]);

		const deleteBranch: GitService["deleteBranch"] = (name: string) =>
			execGitCommandVoid("branch", ["-D", name]);

		const exec: GitService["exec"] = (command: string, args: string[]) =>
			execGitCommand(command, args);

		const execVoid: GitService["execVoid"] = (command: string, args: string[]) =>
			execGitCommandVoid(command, args);

		return {
			getRepository,
			getStatus,
			getCurrentBranch,
			getCurrentCommit,
			getLatestTag,
			getAllTags,
			createTag,
			pushTag,
			getCommitHistory,
			add,
			commit,
			push,
			createBranch,
			checkoutBranch,
			deleteBranch,
			exec,
			execVoid,
		};
	}),
}) { }
