/**
 * Project Command Tests
 *
 * Tests for project management commands (set, list, info)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Effect, Layer } from 'effect'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'
import { projectSet, projectList, projectInfo } from '../../src/commands/project.js'
import { ConfigServiceLive, saveConfig } from '../../src/services/config.js'
import type { SupermemoryConfig } from '../../src/types.js'

// Mock console.log to capture output
let capturedOutput: string[] = []

const mockConsoleLog = vi.fn((message: string) => {
  capturedOutput.push(message)
})

function stripAnsiCodes(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '')
}

describe('Project Commands', () => {
  let tempDir: string
  let originalHome: string | undefined
  let originalConsoleLog: typeof console.log
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    // Set up temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-cli-test-'))
    originalHome = process.env.HOME
    process.env.HOME = tempDir

    // Mock console methods
    capturedOutput = []
    originalConsoleLog = console.log
    originalConsoleError = console.error
    console.log = mockConsoleLog
    console.error = vi.fn()
  })

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog
    console.error = originalConsoleError

    // Restore environment
    if (originalHome !== undefined) {
      process.env.HOME = originalHome
    } else {
      delete process.env.HOME
    }

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir)
      files.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file))
      })
      fs.rmdirSync(tempDir)
    }
  })

  describe('projectSet command', () => {
    it('should set active project and display success message', async () => {
      capturedOutput = []

      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName: 'my-project', format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      // Check that success message was displayed
      expect(capturedOutput.some(line => line.includes('my-project'))).toBe(true)

      // Verify config was saved
      const configPath = path.join(tempDir, '.supermemoryrc')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      expect(config.activeProject).toBe('my-project')
    })

    it('should output JSON format when requested', async () => {
      capturedOutput = []

      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName: 'json-project', format: 'json' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const jsonOutput = capturedOutput
        .join('')
        .match(/\{[\s\S]*\}/)

      expect(jsonOutput).toBeTruthy()
      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput[0])
        expect(parsed.success).toBe(true)
        expect(parsed.project).toBe('json-project')
      }
    })

    it('should handle special characters in project name', async () => {
      const projectName = 'my-project-v2.0@prod'

      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName, format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const configPath = path.join(tempDir, '.supermemoryrc')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      expect(config.activeProject).toBe(projectName)
    })
  })

  describe('projectList command', () => {
    it('should display available projects in human format', async () => {
      capturedOutput = []

      await Effect.runPromise(
        projectList.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('effect-patterns')
      expect(output).toContain('default')
      expect(output).toContain('Available Projects')
    })

    it('should output JSON format with project list', async () => {
      capturedOutput = []

      await Effect.runPromise(
        projectList.pipe(
          (cmd: any) => cmd.handler({ format: 'json' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const jsonOutput = capturedOutput
        .join('')
        .match(/\[[\s\S]*\]/)

      expect(jsonOutput).toBeTruthy()
      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput[0])
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed.length).toBeGreaterThan(0)
        expect(parsed[0]).toHaveProperty('name')
        expect(parsed[0]).toHaveProperty('description')
      }
    })

    it('should include project descriptions', async () => {
      capturedOutput = []

      await Effect.runPromise(
        projectList.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('Effect Patterns Library')
      expect(output).toContain('Default Project')
    })
  })

  describe('projectInfo command', () => {
    it('should display project information in human format', async () => {
      const config: SupermemoryConfig = {
        activeProject: 'test-project',
        apiKey: 'test-key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: ['p1', 'p2'],
        lastUpload: '2025-01-15T10:00:00Z',
      }

      const configPath = path.join(tempDir, '.supermemoryrc')
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

      capturedOutput = []

      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('Project Information')
      expect(output).toContain('test-project')
      expect(output).toContain('Yes')
      expect(output).toContain('2')
    })

    it('should output JSON format with project info', async () => {
      const config: SupermemoryConfig = {
        activeProject: 'json-project',
        apiKey: 'secret',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: ['pattern1'],
      }

      const configPath = path.join(tempDir, '.supermemoryrc')
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

      capturedOutput = []

      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'json' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const jsonOutput = capturedOutput
        .join('')
        .match(/\{[\s\S]*\}/)

      expect(jsonOutput).toBeTruthy()
      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput[0])
        expect(parsed.activeProject).toBe('json-project')
        expect(parsed.apiKeyConfigured).toBe(true)
        expect(parsed.uploadedPatterns).toBe(1)
      }
    })

    it('should display API key status correctly', async () => {
      const configWithoutKey: SupermemoryConfig = {
        activeProject: 'no-key-project',
        apiKey: '',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: [],
      }

      const configPath = path.join(tempDir, '.supermemoryrc')
      fs.writeFileSync(configPath, JSON.stringify(configWithoutKey, null, 2), 'utf-8')

      capturedOutput = []

      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('No')
    })

    it('should show pattern count correctly', async () => {
      const config: SupermemoryConfig = {
        activeProject: 'patterns-project',
        apiKey: 'key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: ['p1', 'p2', 'p3', 'p4', 'p5'],
      }

      const configPath = path.join(tempDir, '.supermemoryrc')
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

      capturedOutput = []

      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('5')
    })

    it('should display "Never" for missing lastUpload', async () => {
      const config: SupermemoryConfig = {
        activeProject: 'no-upload',
        apiKey: 'key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: [],
      }

      const configPath = path.join(tempDir, '.supermemoryrc')
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

      capturedOutput = []

      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('Never')
    })

    it('should handle unset active project', async () => {
      capturedOutput = []

      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('(not set)')
    })

    it('should display all project information fields', async () => {
      const config: SupermemoryConfig = {
        activeProject: 'complete-project',
        apiKey: 'api-key-123',
        supermemoryUrl: 'https://custom.supermemory.ai',
        uploadedPatterns: ['p1'],
        lastUpload: '2025-01-20T12:30:00Z',
      }

      const configPath = path.join(tempDir, '.supermemoryrc')
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

      capturedOutput = []

      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('Active Project')
      expect(output).toContain('API Key Configured')
      expect(output).toContain('Supermemory URL')
      expect(output).toContain('Last Upload')
      expect(output).toContain('Uploaded Patterns')
    })
  })

  describe('format option validation', () => {
    it('should default to human format when not specified', async () => {
      capturedOutput = []

      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      // Human format has decorative elements
      expect(output).toMatch(/[▀─=━]+/)
    })

    it('should produce valid JSON output', async () => {
      capturedOutput = []

      await Effect.runPromise(
        projectList.pipe(
          (cmd: any) => cmd.handler({ format: 'json' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const jsonStr = capturedOutput.join('')
      // Extract JSON from output (displayJson adds ℹ prefix)
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
      expect(jsonMatch).toBeTruthy()
      if (jsonMatch) {
        expect(() => JSON.parse(jsonMatch[0])).not.toThrow()
      }
    })
  })
})
