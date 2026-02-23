# Staging Deployment Checklist

Use this checklist to bring up and verify a full staging (Vercel Preview) environment that is isolated from production.

## 1. Staging database (Neon)

- Use your Neon **staging** branch/instance (separate from production).
- **Local reference:** A gitignored file **`.env.preview`** at repo root holds the staging `DATABASE_URL` and related vars. Use it for local preview runs or copy values into Vercel.
- **Vercel Preview:** In Vercel → Project → Settings → Environment Variables, add for **Preview** only:
  - **Key:** `DATABASE_URL`
  - **Value:** Your Neon staging **pooler** URL (same as in `.env.preview`).
- Do **not** set this for Production; Production keeps its own `DATABASE_URL`.

## 2. Vercel Preview environment

- In Vercel → Project → Settings → Environment Variables:
  - For **Preview** only, set `DATABASE_URL` to the staging Postgres URL.
  - For **Preview**, set `OTEL_RESOURCE_ATTRIBUTES=environment=staging` (and any `OTEL_EXPORTER_*` if using a separate Honeycomb dataset).
  - When PostHog is added: set `NEXT_PUBLIC_POSTHOG_KEY` (and host if needed) for Preview.
  - When WorkOS is added: set `WORKOS_CLIENT_ID` and `WORKOS_API_KEY` (or secret) to staging app credentials for Preview.

## 3. WorkOS (when integrated)

- In WorkOS dashboard: add a **Staging Redirect URI** `https://effect-patterns-mcp-staging.vercel.app/callback`.
- Use Preview env vars in Vercel as in step 2.

## 4. Migrations

- Migrations run automatically on Preview builds via the root build script (`scripts/vercel-build.sh`) when `VERCEL_ENV=preview`.
- Ensure Preview has `DATABASE_URL` set so the migration step can connect to the staging DB.

## 5. Verify staging

- Deploy to Preview (e.g. push to a staging branch or open a PR).
- Call: `GET https://<your-preview-url>/api/health?deep=true`
- Expect: `200`, `environment: "preview"`, `database: "ok"`, `ok: true`.
- If the DB is unreachable you get `503`, `database: "error"`, `ok: false`.

See [packages/mcp-server/ENV_VARS.md](../../packages/mcp-server/ENV_VARS.md) for the full list of staging (Preview) environment variables.
