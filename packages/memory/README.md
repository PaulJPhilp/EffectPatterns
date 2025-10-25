# Memory Package

This package provides a library for interacting with Supermemory to manage documents and URLs.

## Installation

```bash
bun add @effect-patterns/memory # (Once published to a registry)
# Or, if developing locally within the monorepo:
bun install
```

## Library Usage

You can import the `DocumentProcessor` class to programmatically interact with Supermemory.

```typescript
import { DocumentProcessor } from '@effect-patterns/memory';
import * as fs from 'fs';

const processor = new DocumentProcessor();

async function uploadExample() {
  // Upload a file
  const filePath = './path/to/your/document.pdf';
  const fileBuffer = fs.readFileSync(filePath);
  const resultFile = await processor.uploadDocument({
    file: fileBuffer,
    filename: 'document.pdf',
    collection: 'my-collection',
    metadata: { author: 'John Doe' }
  });
  console.log('Uploaded file:', resultFile);

  // Upload a URL
  const url = 'https://example.com/article';
  const resultUrl = await processor.uploadURL({
    url: url,
    collection: 'my-collection',
    metadata: { source: 'web' }
  });
  console.log('Uploaded URL:', resultUrl);

  // List documents
  const documents = await processor.listDocuments('my-collection');
  console.log('Documents in collection:', documents);
}

uploadExample();
```

### Environment Variables

Ensure you have your Supermemory API key set as an environment variable:

```bash
export SUPERMEMORY_API_KEY="YOUR_SUPERMEMORY_API_KEY"
```

## CLI Usage

First, build the package:

```bash
bun run build
```

Then, you can use the `memory-cli` command.

### Environment Variables

Ensure you have your Supermemory API key set as an environment variable:

```bash
export SUPERMEMORY_API_KEY="YOUR_SUPERMEMORY_API_KEY"
```

### Commands

#### `upload-file`

Uploads a local file to a specified Supermemory collection.

```bash
memory-cli upload-file --filePath ./path/to/your/file.txt --collection my-documents --metadata '{"category":"reports"}'
```

- `--filePath`: Path to the file to upload.
- `--collection`: Name of the collection.
- `--metadata` (optional): JSON string of additional metadata.

#### `upload-url`

Uploads a URL to a specified Supermemory collection.

```bash
memory-cli upload-url --url https://www.supermemory.ai/docs/quickstart --collection supermemory-docs
```

- `--url`: The URL to upload.
- `--collection`: Name of the collection.
- `--metadata` (optional): JSON string of additional metadata.

#### `list-documents`

Lists documents within a specified Supermemory collection.

```bash
memory-cli list-documents --collection my-documents
```

- `--collection`: Name of the collection.

#### `ask`

Asks the AI a question, using a specified Supermemory collection for context.

```bash
memory-cli ask --question "What are the key features of Supermemory?" --collection supermemory-docs
```

- `--question`: The question to ask the AI.
- `--collection`: The Supermemory collection to use for context.
