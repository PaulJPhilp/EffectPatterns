import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

interface Rule {
  title: string;
  description: string;
  example?: string;
}

// Function to sanitize use case names for filenames
const sanitizeName = (name: string) => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const main = async () => {
  const rootDir = path.join(__dirname, "..");
  const contentDir = path.join(rootDir, "content");
  const useCaseDir = path.join(rootDir, "rules", "by-use-case");

  try {
    // Ensure the output directory exists
    await fs.mkdir(useCaseDir, { recursive: true });

    const files = await fs.readdir(contentDir);
    const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

    const rulesByUseCase: Record<string, Rule[]> = {};

    for (const file of mdxFiles) {
      const filePath = path.join(contentDir, file);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      if (data.useCase && Array.isArray(data.useCase) && data.title && data.rule?.description) {
        const contentLines = content.split('\n');
        let inExampleSection = false;
        const exampleLines: string[] = [];

        for (const line of contentLines) {
            if (line.startsWith('## Good Example')) {
                inExampleSection = true;
                continue;
            }
            if (inExampleSection) {
                if (line.startsWith('## ')) {
                    break;
                }
                exampleLines.push(line);
            }
        }

        const rule: Rule = {
          title: data.title,
          description: data.rule.description,
          example: exampleLines.length > 0 ? exampleLines.join('\n').trim() : undefined
        };

        for (const useCase of data.useCase) {
            if (!rulesByUseCase[useCase]) {
                rulesByUseCase[useCase] = [];
            }
            rulesByUseCase[useCase].push(rule);
        }
      }
    }

    for (const useCase in rulesByUseCase) {
      const fileName = sanitizeName(useCase) + ".md";
      const useCaseFile = path.join(useCaseDir, fileName);
      const rules = rulesByUseCase[useCase];

      const outputContent = rules
        .map((rule) => {
            let output = `## ${rule.title}\n**Rule:** ${rule.description}`;
            if (rule.example) {
                output += `\n\n### Example\n${rule.example}`;
            }
            return output;
        })
        .join("\n\n");

      await fs.writeFile(useCaseFile, outputContent);
      console.log(`Successfully generated ${useCaseFile}`);
    }
  } catch (error) {
    console.error("Error generating use case rules files:", error);
    process.exit(1);
  }
};

main();
