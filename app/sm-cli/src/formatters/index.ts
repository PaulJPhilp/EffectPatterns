/**
 * Output Formatters - Human Readable and JSON
 */

import type { Memory, OutputOptions, UploadResult } from '../types.js';

/**
 * Format memories for human-readable output
 */
export function formatMemoriesHuman(memories: Memory[]): string {
  if (memories.length === 0) {
    return 'No memories found';
  }

  const rows = memories.map((m) => {
    const type = (m.metadata as any)?.type || m.type;
    const patternId = (m.metadata as any)?.patternId || '';
    return {
      ID: m.id.substring(0, 8),
      Title: m.title || m.summary?.substring(0, 50) || 'Untitled',
      Type: type,
      Status: m.status,
      Created: new Date(m.createdAt).toLocaleDateString(),
    };
  });

  return formatTable(rows);
}

/**
 * Format memories for JSON output
 */
export function formatMemoriesJson(memories: Memory[]): string {
  return JSON.stringify(memories, null, 2);
}

/**
 * Format upload results
 */
export function formatUploadResultsHuman(results: UploadResult[]): string {
  const successful = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'error').length;

  let output = `Upload Results: ${successful} successful, ${failed} failed\n\n`;

  const rows = results.map((r) => ({
    'Pattern ID': r.patternId.substring(0, 30),
    'Memory ID': r.memoryId.substring(0, 8),
    Status: r.status === 'success' ? '✓' : '✗',
    Message: r.message || '',
  }));

  output += formatTable(rows);
  return output;
}

/**
 * Format upload results as JSON
 */
export function formatUploadResultsJson(results: UploadResult[]): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Simple table formatter
 */
function formatTable(
  rows: Array<{ [key: string]: string | number }>,
): string {
  if (rows.length === 0) {
    return 'No data';
  }

  const headers = Object.keys(rows[0]);
  const columnWidths = headers.map((header) => {
    const maxRowWidth = Math.max(
      ...rows.map((row) => String(row[header] || '').length),
    );
    return Math.max(header.length, maxRowWidth);
  });

  // Create header
  let output = '';
  output += headers
    .map((h, i) => h.padEnd(columnWidths[i]))
    .join(' | ');
  output += '\n';
  output += columnWidths.map((w) => '-'.repeat(w)).join('-+-');
  output += '\n';

  // Create rows
  for (const row of rows) {
    output += headers
      .map((h, i) => String(row[h] || '').padEnd(columnWidths[i]))
      .join(' | ');
    output += '\n';
  }

  return output;
}

/**
 * Format status info
 */
export function formatStatusHuman(info: {
  activeProject: string;
  totalMemories: number;
  patterns: number;
  conversations: number;
}): string {
  return `
Supermemory CLI Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active Project:  ${info.activeProject || '(not set)'}
Total Memories:  ${info.totalMemories}
Patterns:        ${info.patterns}
Conversations:   ${info.conversations}
`;
}

/**
 * Format status as JSON
 */
export function formatStatusJson(info: {
  activeProject: string;
  totalMemories: number;
  patterns: number;
  conversations: number;
}): string {
  return JSON.stringify(info, null, 2);
}

/**
 * Generic formatter that delegates to human or JSON
 */
export function format<T>(
  data: T,
  formatter: { human: (data: T) => string; json: (data: T) => string },
  options: OutputOptions,
): string {
  if (options.format === 'json') {
    return formatter.json(data);
  }
  return formatter.human(data);
}
