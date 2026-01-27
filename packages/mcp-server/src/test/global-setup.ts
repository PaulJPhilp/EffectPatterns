import { ChildProcess, spawn } from 'node:child_process';

let serverProcess: ChildProcess | undefined;

export async function setup() {
  console.log('\n🚀 Starting Next.js server for integration tests...');
  
  const rootDir = process.cwd();
  
  // Start the server
  serverProcess = spawn('bun', ['run', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: '3000',
      NODE_ENV: 'development',
      CUSTOM_NODE_ENV: 'production',
      PATTERN_API_KEY: 'test-key',
    },
  });

  // Polling function to check if server is up
  const maxAttempts = 30;
  const delay = 1000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (response.ok) {
        console.log('✅ Server is up and running!');
        return;
      }
    } catch (e) {
      // Ignore errors during polling
    }
    
    if (attempt % 5 === 0) {
      console.log(`⏳ Waiting for server (attempt ${attempt}/${maxAttempts})...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('❌ Failed to start Next.js server within timeout');
}

export async function teardown() {
  console.log('\n🛑 Stopping Next.js server...');
  if (serverProcess) {
    serverProcess.kill();
    await new Promise(resolve => serverProcess?.on('exit', resolve));
    console.log('✅ Server stopped');
  }
}
