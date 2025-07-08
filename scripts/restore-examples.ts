import * as fs from 'fs/promises';
import * as path from 'path';

const contentDir = path.join(__dirname, '..', 'content');
const srcDir = path.join(contentDir, 'src');

const main = async () => {
  try {
    const files = await fs.readdir(contentDir);
    const mdxFiles = files.filter(
      (file) => file.endsWith('.mdx') && file !== 'index.mdx'
    );

    for (const mdxFile of mdxFiles) {
      const mdxFilePath = path.join(contentDir, mdxFile);
      const tsFileName = mdxFile.replace('.mdx', '.ts');
      const tsFilePath = path.join(srcDir, tsFileName);

      const mdxContent = await fs.readFile(mdxFilePath, 'utf-8');
      const placeholder = `<Example path="./src/${tsFileName}" />`;

      if (mdxContent.includes(placeholder)) {
        try {
          const tsCode = await fs.readFile(tsFilePath, 'utf-8');
          const codeBlock = `\`\`\`typescript\n${tsCode}\n\`\`\``;
          const newMdxContent = mdxContent.replace(placeholder, codeBlock);
          await fs.writeFile(mdxFilePath, newMdxContent);
          console.log(`✅ Restored code block in ${mdxFilePath}`);
        } catch (e) {
          console.warn(`⚠️ No .ts file found for ${mdxFile}, skipping.`);
        }
      }
    }
  } catch (error) {
    console.error('Error restoring examples:', error);
    process.exit(1);
  }
};

main();
