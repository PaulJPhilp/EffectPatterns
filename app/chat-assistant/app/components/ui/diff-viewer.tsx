'use client';

import { Diff, Hunk, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';

interface DiffViewerProps {
  diff: string;
  fileName?: string;
}

/**
 * DiffViewer Component
 *
 * Renders unified diff output with syntax highlighting
 */
export function DiffViewer({ diff, fileName = 'code.ts' }: DiffViewerProps) {
  if (!diff || diff.trim() === '') {
    return null;
  }

  try {
    // Parse the unified diff
    const files = parseDiff(diff);

    if (files.length === 0) {
      return (
        <div className="rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800">
          <pre className="whitespace-pre-wrap">{diff}</pre>
        </div>
      );
    }

    return (
      <div className="my-4 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
        {files.map((file, index) => (
          <div key={index}>
            <div className="bg-gray-100 px-4 py-2 font-mono text-sm dark:bg-gray-800">
              {file.oldPath} → {file.newPath}
            </div>
            <Diff diffType={file.type} hunks={file.hunks} viewType="unified">
              {(hunks) =>
                hunks.map((hunk) => <Hunk hunk={hunk} key={hunk.content} />)
              }
            </Diff>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    // If parsing fails, fall back to simple pre rendering
    return (
      <div className="my-4 rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800">
        <div className="mb-2 font-mono text-gray-600 text-xs">Diff:</div>
        <pre className="overflow-x-auto whitespace-pre-wrap">{diff}</pre>
      </div>
    );
  }
}
