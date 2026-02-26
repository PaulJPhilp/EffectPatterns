/**
 * Subprocess execution via Bun.spawn with capture, timeout, and optional verbose streaming.
 */


// biome-ignore assist/source/organizeImports: <>
import  fs from 'node:fs'
import path from 'node:path'
import type { CommandRecord } from './report.js'
import { truncateStderr, classifyOutcome } from './report.js'

const CAPTURE_MAX = 200 * 1024

export interface RunResult {
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  timedOut: boolean
}

export interface RunCommandOptions {
  cwd: string
  timeoutMs?: number
  verbose?: boolean
  expectFailure?: boolean
  /** Env overrides (only those set by harness) for report reproducibility. */
  envOverrides?: Record<string, string>
}

/**
 * Run a command; capture stdout/stderr (bounded); support timeout.
 * In verbose mode, stream live output while still capturing.
 */
export async function runCommand(
  executable: string,
  args: string[],
  options: RunCommandOptions
): Promise<{ result: RunResult; record: CommandRecord }> {
  const {
    cwd,
    timeoutMs = 60_000,
    verbose = false,
    expectFailure = false,
    envOverrides = {},
  } = options
  const start = Date.now()
  const env = { ...process.env, ...envOverrides }

  let toSpawn = executable
  if (path.isAbsolute(executable)) {
    if (!fs.existsSync(executable)) {
      throw new Error(
        `Executable path does not exist: ${executable}. Reinstall or use --ep-bin with a path that exists.`
      )
    }
    try {
      const resolved = fs.realpathSync(executable)
      if (resolved) toSpawn = resolved
    } catch {
      throw new Error(
        `Executable path is a broken symlink: ${executable}. Fix with: curl -fsSL https://bun.sh/install | bash`
      )
    }
  }

  let proc: ReturnType<typeof Bun.spawn>
  try {
    proc = Bun.spawn([toSpawn, ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ENOENT')) {
      // Common causes: (1) "bun" not on PATH, (2) cwd doesn't exist (scaffold failed to create repo).
      const hint =
        toSpawn === 'bun' || toSpawn.includes('/bun')
          ? `"${toSpawn}" not found – check PATH, or run "bun install" in the monorepo root if scaffold dependencies are missing`
          : `Executable not found: "${toSpawn}"`
      throw new Error(`${msg}\n\nHint: ${hint}`)
    }
    throw err
  }

  const stdoutChunks: Buffer[] = []
  const stderrChunks: Buffer[] = []
  const stdoutLen = { current: 0 }
  const stderrLen = { current: 0 }

  async function drain(
    stream: ReadableStream<Uint8Array>,
    into: Buffer[],
    maxLen: { current: number },
    mirror: (chunk: Uint8Array) => void
  ): Promise<void> {
    const reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          if (verbose) mirror(value)
          if (maxLen.current < CAPTURE_MAX) {
            into.push(Buffer.from(value))
            maxLen.current += value.length
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  const stdoutStream = proc.stdout as unknown as ReadableStream<Uint8Array>
  const stderrStream = proc.stderr as unknown as ReadableStream<Uint8Array>
  const stdoutPromise = drain(stdoutStream, stdoutChunks, stdoutLen, (chunk) => process.stdout.write(chunk))
  const stderrPromise = drain(stderrStream, stderrChunks, stderrLen, (chunk) => process.stderr.write(chunk))

  let timedOut = false
  const timeoutId = timeoutMs
    ? setTimeout(() => {
        timedOut = true
        proc.kill()
        // Note: child processes (e.g. bun run dev) may survive; see README.
      }, timeoutMs)
    : null

  const exitCode = await proc.exited
  if (timeoutId) clearTimeout(timeoutId)
  await Promise.all([stdoutPromise, stderrPromise])

  const durationMs = Date.now() - start
  const stdout = Buffer.concat(stdoutChunks).toString('utf-8')
  const stderr = Buffer.concat(stderrChunks).toString('utf-8')

  const outcome = classifyOutcome(exitCode, timedOut, stderr, { expectFailure })
  const record: CommandRecord = {
    resolvedBinary: executable,
    args,
    cwd,
    envOverrides: { ...envOverrides },
    timeoutMs: timeoutMs ?? undefined,
    exitCode: timedOut ? -1 : exitCode,
    durationMs,
    outcome,
    ...(expectFailure ? { expectedToFail: true } : {}),
    stderrExcerpt: stderr ? truncateStderr(stderr) : undefined,
  }

  return {
    result: { exitCode: timedOut ? -1 : exitCode, stdout, stderr, durationMs, timedOut },
    record,
  }
}
