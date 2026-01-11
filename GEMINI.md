# Gemini Integration

This document provides information about Google Gemini integration with the Effect Patterns project.

## AI Model Support

The Effect Patterns project supports Google Gemini for various AI-powered features and pattern analysis.

### Quick Start

1. **Configure API Key**
   ```bash
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

2. **Use with CLI Commands**
   ```bash
   # Process patterns with Gemini
   ./ep-admin process --provider google --model gemini-2.5-flash
   
   # Generate patterns with Gemini
   ./ep-admin generate --provider google
   ```

### Supported Models

- **Gemini 2.5 Flash** - Fast, efficient model for most tasks
- **Gemini Pro** - Higher quality for complex analysis
- **Gemini 1.5 Flash** - Legacy support

### Features

- **Pattern Generation**: Create new Effect-TS patterns
- **Code Analysis**: Analyze and improve existing patterns
- **Documentation**: Auto-generate pattern documentation
- **QA Processing**: Automated quality assurance

### Documentation

For complete details about AI agents and integration, see:
- **[AGENTS.md](./AGENTS.md)** - Full agent documentation

### Configuration

Environment variables for Gemini:
```bash
GOOGLE_API_KEY=your_api_key
GOOGLE_MODEL=gemini-2.5-flash
GOOGLE_REGION=us-central1
```

### CLI Examples

```bash
# Generate a new pattern
./ep-admin generate --provider google --model gemini-2.5-flash

# Process content with Gemini
./ep-admin process --provider google

# QA analysis with Gemini
./ep-admin qa process --ai-provider google
```

### Rate Limits

- **Free Tier**: 60 requests per minute
- **Pro Tier**: 1500 requests per minute
- **Enterprise**: Custom limits

### Troubleshooting

1. **API Key Issues**
   - Verify your API key is valid
   - Check region configuration
   - Ensure billing is enabled

2. **Model Not Available**
   - Try `gemini-2.5-flash` instead of `gemini-pro`
   - Check Gemini API status

3. **Rate Limiting**
   - Implement exponential backoff
   - Use batch processing for bulk operations

### Best Practices

1. **Use Gemini 2.5 Flash** for most tasks (best performance/cost ratio)
2. **Implement retry logic** for network issues
3. **Cache responses** for repeated requests
4. **Monitor usage** to avoid rate limits

### Support

For issues or questions:
1. Check the [AGENTS.md](./AGENTS.md) documentation
2. Review Google Gemini API documentation
3. Check CLI logs for error details

---

*See [AGENTS.md](./AGENTS.md) for complete agent documentation.*
