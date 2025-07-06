import * as fs from 'fs/promises';
import * as path from 'path';

const contentDir = path.join(__dirname, '..', 'content');
const srcDir = path.join(contentDir, 'src');

const main = async () => {
  try {
    // 1. Ensure the src directory exists
    await fs.mkdir(srcDir, { recursive: true });

    const files = await fs.readdir(contentDir);
    const mdxFiles = files.filter(
      (file) => file.endsWith('.mdx') && file !== 'index.mdx'
    );

    for (const mdxFile of mdxFiles) {
      const mdxFilePath = path.join(contentDir, mdxFile);
      const tsFileName = mdxFile.replace('.mdx', '.ts');
      const tsFilePath = path.join(srcDir, tsFileName);

      const mdxContent = await fs.readFile(mdxFilePath, 'utf-8');

      const goodExampleHeading = '## Good Example';
      const startIndex = mdxContent.indexOf(goodExampleHeading);

      if (startIndex === -1) {
        console.warn(`⚠️ No '## Good Example' section found in ${mdxFile}`);
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

        // Write the extracted code to a .ts file
        await fs.writeFile(tsFilePath, tsCode);
        console.log(`✅ Extracted example to ${tsFilePath}`);

        // Update the .mdx file
        await fs.writeFile(mdxFilePath, newMdxContent);
        console.log(`📝 Replaced code block in ${mdxFilePath}`);
      } else {
        console.warn(
          `⚠️ No typescript code block found in 'Good Example' of ${mdxFile}`
        );
      }
    }
  } catch (error) {
    console.error('Error extracting examples:', error);
    process.exit(1);
  }
};

main();
