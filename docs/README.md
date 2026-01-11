# Effect Patterns Documentation

This documentation covers the Effect Patterns project - a curated collection of 
Effect-TS patterns, best practices, and tooling.

## Quick Links

- **[Getting Started](./getting-started/ABOUT.md)** - Project overview and setup
- **[CLI Reference](./cli/CLI_REFERENCE.md)** - Command-line tools documentation
- **[Architecture](./architecture/ARCHITECTURE.md)** - System design and data model

---

## 📁 Documentation Structure

### [Getting Started](./getting-started/)
Introduction to the project and how to contribute.

- **[ABOUT.md](./getting-started/ABOUT.md)** - Project overview and goals
- **[CONTRIBUTING.md](./getting-started/CONTRIBUTING.md)** - Contribution guidelines

### [Architecture](./architecture/)
System design, data models, and service patterns.

- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - High-level architecture
- **[ARCHITECTURE_REQUIREMENTS.md](./architecture/ARCHITECTURE_REQUIREMENTS.md)** - 
  Technical requirements
- **[DATA_MODEL.md](./architecture/DATA_MODEL.md)** - Database schema
- **[DATA_MODEL_TECHNICAL_OVERVIEW.md](./architecture/DATA_MODEL_TECHNICAL_OVERVIEW.md)** - 
  Detailed data model
- **[SERVICE_PATTERNS.md](./architecture/SERVICE_PATTERNS.md)** - Effect service patterns
- **[DEPENDENCIES.md](./architecture/DEPENDENCIES.md)** - Project dependencies

### [CLI](./cli/)
Command-line tools for managing patterns and content.

- **[CLI_REFERENCE.md](./cli/CLI_REFERENCE.md)** - Complete CLI reference
- **[EP_ADMIN.md](./cli/EP_ADMIN.md)** - Admin CLI documentation
- **[EP_ADMIN_QUICK_REFERENCE.md](./cli/EP_ADMIN_QUICK_REFERENCE.md)** - Quick reference
- **[EP_CLI.md](./cli/EP_CLI.md)** - Main CLI documentation
- **[SETUP.md](./cli/SETUP.md)** - CLI setup instructions

### [Development](./development/)
Development workflows, testing, and CI/CD.

- **[PIPELINE.md](./development/PIPELINE.md)** - Development pipeline
- **[PUBLISHING_PIPELINE.md](./development/PUBLISHING_PIPELINE.md)** - 
  Content publishing workflow
- **[PIPELINE_STATE.md](./development/PIPELINE_STATE.md)** - Pipeline state tracking
- **[PIPELINE_STATE_MACHINE.md](./development/PIPELINE_STATE_MACHINE.md)** - 
  State machine design
- **[QA_PROCESS.md](./development/QA_PROCESS.md)** - Quality assurance process
- **[TESTING.md](./development/TESTING.md)** - Testing guide
- **[TEST_COVERAGE.md](./development/TEST_COVERAGE.md)** - Test coverage report
- **[DATABASE_TESTING.md](./development/DATABASE_TESTING.md)** - Database test guide
- **[MIGRATION_TESTING.md](./development/MIGRATION_TESTING.md)** - Migration testing
- **[CI_CD.md](./development/CI_CD.md)** - CI/CD configuration
- **[LINTING_CONFIGURATION.md](./development/LINTING_CONFIGURATION.md)** - Linting setup

### [Jobs To Be Done](./jobs-to-be-done/)
Pattern coverage by use case - what patterns exist for each job.

- **[JOBS_TO_BE_DONE.md](./jobs-to-be-done/JOBS_TO_BE_DONE.md)** - Overview
- **[CORE_CONCEPTS_JOBS_TO_BE_DONE.md](./jobs-to-be-done/CORE_CONCEPTS_JOBS_TO_BE_DONE.md)** - 
  Core Effect concepts
- **[ERROR_MANAGEMENT_JOBS_TO_BE_DONE.md](./jobs-to-be-done/ERROR_MANAGEMENT_JOBS_TO_BE_DONE.md)** - 
  Error handling patterns
- **[SCHEMA_JOBS_TO_BE_DONE.md](./jobs-to-be-done/SCHEMA_JOBS_TO_BE_DONE.md)** - 
  Schema validation patterns
- **[STREAMS_JOBS_TO_BE_DONE.md](./jobs-to-be-done/STREAMS_JOBS_TO_BE_DONE.md)** - 
  Stream processing patterns
- **[CONCURRENCY_JOBS_TO_BE_DONE.md](./jobs-to-be-done/CONCURRENCY_JOBS_TO_BE_DONE.md)** - 
  Concurrency patterns
- **[BUILDING_APIS_JOBS_TO_BE_DONE.md](./jobs-to-be-done/BUILDING_APIS_JOBS_TO_BE_DONE.md)** - 
  API patterns
- **[BUILDING_DATA_PIPELINES_JOBS_TO_BE_DONE.md](./jobs-to-be-done/BUILDING_DATA_PIPELINES_JOBS_TO_BE_DONE.md)** - 
  Data pipeline patterns
- **[DOMAIN_MODELING_JOBS_TO_BE_DONE.md](./jobs-to-be-done/DOMAIN_MODELING_JOBS_TO_BE_DONE.md)** - 
  Domain modeling patterns
- **[MAKING_HTTP_REQUESTS_JOBS_TO_BE_DONE.md](./jobs-to-be-done/MAKING_HTTP_REQUESTS_JOBS_TO_BE_DONE.md)** - 
  HTTP client patterns
- **[OBSERVABILITY_JOBS_TO_BE_DONE.md](./jobs-to-be-done/OBSERVABILITY_JOBS_TO_BE_DONE.md)** - 
  Logging and tracing patterns
- **[PLATFORM_JOBS_TO_BE_DONE.md](./jobs-to-be-done/PLATFORM_JOBS_TO_BE_DONE.md)** - 
  Platform service patterns
- **[RESOURCE_MANAGEMENT_JOBS_TO_BE_DONE.md](./jobs-to-be-done/RESOURCE_MANAGEMENT_JOBS_TO_BE_DONE.md)** - 
  Resource lifecycle patterns
- **[SCHEDULING_JOBS_TO_BE_DONE.md](./jobs-to-be-done/SCHEDULING_JOBS_TO_BE_DONE.md)** - 
  Scheduling patterns
- **[TESTING_JOBS_TO_BE_DONE.md](./jobs-to-be-done/TESTING_JOBS_TO_BE_DONE.md)** - 
  Testing patterns
- **[TOOLING_AND_DEBUGGING_JOBS_TO_BE_DONE.md](./jobs-to-be-done/TOOLING_AND_DEBUGGING_JOBS_TO_BE_DONE.md)** - 
  Debugging patterns

---

## 🛠 Key Commands

```bash
# Run the admin CLI
./ep-admin --help

# Validate patterns
./ep-admin validate

# Run tests
./ep-admin test

# Run full pipeline
./ep-admin pipeline

# Check database
./ep-admin db test-quick
```

---

## 📊 Project Stats

- **700+ Effect-TS patterns** covering real-world use cases
- **Organized by skill level**: Beginner, Intermediate, Advanced
- **Full test coverage** with type checking and runtime validation
- **PostgreSQL database** for pattern storage and search

---

*Last updated: January 2026*
