/**
 * Configuration Service Tests
 *
 * Tests for loading and saving configuration files
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Effect, Layer } from 'effect'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'
import {
  ConfigService,
  ConfigServiceLive,
  ConfigError,
  loadConfig,
  saveConfig,
} from '../../src/services/config.js'
import type { SupermemoryConfig } from '../../src/types.js'

describe('ConfigService', () => {
  let tempDir: string
  let originalHome: string | undefined
  let originalApiKey: string | undefined

  beforeEach(() => {
    // Create a temporary directory for test config files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-cli-test-'))

    // Store original environment
    originalHome = process.env.HOME
    originalApiKey = process.env.SUPERMEMORY_API_KEY

    // Set HOME to temp directory for testing
    process.env.HOME = tempDir
    process.env.SUPERMEMORY_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    // Restore original environment
    if (originalHome !== undefined) {
      process.env.HOME = originalHome
    } else {
      delete process.env.HOME
    }

    if (originalApiKey !== undefined) {
      process.env.SUPERMEMORY_API_KEY = originalApiKey
    } else {
      delete process.env.SUPERMEMORY_API_KEY
    }

    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir)
      files.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file))
      })
      fs.rmdirSync(tempDir)
    }
  })

  describe('loadConfig', () => {
    it('should return default config when file does not exist', async () => {
      const result = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(result).toEqual({
        activeProject: '',
        apiKey: 'test-api-key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: [],
      })
    })

    it('should load and parse config file when it exists', async () => {
      const configPath = path.join(tempDir, '.supermemoryrc')
      const testConfig: SupermemoryConfig = {
        activeProject: 'my-project',
        apiKey: 'stored-key',
        supermemoryUrl: 'https://custom.supermemory.ai',
        uploadedPatterns: ['pattern-1', 'pattern-2'],
        lastUpload: '2025-01-01T00:00:00Z',
      }

      // Write test config file
      fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2), 'utf-8')

      const result = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(result).toEqual(testConfig)
    })

    it('should handle malformed JSON gracefully', async () => {
      const configPath = path.join(tempDir, '.supermemoryrc')
      fs.writeFileSync(configPath, 'invalid json {', 'utf-8')

      let errorThrown = false
      try {
        await Effect.runPromise(
          loadConfig.pipe(Effect.provide(ConfigServiceLive))
        )
      } catch (error: any) {
        // Verify an error was thrown
        errorThrown = true
        expect(error).toBeTruthy()
        // The error structure contains the failure message
        const errorStr = String(error)
        expect(errorStr).toContain('Failed to parse config file')
      }

      expect(errorThrown).toBe(true)
    })

    it('should use environment variable API key when config has empty apiKey', async () => {
      process.env.SUPERMEMORY_API_KEY = 'env-api-key'

      const result = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(result.apiKey).toBe('env-api-key')
    })
  })

  describe('saveConfig', () => {
    it('should create and write config file', async () => {
      const testConfig: SupermemoryConfig = {
        activeProject: 'test-project',
        apiKey: 'test-key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: ['p1', 'p2'],
      }

      await Effect.runPromise(
        saveConfig(testConfig).pipe(Effect.provide(ConfigServiceLive))
      )

      const configPath = path.join(tempDir, '.supermemoryrc')
      expect(fs.existsSync(configPath)).toBe(true)

      const content = fs.readFileSync(configPath, 'utf-8')
      const savedConfig = JSON.parse(content)

      expect(savedConfig).toEqual(testConfig)
    })

    it('should overwrite existing config file', async () => {
      const configPath = path.join(tempDir, '.supermemoryrc')

      // Write initial config
      const initialConfig: SupermemoryConfig = {
        activeProject: 'old-project',
        apiKey: 'old-key',
        supermemoryUrl: 'https://old.supermemory.ai',
        uploadedPatterns: [],
      }
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2), 'utf-8')

      // Save new config
      const newConfig: SupermemoryConfig = {
        activeProject: 'new-project',
        apiKey: 'new-key',
        supermemoryUrl: 'https://new.supermemory.ai',
        uploadedPatterns: ['p1', 'p2', 'p3'],
      }

      await Effect.runPromise(
        saveConfig(newConfig).pipe(Effect.provide(ConfigServiceLive))
      )

      const content = fs.readFileSync(configPath, 'utf-8')
      const savedConfig = JSON.parse(content)

      expect(savedConfig).toEqual(newConfig)
      expect(savedConfig.activeProject).toBe('new-project')
    })

    it('should preserve JSON formatting', async () => {
      const testConfig: SupermemoryConfig = {
        activeProject: 'formatted-project',
        apiKey: 'key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: ['p1'],
      }

      await Effect.runPromise(
        saveConfig(testConfig).pipe(Effect.provide(ConfigServiceLive))
      )

      const configPath = path.join(tempDir, '.supermemoryrc')
      const content = fs.readFileSync(configPath, 'utf-8')

      // Check for proper indentation (2 spaces for top-level keys)
      expect(content).toContain('  "activeProject"')
      // Also check that JSON is valid and properly formatted
      const parsed = JSON.parse(content)
      expect(parsed.activeProject).toBe('formatted-project')
    })
  })

  describe('config round-trip', () => {
    it('should save and load config without data loss', async () => {
      const originalConfig: SupermemoryConfig = {
        activeProject: 'my-app',
        apiKey: 'secret-key',
        supermemoryUrl: 'https://api.supermemory.ai',
        lastUpload: '2025-01-15T10:30:00Z',
        uploadedPatterns: ['error-handling', 'retry-pattern', 'logging'],
      }

      // Save config
      await Effect.runPromise(
        saveConfig(originalConfig).pipe(Effect.provide(ConfigServiceLive))
      )

      // Load config back
      const loadedConfig = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(loadedConfig).toEqual(originalConfig)
    })

    it('should handle empty uploadedPatterns array', async () => {
      const config: SupermemoryConfig = {
        activeProject: 'test',
        apiKey: 'key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: [],
      }

      await Effect.runPromise(
        saveConfig(config).pipe(Effect.provide(ConfigServiceLive))
      )

      const loaded = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(loaded.uploadedPatterns).toEqual([])
    })

    it('should handle special characters in config values', async () => {
      const config: SupermemoryConfig = {
        activeProject: 'project-with-special-chars-@#$%',
        apiKey: 'api+key/with=special&chars',
        supermemoryUrl: 'https://api.supermemory.ai?param=value&other=test',
        uploadedPatterns: ['pattern/with/slashes', 'pattern-with-dashes'],
      }

      await Effect.runPromise(
        saveConfig(config).pipe(Effect.provide(ConfigServiceLive))
      )

      const loaded = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(loaded).toEqual(config)
    })
  })

  describe('config structure validation', () => {
    it('should have all required config fields', async () => {
      const result = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(result).toHaveProperty('activeProject')
      expect(result).toHaveProperty('apiKey')
      expect(result).toHaveProperty('supermemoryUrl')
      expect(result).toHaveProperty('uploadedPatterns')
    })

    it('should preserve optional lastUpload field', async () => {
      const config: SupermemoryConfig = {
        activeProject: 'test',
        apiKey: 'key',
        supermemoryUrl: 'https://api.supermemory.ai',
        uploadedPatterns: [],
        lastUpload: '2025-01-20T15:45:00Z',
      }

      await Effect.runPromise(
        saveConfig(config).pipe(Effect.provide(ConfigServiceLive))
      )

      const loaded = await Effect.runPromise(
        loadConfig.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(loaded.lastUpload).toBe('2025-01-20T15:45:00Z')
    })
  })
})
