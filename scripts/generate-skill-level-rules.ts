import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

interface Rule {
  title: string;
  description: string;
  example?: string;
}

const main = async () => {
  const rootDir = path.join(__dirname, "..");
  const contentDir = path.join(rootDir, "content");
  const rulesDir = path.join(rootDir, "rules");

  try {
    const files = await fs.readdir(contentDir);
    const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

    const rulesBySkill: Record<string, Rule[]> = {};

    for (const file of mdxFiles) {
      const filePath = path.join(contentDir, file);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      if (data.skillLevel && data.title && data.rule?.description) {
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

        if (!rulesBySkill[data.skillLevel]) {
          rulesBySkill[data.skillLevel] = [];
        }
        rulesBySkill[data.skillLevel].push(rule);
      }
    }

    for (const skillLevel in rulesBySkill) {
      const skillFile = path.join(rulesDir, `${skillLevel}.md`);
      const rules = rulesBySkill[skillLevel];

      const outputContent = rules
        .map((rule) => {
            let output = `## ${rule.title}\n**Rule:** ${rule.description}`;
            if (rule.example) {
                output += `\n\n### Example\n${rule.example}`;
            }
            return output;
        })
        .join("\n\n");

      await fs.writeFile(skillFile, outputContent);
      console.log(`Successfully generated ${skillFile}`);
    }
  } catch (error) {
    console.error("Error generating skill level rules files:", error);
    process.exit(1);
  }
};

main();
