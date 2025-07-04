import * as fs from "fs/promises";
import * as path from "path";

const main = async () => {
  const rootDir = path.join(__dirname, "..");
  const rulesPath = path.join(rootDir, "rules", "rules.md");
  const compactRulesPath = path.join(rootDir, "rules", "rules-compact.md");

  try {
    const content = await fs.readFile(rulesPath, "utf-8");
    const lines = content.split("\n");

    const compactLines: string[] = [];

    // The first few lines of the input file are a general introduction.
    if (lines.length > 2) {
        compactLines.push(lines[0]);
        compactLines.push(lines[1]);
        compactLines.push(lines[2]);
        compactLines.push("");
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("## ") && !line.startsWith("###")) {
        // Found a potential rule title. Check the next non-empty line.
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (nextLine.trim() === "") {
            continue;
          }
          if (nextLine.startsWith("**Rule:**")) {
            compactLines.push(line);
            compactLines.push(nextLine);
            compactLines.push(""); // Add a newline for separation
            i = j; // Continue search from after the rule line
          }
          // We only care about the immediate next non-empty line.
          // If it's not a rule, we move on.
          break;
        }
      }
    }

    const finalContent = compactLines.join("\n");
    await fs.writeFile(compactRulesPath, finalContent);

    console.log(`Successfully generated ${compactRulesPath}`);
  } catch (error) {
    console.error("Error generating compact rules file:", error);
    process.exit(1);
  }
};

main();
