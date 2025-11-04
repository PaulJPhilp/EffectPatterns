/**
 * Integration Tests for sm-cli
 *
 * End-to-end workflow tests combining multiple commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Effect, Layer } from 'effect'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'
import { NodeContext } from '@effect/platform-node'
import { projectSet, projectList, projectInfo } from '../src/commands/project.js'
import { ConfigServiceLive, loadConfig, saveConfig } from '../src/services/config.js'
import type { SupermemoryConfig } from '../src/types.js'

let capturedOutput: string[] = []

const mockConsoleLog = vi.fn((message: string) => {
  capturedOutput.push(message)
})

describe('SM-CLI Integration Tests', () => {
  let tempDir: string
  let originalHome: string | undefined
  let originalConsoleLog: typeof console.log
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    // Set up temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-cli-integration-'))
    originalHome = process.env.HOME
    process.env.HOME = tempDir

    // Mock console
    capturedOutput = []
    originalConsoleLog = console.log
    originalConsoleError = console.error
    console.log = mockConsoleLog
    console.error = vi.fn()

    // Clear API key from environment for tests
    delete process.env.SUPERMEMORY_API_KEY
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

  describe('Full project workflow', () => {
    it('should complete a full project management workflow', async () => {
      // Step 1: List available projects (no config yet)
      capturedOutput = []

      await Effect.runPromise(
        projectList.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      expect(capturedOutput.some(line => line.includes('effect-patterns'))).toBe(true)

      // Step 2: Set active project
      capturedOutput = []

      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName: 'my-first-project', format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      expect(capturedOutput.some(line => line.includes('my-first-project'))).toBe(true)

      // Step 3: Verify project info shows the updated project
      capturedOutput = []

      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('my-first-project')
    })

    it('should handle multiple project switches', async () => {
      // Switch to first project
      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName: 'project-alpha', format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      let config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(config.activeProject).toBe('project-alpha')

      // Switch to second project
      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName: 'project-beta', format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(config.activeProject).toBe('project-beta')

      // Switch to third project
      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName: 'project-gamma', format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(config.activeProject).toBe('project-gamma')
    })

    it('should preserve config across command invocations', async () => {
      // Set initial state
      const initialConfig: SupermemoryConfig = {
        activeProject: 'persistence-test',
        apiKey: 'test-key-123',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: ['pattern1', 'pattern2'],
        lastUpload: '2025-01-15T10:00:00Z',
      }

      const configPath = path.join(tempDir, '.supermemoryrc')
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2), 'utf-8')

      // Run info command
      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'json' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      // Verify config is unchanged
      const config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(config).toEqual(initialConfig)
      expect(config.uploadedPatterns).toEqual(['pattern1', 'pattern2'])
    })
  })

  describe('Format consistency across commands', () => {
    it('should output consistent JSON across all commands', async () => {
      const projectName = 'format-test'

      // Set project
      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName, format: 'json' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      // List projects in JSON
      capturedOutput = []
      await Effect.runPromise(
        projectList.pipe(
          (cmd: any) => cmd.handler({ format: 'json' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const listOutput = capturedOutput.join('')
      // Extract JSON from output (displayJson adds ℹ prefix)
      const listMatch = listOutput.match(/\[[\s\S]*\]/)
      expect(listMatch).toBeTruthy()
      if (listMatch) {
        const listData = JSON.parse(listMatch[0])
        expect(listData).toEqual([
          { name: 'effect-patterns', description: 'Effect Patterns Library' },
          { name: 'default', description: 'Default Project' },
        ])
      }

      // Info in JSON
      capturedOutput = []
      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'json' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const infoOutput = capturedOutput.join('')
      // Extract JSON from output
      const infoMatch = infoOutput.match(/\{[\s\S]*\}/)
      expect(infoMatch).toBeTruthy()
      if (infoMatch) {
        const infoData = JSON.parse(infoMatch[0])
        expect(infoData).toHaveProperty('activeProject', projectName)
        expect(infoData).toHaveProperty('apiKeyConfigured')
        expect(infoData).toHaveProperty('supermemoryUrl')
        expect(infoData).toHaveProperty('uploadedPatterns')
        expect(infoData).toHaveProperty('lastUpload')
      }
    })

    it('should output consistent human format across commands', async () => {
      const projectName = 'human-format-test'

      // Set project
      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName, format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      // List in human format
      capturedOutput = []
      await Effect.runPromise(
        projectList.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const listOutput = capturedOutput.join('\n')
      expect(listOutput).toContain('Available Projects')
      expect(listOutput).toContain('effect-patterns')
      expect(listOutput).toContain('•')

      // Info in human format
      capturedOutput = []
      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const infoOutput = capturedOutput.join('\n')
      expect(infoOutput).toContain('Project Information')
      expect(infoOutput).toContain(projectName)
    })
  })

  describe('Error recovery', () => {
    it('should handle errors gracefully and maintain state', async () => {
      // Set a valid project
      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName: 'valid-project', format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      let config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(config.activeProject).toBe('valid-project')

      // Try to get info (should work even though config has minimal data)
      capturedOutput = []
      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      // Verify state is still intact
      config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(config.activeProject).toBe('valid-project')
    })

    it('should handle empty project names gracefully', async () => {
      // Try to set empty project name (should still save)
      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName: '', format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      // Should have empty string saved
      const config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(config.activeProject).toBe('')
    })
  })

  describe('Real-world scenarios', () => {
    it('should support DevOps workflow: multiple projects and uploads tracking', async () => {
      // Dev setup project
      await Effect.runPromise(
        projectSet.pipe(
          (cmd: any) => cmd.handler({ projectName: 'prod-deployment', format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      // Manually update config to simulate pattern uploads
      const configPath = path.join(tempDir, '.supermemoryrc')
      const config: SupermemoryConfig = {
        activeProject: 'prod-deployment',
        apiKey: 'prod-key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: ['error-handling', 'retry-logic', 'monitoring'],
        lastUpload: '2025-01-20T15:30:00Z',
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

      // Check project info
      capturedOutput = []
      await Effect.runPromise(
        projectInfo.pipe(
          (cmd: any) => cmd.handler({ format: 'human' }),
          Effect.provide(ConfigServiceLive)
        )
      )

      const output = capturedOutput.join('\n')
      expect(output).toContain('prod-deployment')
      expect(output).toContain('3')
      expect(output).toContain('2025-01-20')
    })

    it('should support team collaboration: different projects for different purposes', async () => {
      const projects = [
        'backend-api-v2',
        'frontend-ui-redesign',
        'data-pipeline',
      ]

      // Set up multiple projects
      for (const project of projects) {
        await Effect.runPromise(
          projectSet.pipe(
            (cmd: any) => cmd.handler({ projectName: project, format: 'human' }),
            Effect.provide(ConfigServiceLive)
          )
        )

        const config = await Effect.runPromise(
          loadConfig.pipe(Effect.provide(ConfigServiceLive))
        )
        expect(config.activeProject).toBe(project)
      }

      // Final state should be the last project
      const finalConfig = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(finalConfig.activeProject).toBe('data-pipeline')
    })

    it('should handle API key configuration transitions', async () => {
      // Initially no API key
      let config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(config.apiKey).toBe('')

      // Simulate API key being set via env
      process.env.SUPERMEMORY_API_KEY = 'newly-configured-key'

      // Load config again - should pick up the env key
      config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(config.apiKey).toBe('newly-configured-key')

      // Save config with explicit key using saveConfig helper
      const updatedConfig: SupermemoryConfig = {
        activeProject: 'with-key',
        apiKey: 'saved-key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: [],
      }

      // Save and then load to verify persistence
      await Effect.runPromise(
        saveConfig(updatedConfig).pipe(Effect.provide(ConfigServiceLive))
      )

      // Verify saved config has the saved key
      const saved = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(saved.apiKey).toBe('saved-key')
      expect(saved.activeProject).toBe('with-key')
    })
  })

  describe('Configuration persistence', () => {
    it('should survive multiple command cycles', async () => {
      const commands = [
        { name: 'cycle-1', format: 'human' as const },
        { name: 'cycle-2', format: 'json' as const },
        { name: 'cycle-3', format: 'human' as const },
      ]

      for (const cmd of commands) {
        // Set project
        await Effect.runPromise(
          projectSet.pipe(
            (c: any) => c.handler({ projectName: cmd.name, format: cmd.format }),
            Effect.provide(ConfigServiceLive)
          )
        )

        // Get info
        capturedOutput = []
        await Effect.runPromise(
          projectInfo.pipe(
            (c: any) => c.handler({ format: cmd.format }),
            Effect.provide(ConfigServiceLive)
          )
        )

        // Verify state
        const config = await Effect.runPromise(
          loadConfig.pipe(Effect.provide(ConfigServiceLive))
        )
        expect(config.activeProject).toBe(cmd.name)
      }
    })

    it('should maintain data integrity with concurrent-like operations', async () => {
      // Simulate sequential operations that might race in real usage
      const operations = [
        () => Effect.runPromise(
          projectSet.pipe(
            (cmd: any) => cmd.handler({ projectName: 'op1', format: 'human' }),
            Effect.provide(ConfigServiceLive)
          )
        ),
        () => Effect.runPromise(
          projectInfo.pipe(
            (cmd: any) => cmd.handler({ format: 'json' }),
            Effect.provide(ConfigServiceLive)
          )
        ),
        () => Effect.runPromise(
          projectSet.pipe(
            (cmd: any) => cmd.handler({ projectName: 'op2', format: 'json' }),
            Effect.provide(ConfigServiceLive)
          )
        ),
      ]

      // Execute operations sequentially
      for (const op of operations) {
        await op()
      }

      // Verify final state
      const config = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )
      expect(config.activeProject).toBe('op2')
    })
  })
})
