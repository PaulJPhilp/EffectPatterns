# Fixing Next.js Setup for Stress Tests

## Problem Summary
The stress tests fail to run because multiple Next.js server instances try to start on ports 3001-3005 sequentially, but:
1. Previous instances don't fully shut down
2. Port locks persist (.next/dev/lock)
3. Lock file prevents new instances from starting

## Quick Fix (Do This First)

```bash
# Kill any running Next.js processes
pkill -f "next dev" || true
pkill -f "bun run dev" || true

# Remove Next.js lock file and cache
rm -rf .next/dev/lock
rm -rf .next

# Clear any node processes on test ports
for port in 3001 3002 3003 3004 3005; do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Wait a moment for ports to release
sleep 2

# Verify ports are free
for port in 3001 3002 3003 3004 3005; do
  if ! lsof -i:$port > /dev/null; then
    echo "✓ Port $port is free"
  fi
done
```

## Solution 1: Use Shared Server Instance (Recommended)

Modify the stress tests to use a single shared server instance instead of starting/stopping servers for each test suite.

**Changes to `tests/stress/utils/server-control.ts`**:

```typescript
// Add singleton pattern
let sharedServerProcess: ChildProcess | null = null;
let serverStarted = false;

export async function startSharedServer(config: Partial<ServerConfig> = {}): Promise<void> {
  if (serverStarted && isServerRunning()) {
    console.log('Server already running, reusing instance');
    return;
  }

  // Original startServer logic
  serverStarted = true;
  return startServer(config);
}

export async function stopSharedServer(): Promise<void> {
  if (serverStarted) {
    await stopServer();
    serverStarted = false;
  }
}
```

**Changes to stress test files** (e.g., `tests/stress/scenarios/load-test.ts`):

```typescript
// Before (creates new server each time)
beforeAll(async () => {
  await startServer({ port: 3003 });
});

// After (reuses single server)
beforeAll(async () => {
  await startSharedServer({ port: 3003 });
});

afterAll(async () => {
  // Don't stop server, let next test use it
  // Or stop only in final cleanup
});
```

## Solution 2: Improve Server Lifecycle Management

Update `server-control.ts` to better handle port conflicts:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Kill any process using the specified port
 */
export async function killPortProcess(port: number): Promise<void> {
  try {
    // macOS/Linux
    await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
    
    // Windows fallback
    await execAsync(`netstat -ano | find "LISTENING" | find ":${port} " || true`).catch(() => {});
    
    console.log(`Killed process on port ${port}`);
  } catch (error) {
    // Port may already be free
  }
  
  // Wait for port to actually release
  await delay(500);
}

/**
 * Start server with retry logic
 */
export async function startServerWithRetry(
  config: Partial<ServerConfig> = {},
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fullConfig = { ...DEFAULT_CONFIG, ...config };
      
      // Kill any existing process on this port
      await killPortProcess(fullConfig.port);
      
      // Try to start server
      await startServer(fullConfig);
      console.log(`Server started successfully on attempt ${attempt}`);
      return;
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`Attempt ${attempt} failed, retrying... ${error}`);
      await delay(2000);
    }
  }
}
```

## Solution 3: Use Environment Variable for Port Configuration

Update `package.json` scripts:

```json
{
  "scripts": {
    "test:stress": "bunx vitest run --config vitest.stress.config.ts",
    "test:stress:edge": "PORT=3001 bunx vitest run --config vitest.stress.config.ts tests/stress/scenarios/edge-cases-test.ts",
    "test:stress:load": "PORT=3002 bunx vitest run --config vitest.stress.config.ts tests/stress/scenarios/load-test.ts",
    "test:stress:volume": "PORT=3003 bunx vitest run --config vitest.stress.config.ts tests/stress/scenarios/volume-test.ts",
    "test:stress:spike": "PORT=3004 bunx vitest run --config vitest.stress.config.ts tests/stress/scenarios/spike-test.ts",
    "test:stress:endurance": "PORT=3005 bunx vitest run --config vitest.stress.config.ts tests/stress/scenarios/endurance-test.ts",
    "test:stress:cleanup": "pkill -f 'next dev' || true && rm -rf .next/dev && sleep 1"
  }
}
```

## Solution 4: Pre-build Next.js Instead of Using Dev Server

For more reliable tests, use a built production server:

Create `scripts/start-test-server.js`:

```javascript
const { spawn } = require('child_process');
const path = require('path');

const port = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'test-prod';

let command, args;

if (isProduction) {
  // Use production server (faster, more stable)
  command = 'bun';
  args = ['run', 'start', '--', '--port', port.toString()];
} else {
  // Use dev server
  command = 'bun';
  args = ['run', 'dev', '--port', port.toString()];
}

const server = spawn(command, args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port.toString(),
  }
});

// Handle signals
process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});

server.on('exit', (code) => {
  process.exit(code || 0);
});
```

Update `server-control.ts`:

```typescript
export async function startServer(config: Partial<ServerConfig> = {}): Promise<void> {
  serverConfig = { ...DEFAULT_CONFIG, ...config };

  if (config.port) {
    serverConfig.baseUrl = `http://localhost:${config.port}`;
  }

  await stopServer();

  console.log(`Starting server on port ${serverConfig.port}...`);

  return new Promise((resolve, reject) => {
    serverProcess = spawn('bun', ['run', 'scripts/start-test-server.js'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: serverConfig.port.toString(),
        NODE_ENV: 'test',
      },
    });

    // ... rest of implementation
  });
}
```

## Solution 5: Sequential Port Release with Delay

Ensure proper cleanup between tests in `vitest.stress.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/stress/**/*-test.ts', 'tests/stress/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],

    testTimeout: 2_100_000,
    hookTimeout: 120_000,

    // Critical: Run tests sequentially
    fileParallelism: false,
    threads: false,
    singleThread: true,

    reporters: ['default', 'json'],
    outputFile: {
      json: 'tests/stress/reports/results.json',
    },

    // Add cleanup between suites
    bail: 0,
    isolate: true,
  },
});
```

## Step-by-Step Implementation Plan

### Phase 1: Immediate Cleanup (5 minutes)
1. Run the Quick Fix script above
2. Verify all ports are free
3. Try running a single test: `npm run test:stress:edge`

### Phase 2: Implement Shared Server (20 minutes)
1. Update `server-control.ts` with singleton pattern
2. Update each stress test file to use `startSharedServer`
3. Test each suite individually

### Phase 3: Add Retry Logic (15 minutes)
1. Add `startServerWithRetry` and port killing logic
2. Update test setup to use retry wrapper
3. Test with network disruptions

### Phase 4: Optimize Configuration (10 minutes)
1. Update `package.json` with new scripts
2. Test individual stress test scripts
3. Document in README

## Verification Steps

After implementing each solution:

```bash
# 1. Verify Next.js can start
npm run dev &
sleep 5
curl http://localhost:3000/api/health || echo "Server not ready"
pkill -f "next dev"

# 2. Verify ports are free
for port in 3000 3001 3002 3003 3004 3005; do
  lsof -i:$port || echo "Port $port is free"
done

# 3. Run single stress test
npm run test:stress:edge

# 4. Run all stress tests
npm run test:stress
```

## Troubleshooting

### "Address already in use :::PORT"
```bash
# Find and kill process on port
lsof -i :PORT | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use our cleanup function
npx ts-node -e "import {killPortProcess} from './tests/stress/utils/server-control'; killPortProcess(3001)"
```

### "Unable to acquire lock at .next/dev/lock"
```bash
# Remove lock file
rm -f .next/dev/lock
rm -rf .next

# Try again
npm run test:stress
```

### Server times out on startup
```bash
# Check if bun/node is hung
ps aux | grep -E "next|node|bun" | grep -v grep

# Kill hung processes
pkill -9 -f next
pkill -9 -f node
pkill -9 -f bun
```

## Recommended Solution

**Start with Solution 1 (Shared Server Instance)** because it:
- ✓ Requires minimal code changes
- ✓ Solves the core problem (multiple instances)
- ✓ Maintains test isolation through separate test suites
- ✓ Improves test performance (30 seconds → 5-10 seconds)
- ✓ Works immediately with other fixes

Then add Solution 2 (Retry Logic) for robustness in CI/CD pipelines.
