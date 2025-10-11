"use client";

import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "./components/ui/message";

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="assistant-header border-b">
        <div className="assistant-header__title">Effect Patterns AI Assistant</div>
        <div className="assistant-header__subtitle">Your expert guide for Effect-TS patterns and best practices</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">👋 Welcome!</p>
            <p>Ask me anything about Effect-TS patterns.</p>
            <p className="text-sm mt-4">Try: &ldquo;How do I handle retries with backoff?&rdquo;</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <Message
              role={message.role as "user" | "assistant" | "system"}
              content={message.content}
            />

            {/* Display tool invocations */}
            {message.toolInvocations &&
              message.toolInvocations.length > 0 && (
                <div className="ml-4 mb-2 space-y-2 text-sm text-gray-500">
                  {message.toolInvocations.map((toolInvocation: any) => (
                    <div key={toolInvocation.toolCallId}>
                      <div>
                        🔧 Using {toolInvocation.toolName}...
                        {toolInvocation.state === "result" && " ✓"}
                      </div>
                      {toolInvocation.state === "result" &&
                        toolInvocation.result && (
                          <div className="mt-1 space-y-2">
                            {toolInvocation.result.summary && (
                              <div className="rounded-md bg-gray-100 p-3 text-xs text-gray-800">
                                {toolInvocation.result.summary}
                              </div>
                            )}

                            {toolInvocation.result.recommendations && (
                              <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                                <div className="mb-1 font-medium uppercase tracking-wide text-gray-600">
                                  Recommended Patterns
                                </div>
                                <ul className="list-disc space-y-1 pl-4">
                                  {toolInvocation.result.recommendations.map(
                                    (item: any) => (
                                      <li key={item.id}>
                                        <span className="font-semibold">{item.title}</span>
                                        {item.why ? ": " : ""}
                                        {item.why}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                            {toolInvocation.result.results && (
                              <div className="rounded-md bg-white p-3 text-xs text-gray-700 shadow-sm">
                                <div className="mb-2 font-medium uppercase tracking-wide text-gray-600">
                                  Pattern Details
                                </div>
                                <div className="space-y-4">
                                  {toolInvocation.result.results.map(
                                    (pattern: any) => (
                                      <div key={pattern.id} className="space-y-2">
                                        <div>
                                          <div className="text-sm font-semibold text-gray-800">
                                            {pattern.title}
                                          </div>
                                          <div className="text-[11px] text-gray-500">
                                            {pattern.category} · {pattern.difficulty}
                                          </div>
                                        </div>
                                        {pattern.content && (
                                          <div className="prose prose-sm max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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

                            <details className="rounded-md bg-gray-100 p-3 text-xs text-gray-600">
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
          <div className="bg-gray-100 p-4 rounded-lg mr-auto max-w-[80%]">
            <div className="flex items-center space-x-2">
              <div className="animate-pulse">●</div>
              <div className="animate-pulse delay-100">●</div>
              <div className="animate-pulse delay-200">●</div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about Effect patterns..."
          disabled={isLoading}
          className="flex-1 h-24 resize-none p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          rows={4}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
