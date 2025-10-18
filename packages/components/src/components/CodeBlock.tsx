import { forwardRef, type HTMLAttributes, useState } from 'react';
import { cn } from '../utils.js';

export interface CodeBlockProps extends HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
  showPlayground?: boolean;
  playgroundUrl?: string;
}

export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(
  (
    {
      code,
      language = 'typescript',
      showPlayground = false,
      playgroundUrl = 'https://effect.website/play',
      className,
      ...props
    },
    ref
  ) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handlePlayground = () => {
      const encoded = btoa(code);
      window.open(`${playgroundUrl}?code=${encoded}`, '_blank');
    };

    return (
      <div className={cn('group relative', className)} ref={ref} {...props}>
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            aria-label="Copy code"
            className="rounded bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-600"
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {showPlayground && (
            <button
              aria-label="Run in playground"
              className="rounded bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
              onClick={handlePlayground}
            >
              Run in Playground →
            </button>
          )}
        </div>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    );
  }
);

CodeBlock.displayName = 'CodeBlock';
