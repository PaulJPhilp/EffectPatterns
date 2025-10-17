import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'apps/web/vitest.config.ts',
  'packages/components/vitest.config.ts',
  'packages/toolkit/vitest.config.ts',
  'services/mcp-server/vitest.config.ts',
]);
