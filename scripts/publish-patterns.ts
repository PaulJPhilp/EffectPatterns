import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from 'commander';

/**
 * Publish Patterns Script
 * 
 * This script processes MDX files by replacing Example components with the 
 * actual TypeScript code from the source files. It performs several validations
 * to ensure data integrity.
 */
const program = new Command();

program
  .requiredOption('-i, --indir <directory>', 'Input directory containing MDX files')
  .requiredOption('-o, --outdir <directory>', 'Output directory for processed MDX files')
  .requiredOption('-s, --srcdir <directory>', 'Directory containing TypeScript source files')
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
    
    // Read all MDX files from the input directory
    const mdxFiles = await fs.readdir(inDir).then(files => 
      files.filter(file => file.endsWith('.mdx') && file !== 'index.mdx')
    );
    
    // Read all TS files from the source directory
    const tsFiles = await fs.readdir(srcDir).then(files => 
      files.filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    );
    
    // Create a map of TS files for quick lookup
    const tsFileMap = new Map();
    tsFiles.forEach(file => {
      tsFileMap.set(path.basename(file, '.ts'), file);
    });
    
    console.log(`Found ${mdxFiles.length} MDX files and ${tsFiles.length} TypeScript files`);
    
    // Limit the number of files to process if count is specified
    const filesToProcess = count ? mdxFiles.slice(0, count) : mdxFiles;

    console.log(`Processing ${filesToProcess.length} files from ${inDir} to ${outDir}`);
    console.log(`Using TypeScript source files from ${srcDir}`);

    for (const mdxFile of filesToProcess) {
      const mdxFilePath = path.join(inDir, mdxFile);
      const outFilePath = path.join(outDir, mdxFile);
      const tsFileName = mdxFile.replace('.mdx', '.ts');
      const tsFilePath = path.join(srcDir, tsFileName);
      
      // Read the MDX content
      const mdxContent = await fs.readFile(mdxFilePath, 'utf-8');
      
      // Check for Example tag
      const exampleRegex = /<Example path="\.\/src\/(.*?)" \/>/;
      const exampleMatch = mdxContent.match(exampleRegex);
      
      if (!exampleMatch) {
        console.error(`❌ Fatal error: No Example tag found in ${mdxFile}`);
        process.exit(1);
      }
      
      const referencedTsFile = exampleMatch[1];
      
      // Verify that the referenced TS file matches the expected filename
      if (referencedTsFile !== tsFileName) {
        console.error(`❌ Fatal error: Example in ${mdxFile} references ` +
          `${referencedTsFile} but expected ${tsFileName}`);
        process.exit(1);
      }
      
      // Check if the TypeScript file exists
      try {
        await fs.access(tsFilePath);
      } catch (error) {
        console.error(`❌ Fatal error: TypeScript file ${tsFilePath} ` +
          `referenced in ${mdxFile} does not exist`);
        process.exit(1);
      }
      
      // Read the TypeScript code
      const tsCode = await fs.readFile(tsFilePath, 'utf-8');
      
      // Replace the Example tag with the TypeScript code block
      const placeholder = `<Example path="./src/${tsFileName}" />`;
      const codeBlock = `\`\`\`typescript\n${tsCode}\n\`\`\``;
      const newMdxContent = mdxContent.replace(placeholder, codeBlock);
      
      // Write the processed MDX file to the output directory
      await fs.writeFile(outFilePath, newMdxContent);
      console.log(`✅ Published ${mdxFile} to ${outFilePath}`);
    }

    console.log('✨ Publishing complete!');
  } catch (error) {
    console.error('Error publishing patterns:', error);
    process.exit(1);
  }
};

main();
