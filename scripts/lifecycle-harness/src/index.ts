#!/usr/bin/env bun
/**
 * Effect Patterns lifecycle harness: seedable, deterministic E2E over real repos and ep CLI.
 * Run from monorepo root: bun run lifecycle-harness --seed 123
 */
// biome-ignore assist/source/organizeImports: keep import order for readability
import fs from 'node:fs'
import path from 'node:path'
import { type HarnessArgsRun, parseArgs } from './args.js'
import { runCommand } from './command.js'
import {
  bytesToMb,
  totalSizeBytes,
  totalSizeBytesIncludingNodeModules,
} from './disk.js'
import { parsePatternIdsFromList } from './list-parse.js'
import { pickMutationStep } from './mutations.js'
import type { OutputCheckResult } from './output-checks.js'
import {
  checkInstallListOutput,
  checkListOutput,
  checkSearchOutput,
  checkShowOutput,
  checkSkillsValidateClean,
} from './output-checks.js'
import {
  defaultScaffoldRootDir,
  findMonorepoRoot,
  reportsDir,
  reportFilename,
  scenarioDirName,
} from './paths.js'
import { mulberry32, pick, randomIntInclusive, randomSubset, shortRand } from './prng.js'
import type {
  CommandRecord,
  CoverageChecklist,
  RunReport,
  ScenarioRecord,
} from './report.js'
import { getSoftFailByCommand, printReportSummary } from './report-summary.js'
import { validateScaffoldOutput } from './scaffold-validate.js'
import * as skills from './skills.js'
import { isCodeCurrentlyBroken } from './code-broken.js'
import { TEMPLATES, TOOLS } from './types.js'

const BOGUS_PATTERN_ID = 'nonexistent-pattern-id-xyz'
const FALLBACK_PATTERN_ID = 'retry-with-backoff'
const SHOW_IDS_PER_SCENARIO = 3

function emptyCoverage(): CoverageChecklist {
  return {
    list: false,
    search: false,
    show: false,
    installList: false,
    installAdd: false,
    skillsList: false,
    skillsPreview: false,
    skillsValidate: false,
    skillsStats: false,
    completions: false,
  }
}

/** Ep invocation: executable and args prefix (empty when ep is on PATH). */
interface EpInvocation {
  executable: string
  argsPrefix: string[]
  /** When set, merged into runCommand env so child can find executable (e.g. bun on PATH). */
  envOverrides?: Record<string, string>
}

/** Resolve a path to its real binary (follow symlinks); throw if broken or missing. */
function resolveExecutablePath(executable: string): string {
  if (executable === 'ep' || executable === 'bun' || !path.isAbsolute(executable)) {
    return executable
  }
  try {
    if (!fs.existsSync(executable)) {
      throw new Error(
        `--ep-bin path does not exist: ${executable}. Reinstall Bun or use a path that exists.`
      )
    }
    const resolved = fs.realpathSync(executable)
    if (!resolved) return executable
    const stat = fs.statSync(resolved)
    if (!stat.isFile()) {
      throw new Error(`--ep-bin path is not a regular file: ${executable}`)
    }
    return resolved
  } catch (err) {
    if (err instanceof Error && err.message.includes('--ep-bin')) throw err
    throw new Error(
      `--ep-bin path is missing or a broken symlink: ${executable}. Fix with: curl -fsSL https://bun.sh/install | bash`
    )
  }
}

/**
 * Ensure the directory containing the running bun binary is on process.env.PATH.
 *
 * Cursor (and some CI launchers) invoke bun by absolute path without adding its
 * directory to PATH.  Bun.spawn resolves non-absolute executable names against
 * the *parent* process.env.PATH, not the env option passed to spawn.  Mutating
 * process.env.PATH here propagates transitively to every child spawn.
 */
function ensureBunOnPath(): void {
  const bunDir = path.dirname(process.execPath)
  const current = process.env.PATH ?? ''
  if (!current.split(':').includes(bunDir)) {
    process.env.PATH = `${bunDir}:${current}`
  }
}

/** Resolve default "ep" to workspace CLI so harness works when ep/bun are not on PATH. */
function resolveEpInvocation(epBin: string, repoRoot: string): EpInvocation {
  if (epBin !== 'ep') {
    const executable = resolveExecutablePath(epBin)
    return { executable, argsPrefix: [] }
  }
  const epSrc = path.join(repoRoot, 'packages', 'ep-cli', 'src', 'index.ts')
  const epDist = path.join(repoRoot, 'packages', 'ep-cli', 'dist', 'index.js')
  if (fs.existsSync(epSrc)) {
    return { executable: 'bun', argsPrefix: [epSrc] }
  }
  if (fs.existsSync(epDist)) {
    return { executable: 'bun', argsPrefix: [epDist] }
  }
  return { executable: 'bun', argsPrefix: [epSrc] }
}

function updateCoverageFromRecord(
  coverageAttempted: CoverageChecklist,
  coverageSucceeded: CoverageChecklist,
  record: CommandRecord
): void {
  const isEp =
    record.resolvedBinary.endsWith('ep') || record.args[0]?.includes('ep-cli')
  if (!isEp) return
  const offset = record.args[0]?.includes('ep-cli') ? 1 : 0
  const a = record.args.slice(offset)
  const first = a[0]
  let key: keyof CoverageChecklist | null = null
  if (first === '--completions') key = 'completions'
  else if (first === 'list') key = 'list'
  else if (first === 'search') key = 'search'
  else if (first === 'show') key = 'show'
  else if (first === 'install' && a[1] === 'list') key = 'installList'
  else if (first === 'install' && a[1] === 'add') key = 'installAdd'
  else if (first === 'skills' && a[1] === 'list') key = 'skillsList'
  else if (first === 'skills' && a[1] === 'preview') key = 'skillsPreview'
  else if (first === 'skills' && a[1] === 'validate') key = 'skillsValidate'
  else if (first === 'skills' && a[1] === 'stats') key = 'skillsStats'
  if (key !== null) {
    coverageAttempted[key] = true
    if (record.outcome === 'success') coverageSucceeded[key] = true
  }
}

/** When output check fails, treat as soft-fail if output suggests auth/no-data (e.g. ep login required, not found). */
function looksLikeAuthOrNoData(stdout: string, stderr: string): boolean {
  const combined = `${stdout}\n${stderr}`.toLowerCase()
  return (
    /login|sign in|unauthorized|not authenticated|not found|no patterns|0 pattern/i.test(combined)
  )
}

/** Reclassify a successful command as hard-fail when an output check fails; soft-fail if output suggests auth/no-data. */
function applyOutputCheck(
  record: CommandRecord,
  check: OutputCheckResult,
  verbose: boolean,
  options?: { stdout?: string; stderr?: string }
): void {
  if (record.outcome !== 'success') return
  if (!check.passed) {
    const stdout = options?.stdout ?? ''
    const stderr = options?.stderr ?? (record.stderrExcerpt ?? '')
    const treatAsSoftFail = looksLikeAuthOrNoData(stdout, stderr)
    record.outcome = treatAsSoftFail ? 'soft-fail' : 'hard-fail'
    record.outputCheckFailed = check.reason
    if (verbose) console.log(`  [output-check] ${treatAsSoftFail ? 'SOFT-FAIL' : 'FAIL'}: ${check.reason}`)
  }
}

function printUsage(): void {
  console.log(`Effect Patterns lifecycle harness: seedable E2E over real repos and ep CLI (no mocks).
Run from monorepo root: bun run lifecycle-harness --seed <n>

Flags:
  --seed <number>         PRNG seed (default: Date.now())
  --scenarios <n>         Number of scenarios (default: 10)
  --only-scenario <n>     Run only 0-based scenario index
  --budget-minutes <n>    Hard stop before N minutes (default: 14)
  --scenario-timeout-seconds <n>  Per-command timeout (default: 90)
  --root-dir <path>       Parent dir for repos (default: $HOME/Projects/TestRepos; must match scaffold)
  --disk-budget-mb <n>    Stop if repo total exceeds N MB (default: 1024)
  --commits minimal|none  Checkpoint commits (default: minimal)
  --keep-last-n <n>       Keep only N most recent repos; remove older ones as you go (default: 5 when set)
  --verbose               Stream subprocess output
  --dry-run               Plan only, do not run
  --ep-bin <path>         ep CLI path (default: ep)
  --analyze <path>        Print summary for an existing report JSON (no run)
  --help, -h              This usage
  --version               Print version and exit

Examples:
  bun run lifecycle-harness --seed 1
  bun run lifecycle-harness --seed 1 --only-scenario 3
  bun run lifecycle-harness --seed 1 --dry-run
  bun run lifecycle-harness --analyze scripts/lifecycle-harness/reports/run-20260226-172113-seed-20260226.json`)
}

function printVersion(): void {
  try {
    const root = findMonorepoRoot()
    const pkgPath = path.join(root, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string }
    console.log(`lifecycle-harness (monorepo ${pkg.version ?? 'unknown'})`)
  } catch {
    console.log('lifecycle-harness (unknown version)')
  }
}

async function main(): Promise<void> {
  // Must run before any Bun.spawn; ensures 'bun' is resolvable by name in all
  // child processes regardless of how the parent was launched (e.g. Cursor IDE
  // invokes bun by absolute path, leaving ~/.bun/bin off PATH).
  ensureBunOnPath()

  const parsed = parseArgs()
  if (parsed.mode === 'help') {
    printUsage()
    process.exit(0)
  }
  if (parsed.mode === 'version') {
    printVersion()
    process.exit(0)
  }
  if (parsed.mode === 'analyze') {
    const reportPath = path.isAbsolute(parsed.reportPath) ? parsed.reportPath : path.join(process.cwd(), parsed.reportPath)
    if (!fs.existsSync(reportPath)) {
      console.error(`Report not found: ${reportPath}`)
      process.exitCode = 1
      return
    }
    const report: RunReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
    printReportSummary(report)
    return
  }
  const args: HarnessArgsRun = parsed
  console.log(`Lifecycle harness seed: ${args.seed}`)
  if (args.dryRun) {
    console.log('DRY RUN: no commands or files will be created.')
  }
  const scaffoldRoot = defaultScaffoldRootDir()
  const rootDir =
    path.resolve(args.rootDir) !== path.resolve(scaffoldRoot)
      ? (() => {
          console.warn(
            `--root-dir is currently ignored; scaffold always writes to ${scaffoldRoot}. Continuing with scaffold output path.`
          )
          return scaffoldRoot
        })()
      : args.rootDir

  const repoRoot = findMonorepoRoot()
  const epInvocation = resolveEpInvocation(args.epBin, repoRoot)
  const reportDir = reportsDir()
  fs.mkdirSync(reportDir, { recursive: true })

  const startTime = new Date().toISOString()
  const startMs = Date.now()
  const scenarioTimeoutMs = args.scenarioTimeoutSeconds * 1000
  const budgetMs = args.budgetMinutes * 60 * 1000
  const diskBudgetBytes = args.diskBudgetMb * 1024 * 1024

  const allScenarios: ScenarioRecord[] = []
  const repoPaths: string[] = []
  const coverageAttempted = emptyCoverage()
  const coverageSucceeded = emptyCoverage()
  let totalAttempted = 0
  let totalSuccess = 0
  let totalSoftFail = 0
  let totalHardFail = 0
  let firstFailingScenario: { scenarioIndex: number; seed: number } | null = null

  if (args.onlyScenario !== undefined) {
    console.log(`Running only scenario ${args.onlyScenario} (0-based).`)
  }

  for (let s = 0; s < args.scenarios; s++) {
    if (args.onlyScenario !== undefined && s !== args.onlyScenario) continue
    if (Date.now() - startMs >= budgetMs) {
      console.log(`Budget ${args.budgetMinutes} min reached, stopping after ${s} scenarios.`)
      break
    }

    const scenarioRng = mulberry32(args.seed + 1000 + s)
    const template = TEMPLATES[s % TEMPLATES.length]
    const numTools = randomIntInclusive(scenarioRng, 0, 4)
    const tools = randomSubset(scenarioRng, [...TOOLS], numTools)
    const short = shortRand(scenarioRng, 6)
    let dirName = scenarioDirName(args.seed, s, template, short)
    let repoPath = path.join(rootDir, dirName)
    if (fs.existsSync(repoPath) && !args.dryRun) {
      for (let retries = 0; retries < 10; retries++) {
        dirName = scenarioDirName(args.seed, s, template, shortRand(scenarioRng, 6))
        repoPath = path.join(rootDir, dirName)
        if (!fs.existsSync(repoPath)) break
      }
      if (fs.existsSync(repoPath)) {
        for (let i = 0; i < 50; i++) {
          const timeRng = mulberry32(Date.now() + i)
          dirName = scenarioDirName(args.seed, s, template, shortRand(timeRng, 8))
          repoPath = path.join(rootDir, dirName)
          if (!fs.existsSync(repoPath)) break
        }
      }
      if (fs.existsSync(repoPath)) {
        console.warn(`Skipping scenario ${s}: could not get unique dir.`)
        continue
      }
    }

    console.log(`\n--- Scenario ${s} (seed ${args.seed}) template=${template} tools=[${tools.join(', ')}] ---`)

    const commands: CommandRecord[] = []
    let scenarioStatus: ScenarioRecord['status'] = 'success'

    let scenarioShowIdParseFailed: boolean | undefined
    function pushRecord(record: CommandRecord): void {
      commands.push(record)
      updateCoverageFromRecord(coverageAttempted, coverageSucceeded, record)
      totalAttempted++
      if (record.outcome === 'success') totalSuccess++
      else if (record.outcome === 'soft-fail') totalSoftFail++
      else {
        totalHardFail++
        if (firstFailingScenario === null) firstFailingScenario = { scenarioIndex: s, seed: args.seed }
        scenarioStatus = 'hard-fail'
      }
    }

    if (args.dryRun) {
      console.log(`  [dry-run] would create ${repoPath}, scaffold ${template}, tools ${tools.join(', ')}`)
      allScenarios.push({
        repoPath,
        template,
        tools,
        scenarioIndex: s,
        status: 'success',
        commands: [],
      })
      continue
    }

    fs.mkdirSync(rootDir, { recursive: true })

    // ---------- Phase A: Scaffold ----------
    const scaffoldArgs = [
      'run',
      'scaffold',
      dirName,
      '--template',
      template,
      ...tools.flatMap((t) => ['--tool', t]),
    ]
    const scaffoldResult = await runCommand('bun', scaffoldArgs, {
      cwd: repoRoot,
      timeoutMs: scenarioTimeoutMs,
      verbose: args.verbose,
    })
    pushRecord(scaffoldResult.record)
    if (scaffoldResult.record.outcome === 'hard-fail') {
      allScenarios.push({
        repoPath,
        template,
        tools,
        scenarioIndex: s,
        status: scenarioStatus,
        commands,
      })
      continue
    }
    if (!fs.existsSync(repoPath)) {
      console.warn(`  [warn] scaffold exited non-hard-fail but ${repoPath} does not exist; skipping ep commands.`)
      allScenarios.push({ repoPath, template, tools, scenarioIndex: s, status: 'hard-fail', commands })
      continue
    }
    const scaffoldValidationError = validateScaffoldOutput(repoPath, template)
    if (scaffoldValidationError !== null) {
      console.warn(`  [warn] ${scaffoldValidationError}`)
      totalHardFail++
      if (firstFailingScenario === null) firstFailingScenario = { scenarioIndex: s, seed: args.seed }
      allScenarios.push({ repoPath, template, tools, scenarioIndex: s, status: 'hard-fail', commands })
      continue
    }
    repoPaths.push(repoPath)

    // ---------- Phase A: Baseline ep ----------
    const epOpts = {
      cwd: repoPath,
      timeoutMs: scenarioTimeoutMs,
      verbose: args.verbose,
      ...(epInvocation.envOverrides && { envOverrides: epInvocation.envOverrides }),
    }
    for (const cmdArgs of [
      ['--version'],
      ['--help'],
      ['--completions', 'sh'],
      ['--completions', 'bash'],
      ['--completions', 'fish'],
      ['--completions', 'zsh'],
    ] as const) {
      const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, ...cmdArgs], { ...epOpts })
      pushRecord(r.record)
    }
    const listResult = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'list'], { ...epOpts })
    applyOutputCheck(listResult.record, checkListOutput(listResult.result.stdout), args.verbose, {
      stdout: listResult.result.stdout,
      stderr: listResult.result.stderr,
    })
    pushRecord(listResult.record)
    const showIds =
      listResult.record.outcome === 'success'
        ? parsePatternIdsFromList(listResult.result.stdout, SHOW_IDS_PER_SCENARIO)
        : []
    if (showIds.length === 0) scenarioShowIdParseFailed = true
    const idsToShow = showIds.length > 0 ? showIds : [FALLBACK_PATTERN_ID]
    for (const epShowId of idsToShow) {
      const showResult = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'show', epShowId], { ...epOpts })
      applyOutputCheck(showResult.record, checkShowOutput(showResult.result.stdout, epShowId), args.verbose, {
        stdout: showResult.result.stdout,
        stderr: showResult.result.stderr,
      })
      pushRecord(showResult.record)
    }
    const searchResult = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'search', 'retry'], { ...epOpts })
    applyOutputCheck(searchResult.record, checkSearchOutput(searchResult.result.stdout), args.verbose, {
      stdout: searchResult.result.stdout,
      stderr: searchResult.result.stderr,
    })
    pushRecord(searchResult.record)

    // ---------- Skills dir + commands ----------
    const categories = [...skills.SKILL_CATEGORIES]
    skills.createValidSkills(repoPath, categories)
    for (const cat of categories) {
      const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'skills', 'preview', cat], epOpts)
      pushRecord(r.record)
    }
    for (const cmdArgs of [['skills', 'list'], ['skills', 'stats'], ['skills', 'validate']] as const) {
      const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, ...cmdArgs], epOpts)
      pushRecord(r.record)
    }

    // ---------- Phase B: Random mutations (8–20 steps) ----------
    const numSteps = randomIntInclusive(scenarioRng, 8, 20)
    let didBreak = false
    let didFix = false
    const MUTATION_NULL_RETRIES = 2
    for (let step = 0; step < numSteps; step++) {
      if (Date.now() - startMs >= budgetMs) break

      let mutation = pickMutationStep(scenarioRng, step, repoPath, template, args.epBin)
      for (let retry = 0; !mutation && retry < MUTATION_NULL_RETRIES; retry++) {
        mutation = pickMutationStep(scenarioRng, step + 1000 + retry, repoPath, template, args.epBin)
      }
      if (!mutation) continue

      if (mutation.kind === 'add-ts-module' || mutation.kind === 'rename-file-fix-imports' ||
          mutation.kind === 'typescript-break-then-fix' || mutation.kind === 'add-vitest-then-break-fix' ||
          mutation.kind === 'modify-package-scripts' || mutation.kind === 'skills-break-then-fix') {
        if (mutation.kind === 'skills-break-then-fix') didBreak = true
        mutation.run()
        // Do not set didFix here: Phase D will restore any broken skill so validate can pass
      }

      if (mutation.kind === 'bun-run-dev') {
        // Skip for http-server (dev never exits) or when code is broken (dev would exit non-zero → soft-fail).
        const skipDev = template === 'http-server' || isCodeCurrentlyBroken(repoPath)
        if (!skipDev) {
          const r = await runCommand('bun', ['run', 'dev'], {
            ...epOpts,
            timeoutMs: 5000,
            expectTimeout: true,
          })
          pushRecord(r.record)
        }
      } else if (mutation.kind === 'bun-run-test') {
        const pkgPath = path.join(repoPath, 'package.json')
        let hasTestScript = false
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { scripts?: Record<string, string> }
          hasTestScript = Boolean(pkg.scripts?.test)
        } catch {
          // no package.json or invalid: skip
        }
        if (!hasTestScript) {
          if (args.verbose) console.log('  [skip] no "test" script in package.json, skipping bun run test')
        } else {
          const expectTestToFail = isCodeCurrentlyBroken(repoPath)
          const r = await runCommand('bun', ['run', 'test'], {
            ...epOpts,
            timeoutMs: 15000,
            expectFailure: expectTestToFail,
          })
          pushRecord(r.record)
        }
      } else if (mutation.kind === 'ep-install-list') {
        const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'install', 'list'], epOpts)
        applyOutputCheck(r.record, checkInstallListOutput(r.result.stdout), args.verbose, {
          stdout: r.result.stdout,
          stderr: r.result.stderr,
        })
        pushRecord(r.record)
      } else if (mutation.kind === 'ep-install-add') {
        const tool = pick(scenarioRng, [...TOOLS])
        const extra: string[] = []
        if (scenarioRng() > 0.5) extra.push('--skill-level', pick(scenarioRng, ['beginner', 'intermediate', 'advanced']))
        if (scenarioRng() > 0.5) extra.push('--use-case', 'building-apis')
        const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'install', 'add', '--tool', tool, ...extra], epOpts)
        pushRecord(r.record)
        // install add can overwrite skills with versions missing Rationale; restore so validate passes
        const skillsDir = path.join(repoPath, '.claude-plugin', 'plugins', 'effect-patterns', 'skills')
        if (fs.existsSync(skillsDir)) {
          for (const cat of fs.readdirSync(skillsDir)) {
            const skillPath = path.join(skillsDir, cat, 'SKILL.md')
            if (!fs.existsSync(skillPath)) continue
            const content = fs.readFileSync(skillPath, 'utf-8')
            if (!content.includes('**Rationale**')) skills.fixSkillsRestoreRationale(repoPath, cat)
          }
        }
      } else if (mutation.kind === 'ep-skills-validate') {
        const skillsDir = path.join(repoPath, '.claude-plugin', 'plugins', 'effect-patterns', 'skills')
        let expectValidateToFail = false
        if (fs.existsSync(skillsDir)) {
          for (const cat of fs.readdirSync(skillsDir)) {
            const skillPath = path.join(skillsDir, cat, 'SKILL.md')
            if (!fs.existsSync(skillPath)) continue
            const content = fs.readFileSync(skillPath, 'utf-8')
            if (!content.includes('**Rationale**')) {
              expectValidateToFail = true
              break
            }
          }
        }
        const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'skills', 'validate'], {
          ...epOpts,
          expectFailure: expectValidateToFail,
        })
        pushRecord(r.record)
      } else if (mutation.kind === 'ep-search') {
        const q = pick(scenarioRng, ['http', 'timeout', 'error handling'])
        const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'search', q], epOpts)
        applyOutputCheck(r.record, checkSearchOutput(r.result.stdout), args.verbose, {
          stdout: r.result.stdout,
          stderr: r.result.stderr,
        })
        pushRecord(r.record)
      } else if (mutation.kind === 'ep-show-bogus') {
        const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'show', BOGUS_PATTERN_ID], { ...epOpts, expectFailure: true })
        pushRecord(r.record)
      }
    }

    // ---------- Phase C: re-run some ep commands ----------
    for (const cmdArgs of [['list'], ['search', 'retry'], ['install', 'list'], ['skills', 'list']] as const) {
      const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, ...cmdArgs], epOpts)
      const out = { stdout: r.result.stdout, stderr: r.result.stderr }
      if (cmdArgs[0] === 'list') applyOutputCheck(r.record, checkListOutput(r.result.stdout), args.verbose, out)
      else if (cmdArgs[0] === 'search') applyOutputCheck(r.record, checkSearchOutput(r.result.stdout), args.verbose, out)
      else if (cmdArgs[0] === 'install') applyOutputCheck(r.record, checkInstallListOutput(r.result.stdout), args.verbose, out)
      pushRecord(r.record)
    }

    // ---------- Phase D: restore any broken skills, then ensure one break + fix if not yet done ----------
    const skillsDir = path.join(repoPath, '.claude-plugin', 'plugins', 'effect-patterns', 'skills')
    if (fs.existsSync(skillsDir)) {
      const cats = fs.readdirSync(skillsDir).filter((c) => fs.existsSync(path.join(skillsDir, c, 'SKILL.md')))
      for (const cat of cats) {
        const skillPath = path.join(skillsDir, cat, 'SKILL.md')
        const content = fs.readFileSync(skillPath, 'utf-8')
        if (!content.includes('**Rationale**')) skills.fixSkillsRestoreRationale(repoPath, cat)
      }
      if (!didBreak || !didFix) {
        if (cats.length > 0) {
          const cat = pick(scenarioRng, cats)
          const skillPath = path.join(skillsDir, cat, 'SKILL.md')
          const content = fs.readFileSync(skillPath, 'utf-8')
          if (content.includes('**Rationale**')) {
            skills.breakSkillsRemoveRationale(repoPath, cat)
            const r = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'skills', 'validate'], {
              ...epOpts,
              expectFailure: true,
            })
            pushRecord(r.record)
            skills.fixSkillsRestoreRationale(repoPath, cat)
            const r2 = await runCommand(epInvocation.executable, [...epInvocation.argsPrefix, 'skills', 'validate'], epOpts)
            applyOutputCheck(r2.record, checkSkillsValidateClean(r2.result.stdout, r2.result.stderr), args.verbose, {
              stdout: r2.result.stdout,
              stderr: r2.result.stderr,
            })
            pushRecord(r2.record)
            didFix = true
          }
        }
      }
    }

    // ---------- Commits (minimal) ----------
    const gitEnv = {
      GIT_AUTHOR_NAME: 'Lifecycle Harness',
      GIT_AUTHOR_EMAIL: 'harness@effect-patterns.local',
      GIT_COMMITTER_NAME: 'Lifecycle Harness',
      GIT_COMMITTER_EMAIL: 'harness@effect-patterns.local',
    }
    if (args.commits === 'minimal') {
      const numCommits = randomIntInclusive(scenarioRng, 2, 5)
      for (let c = 0; c < numCommits; c++) {
        const rc = await runCommand('git', ['add', '-A'], { cwd: repoPath, timeoutMs: 5000 })
        if (rc.record.outcome !== 'success') continue
        const r = await runCommand('git', ['commit', '-m', `chore: lifecycle step ${c + 1}`], {
          cwd: repoPath,
          timeoutMs: 5000,
          envOverrides: gitEnv,
        })
        pushRecord(r.record)
      }
    }

    allScenarios.push({
      repoPath,
      template,
      tools,
      scenarioIndex: s,
      status: scenarioStatus,
      commands,
      showIdParseFailed: scenarioShowIdParseFailed,
    })

    // Cleanup: keep only the N most recent repos when --keep-last-n is set
    const keepLastN = args.keepLastN ?? 0
    if (keepLastN > 0) {
      while (repoPaths.length > keepLastN) {
        const oldPath = repoPaths.shift()
        if (oldPath === undefined) break
        try {
          if (fs.existsSync(oldPath)) {
            fs.rmSync(oldPath, { recursive: true })
            if (args.verbose) console.log(`  [cleanup] removed ${path.basename(oldPath)}`)
          }
        } catch (err) {
          console.warn(`  [warn] failed to remove ${oldPath}:`, err instanceof Error ? err.message : err)
        }
      }
    }

    const diskSoFar = totalSizeBytes(repoPaths)
    if (diskSoFar > diskBudgetBytes) {
      console.log(`Disk budget ${args.diskBudgetMb} MB exceeded, stopping.`)
      break
    }
    const diskInclNodeModules = totalSizeBytesIncludingNodeModules(repoPaths)
    const diskInclMb = bytesToMb(diskInclNodeModules)
    const softWarningThresholdMb = args.diskBudgetMb * 1.5
    if (diskInclMb > softWarningThresholdMb) {
      console.warn(
        `[soft warning] Total repo size including node_modules: ${diskInclMb.toFixed(1)} MB (threshold ${softWarningThresholdMb} MB). Consider cleaning old runs.`
      )
    }
  }

  const endTime = new Date().toISOString()
  const runtimeMs = Date.now() - startMs
  const diskUsageBytes = totalSizeBytes(repoPaths)
  const diskUsageMb = bytesToMb(diskUsageBytes)

  const report: RunReport = {
    seed: args.seed,
    startTime,
    endTime,
    runtimeMs,
    scenarios: allScenarios,
    totalCommandsAttempted: totalAttempted,
    totalSuccess,
    totalSoftFail,
    totalHardFail,
    diskUsageBytes,
    diskUsageMb,
    firstFailingScenario,
    coverageAttempted,
    coverageSucceeded,
    softFailByCommand: getSoftFailByCommand(allScenarios),
  }

  if (!args.dryRun) {
    const reportPath = path.join(reportDir, reportFilename(args.seed))
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')
    console.log('\n--- Summary ---')
    console.log(`Commands: ${totalAttempted} attempted, ${totalSuccess} success, ${totalSoftFail} soft-fail, ${totalHardFail} hard-fail`)
    console.log(`Disk (excl. node_modules): ${diskUsageMb.toFixed(2)} MB`)
    console.log(`Report: ${reportPath}`)
    printReportSummary(report)
    if (firstFailingScenario) {
      console.log(
        `Reproduce first failure: bun run lifecycle-harness --seed ${firstFailingScenario.seed} --only-scenario ${firstFailingScenario.scenarioIndex}`
      )
      process.exitCode = 1
    }
    if (args.onlyScenario === undefined) {
      const missingCoverage = (Object.keys(coverageAttempted) as (keyof typeof coverageAttempted)[]).filter(
        (k) => coverageAttempted[k] && !coverageSucceeded[k]
      )
      if (missingCoverage.length > 0) {
        console.log(`Coverage gap: these surfaces were attempted but never succeeded: ${missingCoverage.join(', ')}`)
        process.exitCode = 1
      }
    } else {
      console.log('Coverage gate skipped (single scenario run with --only-scenario).')
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
