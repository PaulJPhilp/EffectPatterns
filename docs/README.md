# Effect Patterns Documentation

This documentation covers the Effect Patterns project - a curated collection of
Effect-TS patterns, best practices, and tooling.

## Quick Links

- **[Getting Started](./getting-started/ABOUT.md)** - Project overview and setup
- **[Architecture](./Architecture.md)** - System design and workspace layout
- **[Database Architecture](./DATABASE_ARCHITECTURE.md)** - Database schema reference

---

## Documentation Structure

### [Getting Started](./getting-started/)

Introduction to the project.

- **[ABOUT.md](./getting-started/ABOUT.md)** - Project overview and goals

### Architecture

System design, data models, and service patterns.

- **[Architecture.md](./Architecture.md)** - Workspace layout, MCP server, database, config
- **[DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md)** - Canonical database schema
- **[SERVICE_PATTERNS.md](./SERVICE_PATTERNS.md)** - Effect service patterns
- **[DEPENDENCIES.md](./DEPENDENCIES.md)** - Project dependencies

### CLI

Command-line tools for managing patterns and content.

- **[packages/ep-cli/README.md](../packages/ep-cli/README.md)** - End-user CLI (`ep`)
- **[packages/ep-admin/README.md](../packages/ep-admin/README.md)** - Admin CLI (`ep-admin`)

### [Development](./development/)

Development workflows, testing, and CI/CD.

- **[PIPELINE.md](./development/PIPELINE.md)** - Development pipeline
- **[PUBLISHING_PIPELINE.md](./development/PUBLISHING_PIPELINE.md)** -
  Content publishing workflow
- **[TESTING.md](./development/TESTING.md)** - Testing guide

### [Jobs To Be Done](./jobs-to-be-done/)

Pattern coverage by use case - what patterns exist for each job.

- **[JOBS_TO_BE_DONE.md](./jobs-to-be-done/JOBS_TO_BE_DONE.md)** - Overview
- Category-specific JTBD docs for core concepts, error management, schema, streams, concurrency, APIs, data pipelines, domain modeling, HTTP, observability, platform, resources, scheduling, testing, and debugging.

---

## Key Commands

```bash
# Run the admin CLI
ep-admin --help

# Validate patterns
ep-admin publish validate

# Run tests
ep-admin publish test

# Run full pipeline
ep-admin publish pipeline

# Check database
ep-admin db test-quick
```

---

## Project Stats

- **700+ Effect-TS patterns** covering real-world use cases
- **Organized by skill level**: Beginner, Intermediate, Advanced
- **Full test coverage** with type checking and runtime validation
- **PostgreSQL database** for pattern storage and search

---

*Last updated: February 2026*
