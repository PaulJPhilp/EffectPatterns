<!-- Moved: canonical content is now at docs/guides/CONTRIBUTING.md -->

This top-level file has been moved. See the canonical guide at:

   docs/guides/CONTRIBUTING.md

(This stub preserves the old path while directing readers to the new location.)
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