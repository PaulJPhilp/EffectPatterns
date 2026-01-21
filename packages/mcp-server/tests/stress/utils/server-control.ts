/**
 * Server lifecycle management for stress tests
 * Handles starting, stopping, and health checking the test server
 */

import { spawn, ChildProcess } from 'child_process';
import { setTimeout as delay } from 'timers/promises';

export interface ServerConfig {
  port: number;
  baseUrl: string;
  maxStartupTime: number; // milliseconds
  healthCheckTimeout: number; // milliseconds
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 3001,
  baseUrl: 'http://localhost:3001',
  maxStartupTime: 60000, // 60 seconds (Next.js can take a while on first start)
  healthCheckTimeout: 5000, // 5 seconds
};

let serverProcess: ChildProcess | null = null;
let serverConfig: ServerConfig = DEFAULT_CONFIG;

// Shared server state for reusing instances across test suites
let sharedServerStarted = false;
let sharedServerRefCount = 0;

/**
 * Start the test server
 */
export async function startServer(config: Partial<ServerConfig> = {}): Promise<void> {
  serverConfig = { ...DEFAULT_CONFIG, ...config };

  // Update baseUrl if port was specified
  if (config.port) {
    serverConfig.baseUrl = `http://localhost:${config.port}`;
  }

  // Kill any existing server
  await stopServer();

  console.log(`Starting server on port ${serverConfig.port}...`);

  return new Promise((resolve, reject) => {
    // Start the Next.js dev server
    serverProcess = spawn('bun', ['run', 'dev', '--port', serverConfig.port.toString()], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: serverConfig.port.toString(),
        NODE_ENV: 'test',
      },
    });

    let readyDetected = false;
    const startTime = Date.now();

    // Monitor stdout for server ready signal
    serverProcess!.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server] ${output.trim()}`);

      if (!readyDetected && (output.includes('ready') || output.includes('Ready'))) {
        readyDetected = true;
        // Give server a moment to fully stabilize
        setTimeout(() => resolve(), 2000);
      }
    });

    // Monitor stderr
    serverProcess!.stderr?.on('data', (data) => {
      console.error(`[Server Error] ${data.toString()}`);
    });

    // Handle process errors
    serverProcess!.on('error', (error) => {
      reject(error);
    });

    serverProcess!.on('exit', (code) => {
      if (code !== 0 && !readyDetected) {
        reject(new Error(`Server process exited with code ${code}`));
      }
    });

    // Health check with timeout
    const healthCheckInterval = setInterval(async () => {
      if (readyDetected) {
        clearInterval(healthCheckInterval);
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > serverConfig.maxStartupTime) {
        clearInterval(healthCheckInterval);
        serverProcess?.kill();
        serverProcess = null;
        reject(new Error(`Server failed to start within ${serverConfig.maxStartupTime}ms`));
        return;
      }

      // Try health check
      try {
        const response = await fetch(`${serverConfig.baseUrl}/api/review-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'export const x = 1;' }),
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok || response.status === 413 || response.status === 400) {
          clearInterval(healthCheckInterval);
          readyDetected = true;
          resolve();
        }
      } catch (e) {
        // Server not ready yet, try again
      }
    }, 1000);
  });
}

/**
 * Stop the test server
 */
export async function stopServer(): Promise<void> {
  if (!serverProcess) {
    return;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      serverProcess?.kill('SIGKILL');
      serverProcess = null;
      resolve();
    }, 5000);

    serverProcess!.on('exit', () => {
      clearTimeout(timeout);
      serverProcess = null;
      resolve();
    });

    serverProcess!.kill('SIGTERM');
  });
}

/**
 * Check if server is healthy
 */
export async function healthCheck(): Promise<boolean> {
  if (!serverProcess) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), serverConfig.healthCheckTimeout);

    const response = await fetch(`${serverConfig.baseUrl}/api/review-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'export const x = 1;' }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 413 || response.status === 400;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for server to be healthy
 */
export async function waitForHealth(maxWaitTime: number = 30000): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 500; // Poll every 500ms

  while (Date.now() - startTime < maxWaitTime) {
    try {
      if (await healthCheck()) {
        console.log('Server is healthy');
        return;
      }
    } catch (error) {
      // Ignore errors, keep polling
    }

    await delay(pollInterval);
  }

  throw new Error(`Server did not become healthy within ${maxWaitTime}ms`);
}

/**
 * Get server configuration
 */
export function getServerConfig(): ServerConfig {
  return serverConfig;
}

/**
 * Get full URL for an endpoint
 */
export function getServerUrl(endpoint: string = ''): string {
  return `${serverConfig.baseUrl}${endpoint}`;
}

/**
 * Check if server process is running
 */
export function isServerRunning(): boolean {
  return serverProcess !== null && !serverProcess.killed;
}

/**
 * Start a shared server instance (reused across test suites)
 * This avoids port conflicts and speeds up test execution
 */
export async function startSharedServer(config: Partial<ServerConfig> = {}): Promise<void> {
  sharedServerRefCount++;
  
  if (sharedServerStarted && isServerRunning()) {
    console.log(`[Shared Server] Reusing existing instance (ref count: ${sharedServerRefCount})`);
    return;
  }
  
  console.log(`[Shared Server] Starting new instance (ref count: ${sharedServerRefCount})`);
  sharedServerStarted = true;
  return startServer(config);
}

/**
 * Stop the shared server instance (with reference counting)
 * Only stops when all references are released
 */
export async function stopSharedServer(): Promise<void> {
  sharedServerRefCount--;
  
  if (sharedServerRefCount <= 0) {
    console.log('[Shared Server] All references released, stopping server');
    sharedServerRefCount = 0;
    sharedServerStarted = false;
    return stopServer();
  }
  
  console.log(`[Shared Server] Reference released (remaining: ${sharedServerRefCount})`);
}

/**
 * Reset shared server state (for cleanup between test runs)
 */
export async function resetSharedServer(): Promise<void> {
  console.log('[Shared Server] Resetting state');
  sharedServerRefCount = 0;
  sharedServerStarted = false;
  return stopServer();
}
