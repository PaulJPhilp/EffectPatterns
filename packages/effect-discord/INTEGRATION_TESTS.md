# Discord Integration Tests

This document explains how to set up and run integration tests for the `@effect-patterns/effect-discord` package.

## Prerequisites

### 1. DiscordChatExporter.Cli Tool

The integration tests require the DiscordChatExporter.Cli tool to export Discord messages.

**Already set up**: The tool is already downloaded and configured in `./tools/DiscordChatExporter.Cli` (v2.46.0)

If you need to update or reinstall it:

```bash
# Download latest release for macOS
curl -L -o /tmp/DiscordChatExporter.Cli.osx-x64.zip \
  https://github.com/Tyrrrz/DiscordChatExporter/releases/download/2.46/DiscordChatExporter.Cli.osx-x64.zip

# Extract to tools directory
unzip -o /tmp/DiscordChatExporter.Cli.osx-x64.zip -d ./tools/

# Make executable
chmod +x ./tools/DiscordChatExporter.Cli

# Verify installation
./tools/DiscordChatExporter.Cli --version
```

For other platforms:
- **Windows**: Download `DiscordChatExporter.Cli.win-x64.zip`
- **Linux**: Download `DiscordChatExporter.Cli.linux-x64.zip`

### 2. Discord Bot Setup

To run integration tests against the real Discord API, you need:

1. **Discord Bot Token**
2. **Test Channel ID**

#### Step-by-step Guide:

**A. Create a Discord Bot**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Effect Patterns Test Bot")
4. Go to the "Bot" tab
5. Click "Add Bot"
6. Under "Privileged Gateway Intents", enable:
   - Message Content Intent
7. Click "Reset Token" to get your bot token
8. **Save this token securely** - you'll need it for the `.env` file

**B. Invite Bot to Your Test Server**

1. Go to the "OAuth2" → "URL Generator" tab
2. Select scopes:
   - `bot`
3. Select bot permissions:
   - `Read Messages/View Channels`
   - `Read Message History`
4. Copy the generated URL
5. Open it in your browser and invite the bot to a test server

**C. Get a Channel ID**

1. In Discord, enable Developer Mode:
   - Settings → Advanced → Developer Mode (toggle on)
2. Right-click on a channel in your test server
3. Click "Copy ID"
4. **Save this channel ID** - you'll need it for the `.env` file

**D. Configure Environment Variables**

Create or update your `.env` file in the project root:

```bash
# Discord Integration Test Configuration
DISCORD_BOT_TOKEN="your-bot-token-here"
DISCORD_TEST_CHANNEL_ID="your-channel-id-here"
DISCORD_EXPORTER_PATH="./tools/DiscordChatExporter.Cli"
```

**Important**:
- Never commit your bot token to version control
- The `.env` file should be in `.gitignore`

## Running Integration Tests

### Run All Tests (Including Integration Tests)

```bash
bun test packages/effect-discord/test/integration.test.ts
```

If you have the environment variables configured, this will:
- Run 3 integration tests against the real Discord API
- Run 4 unit tests for error handling and data models

### Skip Integration Tests

If you don't have Discord credentials or want to skip integration tests:

```bash
# Set this in your .env file
SKIP_INTEGRATION_TESTS=true

# Or run with environment variable
SKIP_INTEGRATION_TESTS=true bun test packages/effect-discord/test/integration.test.ts
```

This will skip the 3 integration tests but still run the unit tests.

## Test Suite Overview

### Integration Tests (require Discord credentials)

1. **Export Real Channel Messages**
   - Tests exporting messages from a real Discord channel
   - Verifies message structure and data integrity
   - Timeout: 30 seconds

2. **Handle Invalid Channel ID**
   - Tests error handling for invalid channel IDs
   - Verifies proper DiscordExportError is thrown
   - Timeout: 30 seconds

3. **Verify Message Structure**
   - Tests that all exported messages have required fields
   - Validates data types for id, content, author fields
   - Timeout: 30 seconds

### Unit Tests (always run)

4. **Service Interface Validation**
   - Tests that the Discord service has the correct interface
   - No external dependencies required

5. **Error Type Creation**
   - Tests DiscordExportError construction
   - Verifies tagged error structure

6. **Error Reason Support**
   - Tests all supported error reasons
   - CommandFailed, FileNotFound, JsonParseError

7. **Data Model Creation**
   - Tests ChannelExport and DiscordMessage construction

## Troubleshooting

### Tests Are Skipped

If you see:
```
⚠️  Integration tests will be skipped because required environment variables are not set.
```

**Solution**: Make sure you have set `DISCORD_BOT_TOKEN` and `DISCORD_TEST_CHANNEL_ID` in your `.env` file.

### Bot Token Invalid

If you see errors about authentication:
```
Error: Unauthorized (401)
```

**Solution**:
1. Verify your bot token is correct
2. Ensure the token hasn't been reset or regenerated
3. Check that you copied the full token without spaces

### Channel Not Found

If you see errors about channel access:
```
Error: Not Found (404)
```

**Solution**:
1. Verify the channel ID is correct
2. Ensure your bot is in the server that contains the channel
3. Check that the bot has "Read Messages" and "Read Message History" permissions

### Tool Not Executable

If you see:
```
Permission denied: ./tools/DiscordChatExporter.Cli
```

**Solution**:
```bash
chmod +x ./tools/DiscordChatExporter.Cli
```

## CI/CD Configuration

For continuous integration, set `SKIP_INTEGRATION_TESTS=true` in your CI environment to avoid requiring Discord credentials.

Example GitHub Actions:
```yaml
- name: Run Tests
  env:
    SKIP_INTEGRATION_TESTS: true
  run: bun test
```

## Security Notes

- **Never commit your Discord bot token** to version control
- Keep your `.env` file private
- Rotate your bot token if it's ever exposed
- Use a dedicated test server, not your production Discord server
- Consider using a separate bot token for testing vs production
