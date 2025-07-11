import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from 'commander';

/**
 * Process patterns script
 * 
 * This script processes MDX files by extracting TypeScript code blocks and
 * replacing them with Example components. It can optionally save the extracted
 * TypeScript code to files.
 */
const program = new Command();

program
  .requiredOption('-i, --indir <directory>', 'Input directory containing MDX files')
  .requiredOption('-o, --outdir <directory>', 'Output directory for processed MDX files')
  .option('-s, --srcdir <directory>', 'Optional directory to save extracted TypeScript code')
  .option('-c, --count <number>', 'Optional number of files to process')
  .parse(process.argv);

const options = program.opts();

const main = async () => {
  try {
    const inDir = options.indir;
    const outDir = options.outdir;
    const srcDir = options.srcdir;
    const count = options.count ? parseInt(options.count, 10) : undefined;

    // Ensure the output directory exists
    await fs.mkdir(outDir, { recursive: true });
    
    // If srcDir is provided, ensure it exists
    if (srcDir) {
      await fs.mkdir(srcDir, { recursive: true });
    }

    // Read all MDX files from the input directory
    const files = await fs.readdir(inDir);
    const mdxFiles = files.filter(
      (file) => file.endsWith('.mdx') && file !== 'index.mdx'
    );

    // Limit the number of files to process if count is specified
    const filesToProcess = count ? mdxFiles.slice(0, count) : mdxFiles;

    console.log(`Processing ${filesToProcess.length} files from ${inDir} to ${outDir}`);
    if (srcDir) {
      console.log(`Saving TypeScript code to ${srcDir}`);
    }

    for (const mdxFile of filesToProcess) {
      const mdxFilePath = path.join(inDir, mdxFile);
      const outFilePath = path.join(outDir, mdxFile);
      const tsFileName = mdxFile.replace('.mdx', '.ts');
      const tsFilePath = srcDir ? path.join(srcDir, tsFileName) : null;

      const mdxContent = await fs.readFile(mdxFilePath, 'utf-8');

      const goodExampleHeading = '## Good Example';
      const startIndex = mdxContent.indexOf(goodExampleHeading);

      if (startIndex === -1) {
        console.warn(`⚠️ No '## Good Example' section found in ${mdxFile}`);
        // Copy the file as-is to the output directory
        await fs.writeFile(outFilePath, mdxContent);
        console.log(`📋 Copied ${mdxFile} to output (no Good Example found)`);
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

      const codeBlockRegex = /```typescript\n([\s\S]*?)\n```/;
      const match = exampleSection.match(codeBlockRegex);

      if (match && match[1]) {
        const tsCode = match[1].trim();
        const fullCodeBlock = match[0];

        // Replace the specific code block with a placeholder in the original content
        const placeholder = `<Example path="./src/${tsFileName}" />`;
        const newMdxContent = mdxContent.replace(fullCodeBlock, placeholder);

        // Write the processed MDX file to the output directory
        await fs.writeFile(outFilePath, newMdxContent);
        console.log(`📝 Processed ${mdxFile} to ${outFilePath}`);

        // If srcDir is provided, save the TypeScript code
        if (srcDir && tsFilePath) {
          await fs.writeFile(tsFilePath, tsCode);
          console.log(`✅ Extracted TypeScript code to ${tsFilePath}`);
        }
      } else {
        console.warn(
          `⚠️ No TypeScript code block found in 'Good Example' of ${mdxFile}`
        );
        // Copy the file as-is to the output directory
        await fs.writeFile(outFilePath, mdxContent);
        console.log(`📋 Copied ${mdxFile} to output (no code block found)`);
      }
    }

    console.log('✨ Processing complete!');
  } catch (error) {
    console.error('Error processing patterns:', error);
    process.exit(1);
  }
};

main();
