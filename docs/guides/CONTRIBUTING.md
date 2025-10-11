# Contributing to The Effect Patterns Hub

Thank you for your interest in contributing! This project aims to be the best
community-driven knowledge base for Effect-TS patterns. Every contribution helps.

## Documentation Pipeline

This project uses a two-stage pipeline system:

### 1. Ingest Stage

New patterns start in `/content/new` and go through validation:

- **Source Files**
  - TypeScript examples in `/content/new/src/*.ts`
  - MDX documentation in `/content/new/*.mdx`
  - Run `npm run ingest` to process

### 2. Publishing Pipeline

The main pipeline has five sequential steps:

1. **Test** (`/content/src`)
	- Run all TypeScript examples
	- Verify code correctness

2. **Publish** (`/content/raw` → `/content/published`)
	- Convert raw MDX to published format
	- Expand TypeScript examples inline

3. **Validate** (`/content/published`)
	- Check frontmatter and sections
	- Verify code block consistency

4. **Generate** (`README.md`)
	- Create main README
	- Group patterns by use case

5. **Rules** (`/rules`)
	- Generate AI coding rules
	- Multiple output formats

### Available Commands

- `npm run ingest` - Process new patterns from `/content/new`
- `npm run pipeline` - Run all publishing steps in sequence
- `npm run all` - Alias for pipeline

Individual pipeline steps:
- `npm run test` - Run TypeScript examples
- `npm run publish` - Convert raw to published MDX
- `npm run validate` - Validate published files
- `npm run generate` - Generate README
- `npm run rules` - Generate AI rules

### Validation Rules

All patterns must have:
1. Valid frontmatter with required fields
2. A Good Example section with TypeScript code
3. An Anti-Pattern section
4. Either an Explanation or Rationale section
5. TypeScript code that matches the source file

## Adding New Patterns

### Step 1: Create New Pattern Files

Create your new pattern in the `/content/new` directory:

1. Create the TypeScript example in `/content/new/src/{pattern-id}.ts`
2. Create the MDX documentation in `/content/new/{pattern-id}.mdx`

### Step 2: Run the Ingest Process

Run `npm run ingest` to process your new pattern. This will:
1. Validate your pattern files
2. Move the TypeScript file to `/content/src`
3. Move the MDX file to `/content/raw`

If validation fails, fix the issues and try again.

### Step 3: Run the Publishing Pipeline

1. **Fill out your pattern**
	- Add your TypeScript code to the `.ts` file
	- Fill out the MDX template with your pattern details
	- Make sure to include all required sections

2. **Run the pipeline**
	```bash
	npm run pipeline
	```
	This will:
	- Run your TypeScript example
	- Convert and validate your MDX
	- Update README and rules

3. **Submit a Pull Request**
	- Verify all pipeline steps passed
	- Include both your source files and generated files

## The Pattern Structure

Each pattern is a single `.mdx` file with YAML frontmatter for metadata and a
Markdown body for the explanation. Please fill out all fields.

-   `title`: The human-readable title.
-   `id`: A unique, kebab-case identifier (matches the filename).
-   `skillLevel`: `beginner` | `intermediate` | `advanced`
-   `useCase`: An array of high-level goals (e.g., "Domain Modeling").
-   `summary`: A concise, one-sentence explanation.
-   `tags`: A list of relevant lowercase keywords.
-   `related`: (Optional) A list of related pattern `id`s.
-   `author`: Your GitHub username or name.
