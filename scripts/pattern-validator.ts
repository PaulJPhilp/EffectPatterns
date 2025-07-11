#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import { Command } from 'commander';

// Define command line options
const program = new Command();
program
  .requiredOption('--indir <directory>', 'Input directory containing MDX files')
  .requiredOption('--srcdir <directory>', 'Source directory containing TypeScript files')
  .option('--count <number>', 'Number of files to process', parseInt)
  .parse(process.argv);

const options = program.opts();

// Validate required options
if (!options.indir || !options.srcdir) {
  console.error('❌ Error: Both --indir and --srcdir are required');
  process.exit(1);
}

const inputDir = path.resolve(options.indir);
const srcDir = path.resolve(options.srcdir);
const count = options.count;

const main = async () => {
  try {
    // Ensure directories exist
    await fs.access(inputDir);
    await fs.access(srcDir);

    console.log(`Validating patterns in ${inputDir} against TypeScript files in ${srcDir}`);

    // Get all MDX files from input directory
    const files = await fs.readdir(inputDir);
    const mdxFiles = files.filter(file => file.endsWith('.mdx') && file !== 'index.mdx');
    
    // Get all TypeScript files from source directory
    const srcFiles = await fs.readdir(srcDir);
    const tsFiles = srcFiles.filter(
      file => file.endsWith('.ts') && !file.endsWith('.d.ts')
    );

    // Create a map of TS files for quick lookup
    const tsFileMap = new Map();
    tsFiles.forEach(file => {
      tsFileMap.set(path.basename(file, '.ts'), file);
    });
    
    console.log(`Found ${mdxFiles.length} MDX files and ${tsFiles.length} TypeScript files`);

    // Limit the number of files to process if count is specified
    const filesToProcess = count ? mdxFiles.slice(0, count) : mdxFiles;
    console.log(`Processing ${filesToProcess.length} files from ${inputDir}`);
    console.log(`Using TypeScript source files from ${srcDir}`);

    let hasErrors = false;
    let errorCount = 0;

    for (const mdxFile of filesToProcess) {
      const baseName = path.basename(mdxFile, '.mdx');
      const tsFileName = `${baseName}.ts`;
      const tsFilePath = path.join(srcDir, tsFileName);
      const mdxFilePath = path.join(inputDir, mdxFile);

      try {
        // Check if corresponding TypeScript file exists
        await fs.access(tsFilePath);
        
        // Read MDX file content
        const mdxContent = await fs.readFile(mdxFilePath, 'utf-8');
        
        // Find the Good Example section
        const goodExampleHeading = '## Good Example';
        const startIndex = mdxContent.indexOf(goodExampleHeading);
        
        if (startIndex === -1) {
          console.error(`❌ Error: No '## Good Example' section found in ${mdxFile}`);
          hasErrors = true;
          errorCount++;
          continue;
        }
        
        // Find the end of the "Good Example" section, which is the next heading
        const contentAfterExample = mdxContent.substring(
          startIndex + goodExampleHeading.length
        );
        const nextHeadingRegex = /(\n## |\n---)/;
        const endMatch = contentAfterExample.match(nextHeadingRegex);
        let endIndex = mdxContent.length;
        if (endMatch && endMatch.index !== undefined) {
          endIndex = startIndex + goodExampleHeading.length + endMatch.index;
        }
        
        const exampleSection = mdxContent.substring(startIndex, endIndex);
        
        // Extract TypeScript code block from the Good Example section
        const codeBlockRegex = /```typescript\n([\s\S]*?)\n```/;
        const match = exampleSection.match(codeBlockRegex);
        
        if (!match || !match[1]) {
          console.error(`❌ Error: No TypeScript code block found in '## Good Example' section of ${mdxFile}`);
          hasErrors = true;
          errorCount++;
          continue;
        }
        
        const mdxCodeBlock = match[1].trim();
        
        // Read TypeScript file content
        const tsContent = await fs.readFile(tsFilePath, 'utf-8');
        const tsCode = tsContent.trim();
        
        // Compare code blocks
        if (mdxCodeBlock !== tsCode) {
          console.error(`❌ Error: TypeScript code block in ${mdxFile} does not match ${tsFileName}`);
          
          // Show a simple diff to help identify the issue
          console.error('--- First 5 lines of MDX code block:');
          const mdxLines = mdxCodeBlock.split('\n').slice(0, 5);
          mdxLines.forEach((line, i) => console.error(`${i + 1}: ${line}`));
          
          console.error('--- First 5 lines of TypeScript file:');
          const tsLines = tsCode.split('\n').slice(0, 5);
          tsLines.forEach((line, i) => console.error(`${i + 1}: ${line}`));
          
          // Check for whitespace/newline issues
          if (mdxCodeBlock.replace(/\s+/g, '') === tsCode.replace(/\s+/g, '')) {
            console.error('Note: The difference appears to be only in whitespace or newlines');
          }
          
          hasErrors = true;
          errorCount++;
          continue;
        }
        
        console.log(`✅ Validated ${mdxFile} against ${tsFileName}`);
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
      console.log(`✨ Validation complete! All ${filesToProcess.length} files are valid.`);
    }
  } catch (error: any) {
    console.error(`❌ Fatal error: ${error?.message || String(error)}`);
    process.exit(1);
  }
};

main();
