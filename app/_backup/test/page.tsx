import { useState } from 'react';

export default function TestPage() {
  const [patternId, setPatternId] = useState('');
  const [response, setResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/mcp/pattern_generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({ patternId }),
    });

    const data = await res.json();
    setResponse(data);
  };

  return (
    <div>
      <h1>Test Pattern Generation</h1>
      <form onSubmit={handleSubmit}>
        <input
          onChange={(e) => setPatternId(e.target.value)}
          placeholder="Enter Pattern ID"
          type="text"
          value={patternId}
        />
        <button type="submit">Generate</button>
      </form>

      {response && (
        <div>
          <h2>Response</h2>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
