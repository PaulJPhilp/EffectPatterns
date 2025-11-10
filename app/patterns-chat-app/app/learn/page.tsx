"use client";

import { generateUUID } from "@/lib/utils";
import {
    AssistantRuntimeProvider,
    ComposerPrimitive,
    ThreadPrimitive,
    useMessage,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import ReactMarkdown from "react-markdown";
import { PatternVisualizer } from "./components/pattern-visualizer";

// Enhanced message component with markdown and better styling
function Message() {
  const message = useMessage();
  const isUser = message.role === "user";

  return (
    <div
      className={`group mb-6 flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? "You" : "AI"}
      </div>

      {/* Message content */}
      <div className="flex-1 space-y-2">
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary text-primary-foreground ml-auto max-w-[85%]"
              : "bg-muted/50 max-w-full"
          }`}
        >
          <div className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : "dark:prose-invert"}`}>
            {message.content.map((part, i) => {
              // Render text content
              if (part.type === "text") {
                return (
                  <ReactMarkdown
                    key={i}
                    components={{
                      code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code
                            className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-sm font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        ) : (
                          <code
                            className={`${className} block rounded-md bg-zinc-900 p-4 my-2 overflow-x-auto text-sm`}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {part.text}
                  </ReactMarkdown>
                );
              }
              
              // Render tool calls - type is always "tool-call"
              if (part.type === "tool-call") {
                const toolCall = part as any;
                console.log("[Tool Call Debug]", {
                  toolName: toolCall.toolName,
                  args: toolCall.args,
                  result: toolCall.result,
                });
                
                // Check if this is the visualizePattern tool
                if (toolCall.toolName === "visualizePattern") {
                  const result = toolCall.result;
                  
                  if (result?.success && result?.visualization) {
                    const viz = result.visualization;
                    return (
                      <div key={`tool-${i}`} className="not-prose my-4">
                        <PatternVisualizer
                          patternId={viz.patternId}
                          title={viz.title}
                          description={viz.description}
                          code={viz.code}
                          language={viz.language}
                          flowSteps={viz.flowSteps}
                          highlightConcepts={viz.highlightConcepts}
                          difficulty={viz.difficulty}
                          category={viz.category}
                          tags={viz.tags}
                        />
                      </div>
                    );
                  }
                }
                
                // Generic tool result display for debugging other tools
                return (
                  <div
                    key={`tool-${i}`}
                    className="not-prose my-2 rounded border p-2 text-xs bg-yellow-50 dark:bg-yellow-900/20"
                  >
                    🔧 Tool: {toolCall.toolName || "unknown"}
                  </div>
                );
              }
              
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading indicator component
function LoadingIndicator() {
  return (
    <div className="mb-6 flex gap-3">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
        AI
      </div>

      {/* Typing animation */}
      <div className="flex-1">
        <div className="rounded-2xl bg-muted/50 px-4 py-3 max-w-full">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LearnPage() {
  // Use useChatRuntime - defaults to /api/chat
  const runtime = useChatRuntime({
    generateId: generateUUID,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen flex-col">
        {/* Header */}
        <header className="border-b bg-background px-4 py-3">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-xl font-semibold">Effect Pattern Playground</h1>
            <p className="text-sm text-muted-foreground">
              Ask me about Effect patterns, and I&apos;ll help you learn
              interactively
            </p>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          <div className="mx-auto flex h-full max-w-4xl flex-col px-4">
            <ThreadPrimitive.Root className="flex h-full flex-col">
              <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto py-4">
                <ThreadPrimitive.Empty>
                  <div className="flex h-full items-center justify-center p-8">
                    <div className="max-w-md text-center">
                      <div className="mb-6 text-6xl">🎯</div>
                      <h2 className="mb-3 text-2xl font-bold">
                        Effect Pattern Playground
                      </h2>
                      <p className="mb-6 text-muted-foreground">
                        Learn Effect-TS patterns through interactive examples
                        and explanations
                      </p>
                      <div className="rounded-lg border bg-muted/30 p-4 text-left">
                        <p className="mb-2 text-sm font-semibold">
                          Try asking about:
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>
                            💡 &quot;Show me how to handle errors with
                            Effect.gen&quot;
                          </li>
                          <li>
                            🔄 &quot;Explain Effect.retry with examples&quot;
                          </li>
                          <li>
                            🎨 &quot;What are the best patterns for data
                            fetching?&quot;
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </ThreadPrimitive.Empty>
                
                {/* Messages */}
                <ThreadPrimitive.Messages components={{ Message }} />
                
                {/* Loading indicator - shows while AI is generating */}
                <ThreadPrimitive.If running>
                  <LoadingIndicator />
                </ThreadPrimitive.If>
              </ThreadPrimitive.Viewport>

              {/* Composer - Enhanced input area */}
              <div className="border-t bg-background py-4">
                <ComposerPrimitive.Root className="relative">
                  <ComposerPrimitive.Input
                    placeholder="Ask about Effect patterns..."
                    className="w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                    rows={1}
                  />
                  <div className="absolute bottom-3 right-3">
                    <ComposerPrimitive.Send className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                      Send
                    </ComposerPrimitive.Send>
                  </div>
                </ComposerPrimitive.Root>
              </div>
            </ThreadPrimitive.Root>
          </div>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

