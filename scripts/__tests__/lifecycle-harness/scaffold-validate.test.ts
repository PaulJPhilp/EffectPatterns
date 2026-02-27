/**
 * Unit tests for scaffold-validate: validateScaffoldOutput, getRequiredFilesForTemplate.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getRequiredFilesForTemplate,
  validateScaffoldOutput,
} from '../../lifecycle-harness/src/scaffold-validate.js'

describe('getRequiredFilesForTemplate', () => {
  it('returns required paths for each template', () => {
    expect(getRequiredFilesForTemplate('basic')).toEqual(['package.json', 'src/index.ts'])
    expect(getRequiredFilesForTemplate('service')).toEqual([
      'package.json',
      'src/index.ts',
      'src/service.ts',
      'src/service.test.ts',
    ])
    expect(getRequiredFilesForTemplate('cli')).toEqual(['package.json', 'src/index.ts', 'src/commands.ts'])
    expect(getRequiredFilesForTemplate('http-server')).toEqual(['package.json', 'src/index.ts', 'src/routes.ts'])
  })
})

describe('validateScaffoldOutput', () => {
  it('returns null when all required files exist', () => {
    const tmp = path.join(import.meta.dirname, `scaffold-validate-${Date.now()}`)
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'package.json'), '{}', 'utf-8')
    fs.writeFileSync(path.join(tmp, 'src', 'index.ts'), '', 'utf-8')
    try {
      expect(validateScaffoldOutput(tmp, 'basic')).toBe(null)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('returns error when package.json is missing', () => {
    const tmp = path.join(import.meta.dirname, `scaffold-validate-${Date.now()}`)
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'src', 'index.ts'), '', 'utf-8')
    try {
      const err = validateScaffoldOutput(tmp, 'basic')
      expect(err).not.toBe(null)
      expect(err).toContain('package.json')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('returns error when template-specific file is missing', () => {
    const tmp = path.join(import.meta.dirname, `scaffold-validate-${Date.now()}`)
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'package.json'), '{}', 'utf-8')
    fs.writeFileSync(path.join(tmp, 'src', 'index.ts'), '', 'utf-8')
    fs.writeFileSync(path.join(tmp, 'src', 'commands.ts'), '', 'utf-8')
    try {
      expect(validateScaffoldOutput(tmp, 'cli')).toBe(null)
      fs.rmSync(path.join(tmp, 'src', 'commands.ts'))
      const err = validateScaffoldOutput(tmp, 'cli')
      expect(err).not.toBe(null)
      expect(err).toContain('src/commands.ts')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
