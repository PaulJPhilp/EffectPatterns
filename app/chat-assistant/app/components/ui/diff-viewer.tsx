"use client";

import { parseDiff, Diff, Hunk } from "react-diff-view";
import "react-diff-view/style/index.css";

interface DiffViewerProps {
  diff: string;
  fileName?: string;
}

/**
 * DiffViewer Component
 *
 * Renders unified diff output with syntax highlighting
 */
export function DiffViewer({ diff, fileName = "code.ts" }: DiffViewerProps) {
  if (!diff || diff.trim() === "") {
    return null;
  }

  try {
    // Parse the unified diff
    const files = parseDiff(diff);

    if (files.length === 0) {
      return (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm">
          <pre className="whitespace-pre-wrap">{diff}</pre>
        </div>
      );
    }

    return (
      <div className="my-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
        {files.map((file, index) => (
          <div key={index}>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 font-mono text-sm">
              {file.oldPath} → {file.newPath}
            </div>
            <Diff viewType="unified" diffType={file.type} hunks={file.hunks}>
              {(hunks) =>
                hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)
              }
            </Diff>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    // If parsing fails, fall back to simple pre rendering
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm my-4">
        <div className="font-mono text-xs mb-2 text-gray-600">Diff:</div>
        <pre className="whitespace-pre-wrap overflow-x-auto">{diff}</pre>
      </div>
    );
  }
}
