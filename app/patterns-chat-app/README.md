<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<a href="https://effect-patterns.vercel.app/">
  <img alt="Patterns Chat App - Effect-TS Educational Chat Assistant" src="app/(chat)/opengraph-image.png">
  <h1 align="center">Patterns Chat App</h1>
</a>

<p align="center">
    Patterns Chat App is an intelligent chatbot powered by Effect-TS patterns, built with Next.js, AI SDK, and Supermemory for retrieval-augmented generation (RAG).
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#architecture"><strong>Architecture</strong></a> ·
  <a href="#setup"><strong>Setup</strong></a> ·
  <a href="#pattern-loading"><strong>Pattern Loading</strong></a> ·
  <a href="#development"><strong>Development</strong></a> ·
  <a href="#deployment"><strong>Deployment</strong></a>
</p>
<br/>

## Features

- **Retrieval-Augmented Generation (RAG)**
  - Intelligent pattern retrieval using Supermemory's memory router API
  - Query scoring to determine when patterns are relevant
  - Seamless integration of Effect-TS patterns into chat responses

- **Effect-TS Pattern Knowledge**
  - Pre-loaded patterns covering beginner to advanced topics
  - Semantic search across pattern content
  - Educational guidance based on user queries

- [Next.js](https://nextjs.org) 14 App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions
  
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text with LLMs
  - Support for multiple model providers
  
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Accessible component primitives from [Radix UI](https://radix-ui.com)

- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for chat history
  - [Vercel Blob](https://vercel.com/storage/blob) for file storage

## Architecture

### Pattern Loading Workflow

1. **Pattern Ingestion** (Release Time)
   - Patterns are prepared and uploaded to Supermemory via `sm-cli`
   - Stored in the `effect-patterns` project in Supermemory
   - Static data - patterns don't change at runtime

2. **Runtime Pattern Retrieval**
   - When user sends a message, a scoring system evaluates relevance
   - If patterns are needed, the app queries Supermemory's memory router
   - Relevant patterns are embedded in the system context

3. **Chat Enhancement**
   - LLM receives user message + relevant patterns
   - Responses are enriched with pattern examples and guidance
   - Pattern references are highlighted in the UI

### Key Components

- **PatternsService**: Queries Supermemory memory router API
- **PatternScorer**: Evaluates if user query needs pattern context
- **usePatternRetrieval**: React hook for retrieving patterns in chat
- **Chat Interface**: Displays pattern references alongside AI responses

## Setup

### Prerequisites

- Node.js 18+ or Bun
- Supermemory API key
- Environment variables configured

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file (or use Vercel Environment Variables):
   ```env
   # Supermemory Configuration
   SUPERMEMORY_API_KEY=your-api-key-here
   SUPERMEMORY_PROJECT_ID=effect-patterns
   
   # AI Model Configuration
   AI_GATEWAY_API_KEY=your-ai-gateway-key-or-leave-for-vercel-oidc
   
   # Database (Neon Postgres)
   DATABASE_URL=postgresql://...
   
   # Storage (Vercel Blob)
   BLOB_READ_WRITE_TOKEN=your-token-here
   
   # Node Environment
   NODE_ENV=development
   ```

3. **Download Vercel environment variables (if using Vercel):**
   ```bash
   vercel link
   vercel env pull
   ```

## Pattern Loading

### Pre-loading Patterns into Supermemory

Before running the chat app, load Effect-TS patterns using the `sm-cli`:

```bash
# Navigate to sm-cli directory
cd app/sm-cli

# Install dependencies
pnpm install

# Set your Supermemory API key
export SUPERMEMORY_API_KEY="your-api-key-here"

# Upload all patterns to the 'effect-patterns' project
pnpm run dev -- patterns upload --all

# Verify patterns were uploaded
pnpm run dev -- memories list --type pattern
```

For detailed CLI commands, see [sm-cli README](../sm-cli/README.md).

### Pattern Scoring

The app automatically scores incoming user queries to determine if patterns are relevant:

- **High relevance**: Patterns about error handling, dependency injection, services, etc.
- **Medium relevance**: General Effect-TS concepts
- **Low relevance**: Unrelated queries (general conversation, non-TS topics)

Only queries with sufficient relevance scores trigger pattern retrieval.

## Development

### Running Locally

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run with database migration
pnpm run db:migrate && pnpm dev
```

Your app should be running on [localhost:3000](http://localhost:3000).

### Database

```bash
# Generate new migration
pnpm run db:generate

# Push migrations to database
pnpm run db:push

# Open database studio
pnpm run db:studio
```

### Testing

```bash
# Run Playwright tests
pnpm test

# Lint code
pnpm run lint

# Format code
pnpm run format
```

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (uses VERCEL_PATTERNS_CHAT_APP_PROJECT_ID secret)
vercel --prod
```

### Environment Variables for Production

Ensure these are set in Vercel dashboard:
- `SUPERMEMORY_API_KEY`
- `SUPERMEMORY_PROJECT_ID`
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `AI_GATEWAY_API_KEY` (optional - uses OIDC on Vercel)

### Health Check

After deployment, verify the service is running:
```bash
curl https://effect-patterns-patterns-chat-app.vercel.app/api/health
```

## Architecture Notes

### Auth.js Migration

Auth.js will be replaced with a custom authentication solution soon. Current implementation provides:
- User session management
- Chat history persistence
- Rate limiting per user

### Memory Router Integration

This app uses Supermemory's memory-router API to query patterns:
- Endpoint: `https://api.supermemory.ai/v1/memory-router`
- Project: `effect-patterns`
- Search type: Semantic + keyword hybrid

## Contributing

1. Create a new branch for your changes
2. Update pattern loading logic in `lib/services/patterns-service.ts`
3. Add tests for new features
4. Submit a pull request

## License

MIT

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template uses the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to access multiple AI models through a unified interface. The default configuration includes [xAI](https://x.ai) models (`grok-2-vision-1212`, `grok-3-mini`) routed through the gateway.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/nextjs-ai-chatbot)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).
