#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import { Command } from 'commander';
import matter from 'gray-matter';

// Define command line options
const program = new Command();
program
  .requiredOption('--indir <directory>', 'Input directory containing MDX files')
  .option('--count <number>', 'Number of files to process', parseInt)
  .parse(process.argv);

const options = program.opts();

// Validate required options
if (!options.indir) {
  console.error('❌ Error: --indir is required');
  process.exit(1);
}

const inputDir = path.resolve(options.indir);
const count = options.count;

const main = async () => {
  try {
    // Ensure directory exists
    await fs.access(inputDir);

    console.log(`Validating frontmatter in MDX files in ${inputDir}`);

    // Get all MDX files from input directory
    const files = await fs.readdir(inputDir);
    const mdxFiles = files.filter(file => file.endsWith('.mdx') && file !== 'index.mdx');

    console.log(`Found ${mdxFiles.length} MDX files`);

    // Limit the number of files to process if count is specified
    const filesToProcess = count ? mdxFiles.slice(0, count) : mdxFiles;
    console.log(`Processing ${filesToProcess.length} files from ${inputDir}`);

    let hasErrors = false;
    let errorCount = 0;

    for (const mdxFile of filesToProcess) {
      const baseName = path.basename(mdxFile, '.mdx');
      const mdxFilePath = path.join(inputDir, mdxFile);

      try {
        // Read MDX file content
        const mdxContent = await fs.readFile(mdxFilePath, 'utf-8');
        
        // Parse frontmatter
        const { data } = matter(mdxContent);
        
        // Validate frontmatter has required fields
        if (!data.id) {
          console.error(`❌ Error: No 'id' field in frontmatter of ${mdxFile}`);
          hasErrors = true;
          errorCount++;
          continue;
        }

        // Check if frontmatter id matches filename
        if (data.id !== baseName) {
          console.error(`❌ Error: Frontmatter id "${data.id}" does not match filename "${baseName}" in ${mdxFile}`);
          hasErrors = true;
          errorCount++;
          continue;
        }

        // Verify the file exists
        const mdxExists = await fs.access(mdxFilePath)
          .then(() => true)
          .catch(() => false);

        if (!mdxExists) {
          console.error(`❌ Error: MDX file ${mdxFile} does not exist but is referenced in frontmatter`);
          hasErrors = true;
          errorCount++;
          continue;
        }

        console.log(`✅ Validated frontmatter for ${mdxFile}`);
      } catch (error: any) {
        console.error(`❌ Error processing ${mdxFile}: ${error?.message || String(error)}`);
        hasErrors = true;
        errorCount++;
      }
    }

    if (hasErrors) {
      console.error(`❌ Fatal error: Found ${errorCount} validation errors`);
      process.exit(1);
    } else {
      console.log(`✨ Validation complete! All ${filesToProcess.length} files have valid frontmatter.`);
    }
  } catch (error: any) {
    console.error(`❌ Fatal error: ${error?.message || String(error)}`);
    process.exit(1);
  }
};

main();
