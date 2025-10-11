# Discord Ingestion Setup Guide

## Overview

The `scripts/ingest-discord.ts` script exports Discord channel data, anonymizes it, and saves it to `content/discord/beginner-questions.json` for use in training datasets.

## Prerequisites

- Bun runtime installed
- Discord bot with appropriate permissions
- DiscordChatExporter.Cli tool

## Setup Instructions

### Step 1: Download DiscordChatExporter.Cli

1. Go to the [DiscordChatExporter releases page](https://github.com/Tyrrrz/DiscordChatExporter/releases/latest)
2. Download the appropriate version for your platform (e.g., `DiscordChatExporter.Cli.linux-x64.zip` for Linux)
3. Extract the archive
4. Create a `tools/` directory in the monorepo root:
   ```bash
   mkdir -p tools
   ```
5. Copy or move the executable to `tools/DiscordChatExporter.Cli`
6. Make it executable (Linux/macOS):
   ```bash
   chmod +x tools/DiscordChatExporter.Cli
   ```

### Step 2: Create Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Effect Patterns Exporter")
4. Go to the "Bot" tab
5. Click "Add Bot"
6. Under "Privileged Gateway Intents", enable:
   - Message Content Intent
7. Click "Reset Token" and copy your bot token
8. **Keep this token secret!**

### Step 3: Invite Bot to Server

1. In the Developer Portal, go to "OAuth2" → "URL Generator"
2. Select scopes:
   - `bot`
3. Select bot permissions:
   - Read Messages/View Channels
   - Read Message History
4. Copy the generated URL and open it in your browser
5. Select the server and authorize the bot

### Step 4: Get Channel ID

1. In Discord, enable Developer Mode:
   - Settings → Advanced → Developer Mode
2. Right-click the channel you want to export
3. Click "Copy ID"

### Step 5: Configure Environment

Create a `.env` file in the monorepo root with the following content:

```env
# Your Discord Bot Token (keep this secret!)
DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"

# The ID of the channel you want to export (e.g., #effect-for-beginners)
DISCORD_CHANNEL_ID="YOUR_CHANNEL_ID_HERE"

# The path to the exporter executable
DISCORD_EXPORTER_PATH="./tools/DiscordChatExporter.Cli"
```

**Important:** Replace the placeholder values with your actual credentials.

## Running the Script

From the monorepo root, run:

```bash
bun run scripts/ingest-discord.ts
```

### Expected Output

```
timestamp=... level=INFO fiber=#0 message="Starting Discord channel export..."
timestamp=... level=INFO fiber=#0 message="Successfully exported 1234 messages."
timestamp=... level=INFO fiber=#0 message="Anonymizing user data..."
timestamp=... level=INFO fiber=#0 message="Saving anonymized data to content/discord/beginner-questions.json..."
timestamp=... level=INFO fiber=#0 message="Export complete!"
```

## Output Format

The script creates a JSON file at `content/discord/beginner-questions.json` with the following structure:

```json
{
  "messages": [
    {
      "id": "1234567890",
      "content": "How do I handle errors in Effect?",
      "author": {
        "id": "user_1",
        "name": "user_1"
      }
    }
  ]
}
```

### Anonymization

- User IDs are replaced with pseudonyms (e.g., `user_1`, `user_2`)
- User names are replaced with the same pseudonyms
- The mapping is consistent within a single export
- Message content is preserved as-is

## Troubleshooting

### "Command not found" error

Ensure the `DISCORD_EXPORTER_PATH` points to the correct location and the file is executable.

### "Unauthorized" error

- Verify your bot token is correct
- Ensure the bot has been invited to the server
- Check that the bot has "Read Message History" permission

### "Channel not found" error

- Verify the channel ID is correct
- Ensure the bot has access to the channel
- Private channels require explicit bot access

### Permission errors on temp files

The script creates temporary files in `/tmp`. Ensure you have write permissions.

## Architecture

The script uses the `@effect-patterns/effect-discord` package, which provides:

- **Discord Service**: High-level API for Discord operations
- **DiscordConfig**: Configuration service with secret management
- **DiscordLive**: Layer that orchestrates command execution, file I/O, and cleanup
- **Type-safe errors**: Tagged errors for precise error handling

### Dependencies

- `@effect-patterns/effect-discord`: Custom Discord service
- `@effect/platform`: Cross-platform Effect APIs
- `@effect/platform-node`: Node.js-specific implementations
- `effect`: Core Effect-TS library

## Security Notes

1. **Never commit `.env` file** - It contains your bot token
2. **Keep bot token secret** - Treat it like a password
3. **Use minimal permissions** - Only grant what the bot needs
4. **Rotate tokens regularly** - Reset if compromised

## Next Steps

After exporting data, you can:

1. Review the anonymized data
2. Curate specific message threads
3. Use the data for LLM training
4. Build question/answer datasets
5. Analyze common patterns in beginner questions

---

For more information about the Effect-TS Discord service, see `packages/effect-discord/README.md`.
