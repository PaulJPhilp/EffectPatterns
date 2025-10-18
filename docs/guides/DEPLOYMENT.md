## Vercel Deployment

The Pattern Server is configured to deploy to Vercel as serverless functions.

### Prerequisites

1. Install Vercel CLI: `npm i -g vercel`
2. Have a Vercel account at https://vercel.com

### Deployment Steps

#### Option 1: Deploy via Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Option 2: Deploy via GitHub Integration

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel will automatically detect the configuration
4. Click "Deploy"

### Configuration

The deployment is configured via `vercel.json`:

- **Build**: Uses `@vercel/node` to build TypeScript serverless functions
- **Routes**: Maps all API routes to the serverless function handler
- **Source**: All logic is in `api/index.ts`

### API Endpoints

Once deployed, your API will be available at:

```
https://your-project.vercel.app/health
https://your-project.vercel.app/api/v1/rules
https://your-project.vercel.app/api/v1/rules/:id
```

### Environment Variables

No environment variables are currently required. All configuration is handled automatically.

### Testing Deployment

After deployment, test the endpoints:

```bash
# Health check
curl https://your-project.vercel.app/health

# List all rules
curl https://your-project.vercel.app/api/v1/rules

# Get specific rule
curl https://your-project.vercel.app/api/v1/rules/use-effect-gen-for-business-logic
```

### Updating the Deployment

Simply push changes to your main branch. If you have GitHub integration enabled, Vercel will automatically redeploy.

For manual deployments:

```bash
# Deploy latest changes
vercel --prod
```

### Rollback

If you need to rollback to a previous deployment:

1. Go to your project dashboard on Vercel
2. Navigate to "Deployments"
3. Find the previous working deployment
4. Click "Promote to Production"

### Monitoring

View logs and analytics in the Vercel dashboard:
- https://vercel.com/dashboard
- Select your project
- Go to "Deployments" or "Analytics"

## Local Development

To run the server locally:

```bash
# Start the development server
bun run server:dev

# Or run the standalone server
bun run server/index.ts
```

The server will be available at http://localhost:3001

## Testing

Run the full test suite:

```bash
# All API tests
bun run test:api

# Individual test suites
bun run test:server      # Server tests
bun run test:cli         # CLI tests
bun run test:e2e         # Integration tests
```
