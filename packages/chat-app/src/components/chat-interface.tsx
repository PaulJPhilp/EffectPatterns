import type { PatternSummary } from '@effect-patterns/toolkit';
import { Effect } from 'effect';
import { useState } from 'react';
import { useEffectCallback } from '../hooks/use-effect-state';
import { McpClient, McpClientLayer } from '../services/mcp-client';
import { PatternCard } from './pattern-card';
import { SearchBar } from './search-bar';

type Message = {
  id: string;
  type: 'user' | 'system';
  content: string;
  patterns?: PatternSummary[];
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content:
        "Hello! I can help you search for Effect patterns. Try searching for something like 'error handling' or 'concurrent'.",
    },
  ]);

  const [searchPatterns, searchState] = useEffectCallback((query: string) =>
    Effect.gen(function* () {
      const client = yield* McpClient;
      const patterns = yield* client.searchPatterns(query);
      return { query, patterns };
    }).pipe(Effect.provide(McpClientLayer))
  );

  const handleSearch = async (query: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Perform search
    await searchPatterns(query);

    // Add system response
    if (searchState.data) {
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Found ${searchState.data.patterns.length} patterns matching "${searchState.data.query}"`,
        patterns: searchState.data.patterns,
      };
      setMessages((prev) => [...prev, systemMessage]);
    }

    if (searchState.error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Error: ${searchState.error}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handlePatternSelect = (pattern: PatternSummary) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'system',
      content: `Selected: ${pattern.title}`,
    };
    setMessages((prev) => [...prev, message]);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem',
      }}
    >
      <h1 style={{ marginBottom: '1rem' }}>Effect Patterns Chat</h1>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '1rem',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          padding: '1rem',
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: message.type === 'user' ? '#e3f2fd' : 'white',
              borderRadius: '8px',
              border: '1px solid #ddd',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                color: message.type === 'user' ? '#1976d2' : '#666',
              }}
            >
              {message.type === 'user' ? 'You' : 'Assistant'}
            </div>
            <div>{message.content}</div>

            {message.patterns && message.patterns.length > 0 && (
              <div
                style={{
                  marginTop: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1rem',
                }}
              >
                {message.patterns.map((pattern) => (
                  <PatternCard
                    key={pattern.id}
                    onSelect={handlePatternSelect}
                    pattern={pattern}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {searchState.isLoading && (
          <div
            style={{
              padding: '1rem',
              textAlign: 'center',
              color: '#666',
            }}
          >
            Searching patterns...
          </div>
        )}
      </div>

      <SearchBar isLoading={searchState.isLoading} onSearch={handleSearch} />
    </div>
  );
}
