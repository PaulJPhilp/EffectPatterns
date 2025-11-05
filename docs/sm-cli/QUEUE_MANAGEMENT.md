# Supermemory Queue Management Commands

The SM-CLI now includes comprehensive queue management commands to monitor and manage the Supermemory document processing pipeline.

## Overview

When you create memories (documents) in Supermemory, they go through a processing pipeline:
- **Queued** → **Extracting** → **Chunking** → **Embedding** → **Indexing** → **Done**

The queue management commands allow you to inspect, monitor, and manage this pipeline from the CLI.

## Processing Pipeline Stages

| Stage | Description | Typical Duration |
|-------|-------------|------------------|
| `queued` | Document waiting to be processed | < 5 seconds |
| `extracting` | Content being extracted from source | 5-30 seconds |
| `chunking` | Breaking into searchable pieces | 5-15 seconds |
| `embedding` | Creating vector representations | 10-30 seconds |
| `indexing` | Adding to search index | 5-10 seconds |
| `done` | Fully processed and searchable | - |
| `failed` | Processing failed | - |

## Commands

### queue list

List all documents currently being processed in the queue.

**Usage:**
```bash
bun run sm-cli queue list
bun run sm-cli queue list --format json
```

**Options:**
- `--format` (human | json): Output format (default: human)

**Example Output:**
```
╔══════════════════════════════════════════════════════════════════╗
║ Processing Queue                                                 ║
║ 3 documents in queue                                             ║
╚══════════════════════════════════════════════════════════════════╝

┌─────────────────┬─────────────┬──────────┬──────────┬─────────────┐
│ ID              │ Status      │ Created  │ Updated  │ Tags        │
├─────────────────┼─────────────┼──────────┼──────────┼─────────────┤
│ doc_abc123...   │ ⚙️  chunking │ Nov 4    │ 16:45    │ ai-research │
│ doc_def456...   │ ⏳ queued    │ Nov 4    │ 16:44    │ patterns    │
│ doc_ghi789...   │ ✅ done     │ Nov 4    │ 16:42    │ (none)      │
└─────────────────┴─────────────┴──────────┴──────────┴─────────────┘
```

### queue status

Check the detailed status of a specific document.

**Usage:**
```bash
bun run sm-cli queue status --id <document-id>
bun run sm-cli queue status --id <document-id> --format json
```

**Options:**
- `--id` (text, required): Document ID to check
- `--format` (human | json): Output format (default: human)

**Example Output:**
```
╔════════════════════════════════════════════════════════════════════╗
║ Document Status                                                    ║
║ doc_abc123def456ghi789jkl...                                       ║
╚════════════════════════════════════════════════════════════════════╝

┌─────────────────────┬────────────────────────────────────────────┐
│ Status              │ ⚙️  chunking                                │
│ Created             │ 11/4/2025, 4:45:22 PM                      │
│ Updated             │ 11/4/2025, 4:45:28 PM                      │
│ Elapsed Time        │ 6s                                         │
│ Container Tags      │ ai-research, patterns                      │
│ Metadata            │ {"source": "upload", "priority": "high"}   │
└─────────────────────┴────────────────────────────────────────────┘
```

### queue delete

Delete a document from the queue (useful for removing stuck or failed documents).

**Usage:**
```bash
bun run sm-cli queue delete --id <document-id>
bun run sm-cli queue delete --id <document-id> --force
```

**Options:**
- `--id` (text, required): Document ID to delete
- `--force` (boolean): Skip confirmation prompt (default: false)

**Example Output:**
```
╔════════════════════════════════════════════════════════════════════╗
║ Document Deleted                                                   ║
║ ID: doc_abc123def456ghi789jkl...                                   ║
╚════════════════════════════════════════════════════════════════════╝

✓ Document removed from queue
```

### queue clear

Clear multiple failed or stuck documents from the queue in one operation.

**Usage:**
```bash
# Clear only failed documents (default)
bun run sm-cli queue clear

# Clear specific status
bun run sm-cli queue clear --status failed
bun run sm-cli queue clear --status queued
bun run sm-cli queue clear --status all

# Skip confirmation
bun run sm-cli queue clear --force
bun run sm-cli queue clear --status failed --force
```

**Options:**
- `--status` (failed | queued | all): Which documents to clear (default: failed)
- `--force` (boolean): Skip confirmation prompt (default: false)

**Example Output:**
```
⚠️  Warning: This will delete 5 document(s) from the queue.

Continue? (yes/no): yes

╔════════════════════════════════════════════════════════════════════╗
║ Queue Cleared                                                      ║
║ Processed 5 documents                                              ║
╚════════════════════════════════════════════════════════════════════╝

┌──────────┬──────────┬────────┐
│ Deleted  │ Failed   │ Total  │
├──────────┼──────────┼────────┤
│ ✓ 5      │ ✓ 0      │ 5      │
└──────────┴──────────┴────────┘
```

### queue watch

Watch a document's processing progress in real-time with polling.

**Usage:**
```bash
bun run sm-cli queue watch --id <document-id>
bun run sm-cli queue watch --id <document-id> --max-wait 600
```

**Options:**
- `--id` (text, required): Document ID to watch
- `--max-wait` (integer): Maximum wait time in seconds (default: 300)

**Example Output:**
```
👀 Watching document processing...
ID: doc_abc123def456ghi789jkl...
Max wait: 300 seconds

[polling... ⏳ extracting → ⚙️  chunking → ⚙️  embedding → ⚙️  indexing]

╔════════════════════════════════════════════════════════════════════╗
║ Processing Complete                                                ║
║ Status: ✅ done                                                     ║
╚════════════════════════════════════════════════════════════════════╝

┌──────────────┬────────────────────────────────────────────────────┐
│ Status       │ ✅ done                                            │
│ Document ID  │ doc_abc123def456ghi789jkl...                       │
│ Completed At │ 11/4/2025, 4:46:12 PM                             │
└──────────────┴────────────────────────────────────────────────────┘
```

## Common Workflows

### Monitor Processing Queue

```bash
# Check what's currently processing
bun run sm-cli queue list

# Get detailed status
bun run sm-cli queue status --id doc_xyz123
```

### Handle Stuck Documents

```bash
# View all failed documents
bun run sm-cli queue list | grep "❌"

# Clear all failed documents
bun run sm-cli queue clear --status failed --force

# Or manually delete a specific document
bun run sm-cli queue delete --id doc_stuck123 --force
```

### Watch New Document Processing

```bash
# After creating a memory, watch its progress
bun run sm-cli queue watch --id doc_newly_created
```

### Clear Specific Status

```bash
# Clear only queued documents (not started yet)
bun run sm-cli queue clear --status queued --force

# Clear everything in queue
bun run sm-cli queue clear --status all
```

## Integration with Memory Commands

The queue commands work alongside the existing memory commands:

```bash
# Create a new memory (which creates a document)
bun run sm-cli memories add

# List documents currently processing
bun run sm-cli queue list

# Watch the document complete processing
bun run sm-cli queue watch --id <document-id>

# List the memory once it's done processing
bun run sm-cli memories list
```

## Output Formats

### Human Format (Default)

Beautiful, formatted output with colors and tables using cli-table3 and chalk:
- 🟡 Yellow: `queued` status
- 🔵 Blue: Processing statuses (`extracting`, `chunking`, etc.)
- 🟢 Green: `done` status
- 🔴 Red: `failed` status

### JSON Format

Structured output for programmatic usage:

```bash
bun run sm-cli queue list --format json
```

Returns:
```json
{
  "documents": [
    {
      "id": "doc_abc123",
      "status": "chunking",
      "created_at": "2025-11-04T20:45:22Z",
      "updated_at": "2025-11-04T20:45:28Z",
      "container_tags": ["ai-research"],
      "metadata": {"source": "upload"}
    }
  ],
  "total": 1
}
```

## Error Handling

### Document Not Found

```bash
$ bun run sm-cli queue status --id invalid-id
SupermemoryError: Failed to get document status: Error: Failed to fetch document: 404
```

### Timeout While Watching

```bash
$ bun run sm-cli queue watch --id doc_slow --max-wait 10
SupermemoryError: Timeout waiting for document doc_slow to complete processing
```

### Empty Queue

```bash
$ bun run sm-cli queue list
╔══════════════════════════════╗
║ Processing Queue             ║
║ No documents being processed ║
╚══════════════════════════════╝

✓ Queue is empty! All documents have completed processing.
```

## Performance Tips

1. **Polling Interval**: The `queue watch` command polls every 2 seconds
2. **Max Wait**: Set reasonable timeouts to avoid long-running CLI commands
3. **Batch Operations**: Use `queue clear` for multiple documents instead of individual deletes
4. **JSON Output**: Use `--format json` when integrating with scripts

## API Reference

### Underlying Supermemory API

These commands use the Supermemory API endpoints:

- `GET /v3/documents/processing` - List all processing documents
- `GET /v3/documents/{id}` - Get document status
- `DELETE /v3/documents/{id}` - Delete a document

See the [Supermemory documentation](https://supermemory.ai/docs/memory-api/track-progress) for more details.
