#!/usr/bin/env bun
/**
 * Pre-deploy environment validation.
 *
 * Validates that required environment variables are set before
 * running remote tests or deploying. Exits non-zero on failure.
 *
 * Usage:
 *   bun run scripts/check-env-for-deploy.ts
 *   bun run env:check
 */

const env = process.env.MCP_ENV || "local"

interface EnvRule {
  name: string
  required: boolean
  description: string
}

const COMMON_RULES: EnvRule[] = [
  {
    name: "MCP_ENV",
    required: false,
    description: "Target environment (local/staging/production). Defaults to 'local'.",
  },
]

const REMOTE_RULES: EnvRule[] = [
  {
    name: "PATTERN_API_KEY",
    required: true,
    description: "API key for authenticating MCP tool calls",
  },
]

const STAGING_RULES: EnvRule[] = [
  {
    name: "STAGING_API_KEY",
    required: true,
    description: "Staging-specific API key (fallback: PATTERN_API_KEY)",
  },
]

const PRODUCTION_RULES: EnvRule[] = [
  {
    name: "PRODUCTION_API_KEY",
    required: true,
    description: "Production-specific API key (fallback: PATTERN_API_KEY)",
  },
]

function getRulesForEnv(env: string): EnvRule[] {
  const rules = [...COMMON_RULES]

  if (env === "staging") {
    rules.push(...STAGING_RULES)
  } else if (env === "production") {
    rules.push(...PRODUCTION_RULES)
  }

  if (env !== "local") {
    rules.push(...REMOTE_RULES)
  }

  return rules
}

function isPlaceholder(value: string): boolean {
  const placeholders = [
    "your-key",
    "your-api-key",
    "changeme",
    "placeholder",
    "xxx",
    "TODO",
  ]
  return placeholders.some((p) => value.toLowerCase().includes(p))
}

// ── Main ────────────────────────────────────────────────────

const rules = getRulesForEnv(env)
const errors: string[] = []
const warnings: string[] = []

for (const rule of rules) {
  const value = process.env[rule.name]

  if (rule.required) {
    // For staging/production API keys, also check the generic fallback
    const hasGenericFallback =
      (rule.name === "STAGING_API_KEY" || rule.name === "PRODUCTION_API_KEY") &&
      process.env.PATTERN_API_KEY &&
      !isPlaceholder(process.env.PATTERN_API_KEY)

    if (!value || value.trim() === "") {
      if (hasGenericFallback) {
        warnings.push(
          `  ⚠ ${rule.name} not set, but PATTERN_API_KEY is available as fallback`,
        )
      } else {
        errors.push(`  ✗ ${rule.name} — ${rule.description}`)
      }
    } else if (isPlaceholder(value)) {
      errors.push(`  ✗ ${rule.name} appears to be a placeholder value`)
    }
  }
}

console.log(`Environment check for: ${env}\n`)

if (errors.length === 0 && warnings.length === 0) {
  console.log(`✓ All required environment variables are set for ${env}`)
  process.exit(0)
}

if (warnings.length > 0) {
  console.log("Warnings:")
  for (const w of warnings) {
    console.log(w)
  }
  console.log()
}

if (errors.length > 0) {
  console.error(`Missing or invalid environment variables for ${env}:\n`)
  for (const e of errors) {
    console.error(e)
  }
  console.error(
    `\nSet the required variables and retry. See MCP-README.md for details.`,
  )
  process.exit(1)
}
