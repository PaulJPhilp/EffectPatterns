# Linting Configuration Guide

**Status**: Updated November 4, 2025

## Overview

This document explains the linting configuration for the Effect-Patterns repository, particularly for GitHub Actions workflows.

## False Positive Warnings in GitHub Actions

### The Issue

When editing `.github/workflows/*.yml` files with the GitHub Actions extension installed, you may see warnings like:
```
Context access might be invalid: VERCEL_TOKEN
Context access might be invalid: VERCEL_ORG_ID
Context access might be invalid: VERCEL_PATTERNS_CHAT_APP_PROJECT_ID
```

These appear **50+ times** in the deploy.yml file and can be noisy.

### Why This Happens

These warnings come from **VS Code's GitHub Actions validator extension**, not from yamllint. The extension can't validate that:
- GitHub repository secrets exist (requires API access)
- Dynamic context expressions are correct at runtime

However, these are **safe and expected**. Secrets configured in your GitHub repository settings work perfectly when the workflow runs.

### Solution

**Disable the GitHub Actions extension for this workspace** (recommended):

1. Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Disable (Workspace) - GitHub Actions`
3. Select the option

This:
- ✅ Removes all ~50 false positive warnings
- ✅ Keeps YAML syntax highlighting
- ✅ Keeps file associations for `.yml` files
- ✅ Doesn't affect deployment

**Or ignore the warnings** - they're harmless. The workflows will deploy successfully regardless.

See `.vscode/GITHUB_ACTIONS_CONFIG.md` for detailed instructions.

## Linting Rules

### yamllint Configuration (`.yamllint`)

- **Line length**: Max 120 characters (warning level)
- **Indentation**: 2 spaces
- **Comments**: Min 2 spaces from content
- **Trailing spaces**: Enabled
- **Document start**: Not required
- **Key duplicates**: Forbidden

### YAML Formatting

Our YAML follows these standards:
- 2-space indentation
- No document start markers (`---`) in workflows
- Max 120 character lines
- Trailing spaces removed

## Common Linting Tasks

### Check YAML files
```bash
# Using yamllint directly
yamllint .github/workflows/

# VS Code linting (automatic)
# Warnings appear inline as you edit
```

### Format YAML files
```bash
# Using prettier
npx prettier --write ".github/workflows/*.yml"

# Set as default formatter in VS Code
# (Already configured in .vscode/settings.json)
```

## GitHub Actions Best Practices

### Using Secrets
```yaml
# ✅ This is valid at runtime (don't worry about the linter warning)
with:
  vercel-token: ${{ secrets.VERCEL_TOKEN }}
  vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
```

**Secret validation happens at GitHub runtime**, not in the editor.

### Using Contexts
```yaml
# ✅ All valid GitHub Actions contexts
- run: echo ${{ github.event_name }}
- run: echo ${{ runner.os }}
- run: echo ${{ secrets.MY_SECRET }}
```

See [GitHub Actions Contexts](https://docs.github.com/en/actions/learn-github-actions/contexts) for all available contexts.

## Ignoring Specific Warnings

If needed, you can suppress specific warnings in a workflow:

```yaml
# Disable all linting
# yamllint disable
jobs:
  my-job:
    # ...
# yamllint enable

# Disable specific rules
# yamllint disable rule:line-length
name: My Workflow
# yamllint enable rule:line-length
```

## VS Code Extensions Used

- **YAML** (by Red Hat) - Provides YAML support and validation
- **GitHub Actions** (by GitHub) - Provides workflow validation and context awareness
- **Prettier** - Code formatter for YAML

## Updating Linting Configuration

To modify linting rules:

1. **For yamllint**: Edit `.yamllint`
2. **For VS Code**: Edit `.vscode/settings.json`
3. **For GitHub Actions**: Add inline comments or configure extension settings

## References

- [yamllint Documentation](https://yamllint.readthedocs.io/)
- [GitHub Actions Contexts](https://docs.github.com/en/actions/learn-github-actions/contexts)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [VS Code YAML Extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)
- [GitHub Actions Extension](https://marketplace.visualstudio.com/items?itemName=github.vscode-github-actions)

---

**Key Takeaway**: The "Context access might be invalid" warnings are false positives. Your workflows are correctly configured and will work fine at runtime. The linting configuration prioritizes catching real issues while safely ignoring these expected validation limitations.
