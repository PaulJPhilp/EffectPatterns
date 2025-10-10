# Branch Protection Configuration

This document describes the recommended branch protection rules for the `main` branch to ensure code quality and prevent breaking changes.

## Required Status Checks

The following CI jobs must pass before merging to `main`:

### Core Checks
- **lint** - Prettier and Biome code formatting/linting
- **typecheck** - TypeScript type checking
- **test-toolkit** - Unit tests for toolkit package
- **build-toolkit** - Build and schema generation for toolkit
- **build-mcp-server** - Build MCP server
- **test-integration** - Integration tests for MCP server
- **ci-success** - Meta-job that fails if any required job fails

## GitHub Settings Configuration

To configure branch protection rules via GitHub UI:

1. **Navigate to Settings**:
   - Go to repository settings
   - Click "Branches" in left sidebar
   - Click "Add branch protection rule" or edit existing rule

2. **Branch name pattern**: `main`

3. **Required settings**:

   ✅ **Require a pull request before merging**
   - Require approvals: 1 (recommended)
   - Dismiss stale pull request approvals when new commits are pushed
   - Require review from Code Owners (optional)

   ✅ **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Status checks that are required:
     ```
     lint
     typecheck
     test-toolkit
     build-toolkit
     build-mcp-server
     test-integration
     ci-success
     ```

   ✅ **Require conversation resolution before merging**

   ✅ **Do not allow bypassing the above settings**

4. **Optional (recommended) settings**:

   ☑️ **Require linear history**
   - Prevents merge commits, requires rebase or squash

   ☑️ **Require deployments to succeed before merging**
   - If you have deployment previews

## Programmatic Configuration (GitHub API)

You can also configure branch protection using the GitHub API or `gh` CLI:

```bash
gh api repos/PaulJPhilp/Effect-Patterns/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=lint \
  --field required_status_checks[contexts][]=typecheck \
  --field required_status_checks[contexts][]=test-toolkit \
  --field required_status_checks[contexts][]=build-toolkit \
  --field required_status_checks[contexts][]=build-mcp-server \
  --field required_status_checks[contexts][]=test-integration \
  --field required_status_checks[contexts][]=ci-success \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field enforce_admins=true \
  --field required_conversation_resolution=true \
  --field required_linear_history=true
```

## Terraform Configuration

If using Terraform for infrastructure as code:

```hcl
resource "github_branch_protection" "main" {
  repository_id = "Effect-Patterns"
  pattern       = "main"

  required_status_checks {
    strict   = true
    contexts = [
      "lint",
      "typecheck",
      "test-toolkit",
      "build-toolkit",
      "build-mcp-server",
      "test-integration",
      "ci-success"
    ]
  }

  required_pull_request_reviews {
    required_approving_review_count = 1
    dismiss_stale_reviews           = true
  }

  enforce_admins              = true
  require_conversation_resolution = true
  require_linear_history      = true
}
```

## Bypass Permissions

Repository administrators can bypass these rules if absolutely necessary, but this should be:
- Done sparingly and only in emergencies
- Documented in commit messages
- Followed up with a PR to fix any issues

## Updating Status Checks

When adding new CI jobs that should be required:

1. Add the job to `.github/workflows/ci.yml`
2. Add it to the `needs` array in the `ci-success` job
3. Update this document
4. Update branch protection settings via UI, API, or Terraform

## Codecov Integration

The `codecov` status check will appear automatically after the first coverage upload. To make it required:

1. Wait for first coverage report to be uploaded
2. Add `codecov/project` and `codecov/patch` to required status checks (optional)

## Local Testing

Before pushing, ensure all checks pass locally:

```bash
# Run all checks
bun run lint
bun run typecheck
bun --filter @effect-patterns/toolkit run test:coverage
bun --filter @effect-patterns/toolkit run build
bun --filter @effect-patterns/toolkit run build:schemas
bun --filter @effect-patterns/mcp-server run build

# Integration tests (requires dev server running)
bun --filter @effect-patterns/mcp-server run dev &
sleep 5
bun --filter @effect-patterns/mcp-server run test:integration
```

## Troubleshooting

**Status check not showing up?**
- Ensure the job name in `.github/workflows/ci.yml` matches exactly
- Check that the workflow has run at least once on the branch
- Status check names are case-sensitive

**CI failing on PRs but passing locally?**
- Check for environment-specific issues
- Ensure all dependencies are in `package.json` (not just global installs)
- Review CI logs for detailed error messages

**Need to merge urgently?**
- Contact a repository administrator
- Document the reason in the PR
- Create a follow-up issue to fix properly
