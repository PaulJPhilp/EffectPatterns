'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'submitted' || status === 'streaming'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <h1 className="text-2xl font-bold">Effect Patterns Chat</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about Effect patterns, get code help, or chat about your preferences
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div className="space-y-4">
              <div className="text-4xl">💬</div>
              <h2 className="text-xl font-semibold">Start a conversation</h2>
              <p className="text-muted-foreground">
                Ask about Effect patterns, share your preferences, or get code review help
              </p>
              <div className="mt-8 space-y-2 text-sm text-muted-foreground">
                <p className="font-medium">Try asking:</p>
                <ul className="space-y-1">
                  <li>&quot;How do I handle retries with backoff in Effect?&quot;</li>
                  <li>&quot;Remember that I prefer Effect.gen over .pipe chains&quot;</li>
                  <li>&quot;What are the best patterns for error handling?&quot;</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => {
            const content = (message as any).content ?? []
            const text = content
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join('')

            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.role !== 'user' && (
                    <div className="mb-2 flex flex-col gap-1">
                      {content
                        .filter(
                          (p: any) =>
                            p.type === 'tool-call' ||
                            p.type === 'tool-result',
                        )
                        .map((p: any, i: number) => {
                          const isCall = p.type === 'tool-call'
                          const name = p.toolName ?? 'tool'
                          const rawArgs =
                            p.args ?? p.arguments ?? p.input ?? p.parameters ?? null
                          const rawResult = p.result ?? p.output ?? p.data ?? null
                          const pretty = (value: unknown) => {
                            try {
                              return JSON.stringify(value, null, 2)
                            } catch {
                              return String(value)
                            }
                          }
                          return (
                            <details key={i} className="group">
                              <summary className="flex items-center gap-2 cursor-pointer">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                                    isCall
                                      ? 'bg-blue-600/90 text-white'
                                      : 'bg-green-600/90 text-white'
                                  }`}
                                >
                                  {isCall ? 'call' : 'result'}: {name}
                                </span>
                                {isCall && (
                                  <span className="inline-flex h-3 w-3 items-center justify-center">
                                    {isLoading && (
                                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                                    )}
                                  </span>
                                )}
                              </summary>
                              <div className="mt-2 rounded-md bg-background/60 p-2 text-xs">
                                {isCall ? (
                                  <pre className="whitespace-pre-wrap break-words">
                                    {rawArgs ? pretty(rawArgs) : 'No arguments'}
                                  </pre>
                                ) : (
                                  <pre className="whitespace-pre-wrap break-words">
                                    {rawResult ? pretty(rawResult) : 'No result'}
                                  </pre>
                                )}
                              </div>
                            </details>
                          )
                        })}
                    </div>
                  )}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{text}</p>
                    ) : (
                      <ReactMarkdown>{text}</ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg bg-muted p-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-foreground"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-background p-4">
        <form onSubmit={(e) => {
          e.preventDefault()
          if (input.trim()) {
            sendMessage({ text: input })
            setInput('')
          }
        }} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Effect patterns..."
            className="min-h-[60px] flex-1 resize-none"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (input.trim()) {
                  sendMessage({ text: input })
                  setInput('')
                }
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="h-[60px] w-[60px]">
            <Send className="h-5 w-5" />
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
