'use client';

import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from './components/ui/message';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();

  return (
    <div className="mx-auto flex h-screen max-w-4xl flex-col p-4">
      {/* Header */}
      <div className="assistant-header border-b">
        <div className="assistant-header__title">
          Effect Patterns AI Assistant
        </div>
        <div className="assistant-header__subtitle">
          Your expert guide for Effect-TS patterns and best practices
        </div>
      </div>

      {/* Messages */}
      <div className="mb-4 flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-gray-500">
            <p className="mb-2 text-lg">👋 Welcome!</p>
            <p>Ask me anything about Effect-TS patterns.</p>
            <p className="mt-4 text-sm">
              Try: &ldquo;How do I handle retries with backoff?&rdquo;
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <Message
              content={message.content}
              role={message.role as 'user' | 'assistant' | 'system'}
            />

            {/* Display tool invocations */}
            {message.toolInvocations && message.toolInvocations.length > 0 && (
              <div className="mb-2 ml-4 space-y-2 text-gray-500 text-sm">
                {message.toolInvocations.map((toolInvocation: any) => (
                  <div key={toolInvocation.toolCallId}>
                    <div>
                      🔧 Using {toolInvocation.toolName}...
                      {toolInvocation.state === 'result' && ' ✓'}
                    </div>
                    {toolInvocation.state === 'result' &&
                      toolInvocation.result && (
                        <div className="mt-1 space-y-2">
                          {toolInvocation.result.summary && (
                            <div className="rounded-md bg-gray-100 p-3 text-gray-800 text-xs">
                              {toolInvocation.result.summary}
                            </div>
                          )}

                          {toolInvocation.result.recommendations && (
                            <div className="rounded-md bg-gray-50 p-3 text-gray-700 text-xs">
                              <div className="mb-1 font-medium text-gray-600 uppercase tracking-wide">
                                Recommended Patterns
                              </div>
                              <ul className="list-disc space-y-1 pl-4">
                                {toolInvocation.result.recommendations.map(
                                  (item: any) => (
                                    <li key={item.id}>
                                      <span className="font-semibold">
                                        {item.title}
                                      </span>
                                      {item.why ? ': ' : ''}
                                      {item.why}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                          {toolInvocation.result.results && (
                            <div className="rounded-md bg-white p-3 text-gray-700 text-xs shadow-sm">
                              <div className="mb-2 font-medium text-gray-600 uppercase tracking-wide">
                                Pattern Details
                              </div>
                              <div className="space-y-4">
                                {toolInvocation.result.results.map(
                                  (pattern: any) => (
                                    <div className="space-y-2" key={pattern.id}>
                                      <div>
                                        <div className="font-semibold text-gray-800 text-sm">
                                          {pattern.title}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                          {pattern.category} ·{' '}
                                          {pattern.difficulty}
                                        </div>
                                      </div>
                                      {pattern.content && (
                                        <div className="prose prose-sm max-w-none">
                                          <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                          >
                                            {pattern.content}
                                          </ReactMarkdown>
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          <details className="rounded-md bg-gray-100 p-3 text-gray-600 text-xs">
                            <summary className="cursor-pointer font-medium text-gray-700">
                              Raw tool response
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap text-[10px] text-gray-700">
                              {JSON.stringify(toolInvocation.result, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="mr-auto max-w-[80%] rounded-lg bg-gray-100 p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-pulse">●</div>
              <div className="animate-pulse delay-100">●</div>
              <div className="animate-pulse delay-200">●</div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form className="flex space-x-2" onSubmit={handleSubmit}>
        <textarea
          className="h-24 flex-1 resize-none rounded-lg border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          disabled={isLoading}
          onChange={handleInputChange}
          placeholder="Ask about Effect patterns..."
          rows={4}
          value={input}
        />
        <button
          className="rounded-lg bg-blue-500 px-6 py-3 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={isLoading || !input.trim()}
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  );
}
