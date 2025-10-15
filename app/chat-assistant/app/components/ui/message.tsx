'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Message Component
 *
 * Renders chat messages with proper markdown and code syntax highlighting
 */
export function Message({ role, content }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        }`}
      >
        {isUser ? (
          // User messages: simple text rendering
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          // Assistant messages: full markdown rendering
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code(props) {
                  const { children, className, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const isInline = !className;

                  return !isInline && language ? (
                    <SyntaxHighlighter
                      language={language}
                      PreTag="div"
                      style={vscDarkPlus}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      className={`${className || ''} rounded bg-gray-200 px-1 py-0.5 text-sm dark:bg-gray-700`}
                      {...rest}
                    >
                      {children}
                    </code>
                  );
                },
              }}
              remarkPlugins={[remarkGfm]}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
