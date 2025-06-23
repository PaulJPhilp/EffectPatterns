import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

// --- CONFIGURATION ---

const CONTENT_DIR = path.join(process.cwd(), "content");
const README_PATH = path.join(process.cwd(), "README.md");

// Define the order and descriptions for our use cases
const USE_CASE_CONFIG = {
	"Core Concepts": "The absolute fundamentals of Effect. Start here to understand the core philosophy.",
	"Project Setup & Execution": "Getting started and running code, from simple scripts to long-running applications.",
	"Domain Modeling": "Building a type-safe, expressive model of your business logic.",
	"Error Management": "Strategies for building resilient applications by treating failures as first-class citizens.",
	"API Development": "Building and interacting with APIs, managing dependencies, and handling resources.",
	"Application Configuration": "Managing configuration from different sources in a type-safe and testable way.",
	"Testing": "How to test Effect code effectively, reliably, and deterministically.",
};

const USE_CASE_ORDER = Object.keys(USE_CASE_CONFIG);

// --- TYPE DEFINITIONS ---

interface PatternFrontmatter {
	id: string;
	title: string;
	skillLevel: "beginner" | "intermediate" | "advanced";
	useCase: string[];
	summary: string;
}

// --- HELPER FUNCTIONS ---

/**
 * Parses the frontmatter from a single .mdx file.
 */
async function parsePatternFile(
	filePath: string,
): Promise<PatternFrontmatter> {
	const fileContent = await fs.readFile(filePath, "utf-8");
	const { data } = matter(fileContent);
	// Basic validation
	if (
		!data.id ||
		!data.title ||
		!data.skillLevel ||
		!data.useCase ||
		!data.summary
	) {
		throw new Error(`Missing frontmatter in ${filePath}`);
	}
	return data as PatternFrontmatter;
}

/**
 * Reads all .mdx files from the content directory and parses them.
 */
async function getAllPatterns(): Promise<PatternFrontmatter[]> {
	const files = await fs.readdir(CONTENT_DIR);
	const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
	return Promise.all(
		mdxFiles.map((file) => parsePatternFile(path.join(CONTENT_DIR, file))),
	);
}

/**
 * Groups patterns by their use case.
 */
function groupPatternsByUseCase(
	patterns: PatternFrontmatter[],
): Record<string, PatternFrontmatter[]> {
	const grouped: Record<string, PatternFrontmatter[]> = {};

	for (const pattern of patterns) {
		for (const useCase of pattern.useCase) {
			if (!grouped[useCase]) {
				grouped[useCase] = [];
			}
			grouped[useCase].push(pattern);
		}
	}

	// Sort patterns within each group for consistent ordering
	for (const useCase in grouped) {
		grouped[useCase].sort((a, b) => a.title.localeCompare(b.title));
	}

	return grouped;
}

/**
 * Generates the Markdown for a single use case section.
 */
function generateUseCaseSection(
	useCase: string,
	patterns: PatternFrontmatter[],
): string {
	const skillLevelMap = {
		beginner: "🟢 **Beginner**",
		intermediate: "🟡 **Intermediate**",
		advanced: "🔴 **Advanced**",
	};

	const description =
  useCase in USE_CASE_CONFIG
    ? USE_CASE_CONFIG[useCase as keyof typeof USE_CASE_CONFIG]
    : undefined;
	let markdown = `## ${useCase}\n\n`;
	if (description) {
		markdown += `${description}\n\n`;
	}

	markdown += `| Pattern | Skill Level | Summary |\n`;
	markdown += `| :--- | :--- | :--- |\n`;

	for (const pattern of patterns) {
		const link = `[${pattern.title}](./content/${pattern.id}.mdx)`;
		const skill = skillLevelMap[pattern.skillLevel];
		markdown += `| ${link} | ${skill} | ${pattern.summary} |\n`;
	}

	return markdown;
}

/**
 * Generates the full README.md content.
 */
function generateReadmeContent(
	groupedPatterns: Record<string, PatternFrontmatter[]>,
): string {
	const header = `# The Effect Patterns Hub

A community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS.

This repository is designed to be a living document that helps developers move from core concepts to advanced architectural strategies by focusing on the "why" behind the code.
`;

	const toc = `## Table of Contents\n\n${USE_CASE_ORDER.map(
		(useCase) => `- [${useCase}](#${useCase.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")})`,
	).join("\n")}`;

	const sections = USE_CASE_ORDER.map((useCase) =>
		generateUseCaseSection(useCase, groupedPatterns[useCase] || []),
	).join("\n---\n\n");

	const footer = `---

## Contributing

This is a community-driven project, and we welcome contributions! Whether it's a new pattern, a correction, or an improvement to an existing one, your help is valued.

Please read our **[CONTRIBUTING.md](./CONTRIBUTING.md)** file for guidelines on how to get started.

*This README.md is automatically generated. To update it, run the generation script.*

## Roadmap & Future Vision

This repository is the foundational layer for a much larger vision. The goal is to evolve this knowledge base into a comprehensive platform for learning and building with Effect.

Our roadmap includes:

### 1. The Effect Patterns Hub Website
A dedicated blog and documentation site built with  **Effect**. This will provide a beautiful, searchable, and interactive interface for browsing the patterns.

### 2. The "Recipes" Section
A collection of end-to-end, practical blueprints for building complete applications. This will go beyond individual patterns to show how they are composed to solve real-world problems, including:
-   Building Enterprise Apps
-   Building SaaS Apps
-   Building Real-time Apps
-   Building Runtimes for AI Agents
-   Building Blogs
-   Building Full APIs
-   Building AI-powered Applications

### 3. The "Learn Effect" Chat App
A specialized, AI-powered chat application. This app will be trained on this knowledge base, allowing developers to ask questions in natural language ("How do I handle retries?") and get synthesized answers, code examples, and links to the relevant patterns.

### 4. AI Agent Integration
Enhancing the scripts that generate machine-readable rulebooks ('rules.md', 'rules.json') from our pattern library. The goal is to create self-contained artifacts that can be directly consumed by AI coding agents like **Cursor** or custom bots, providing them with the full context of our best practices to assist in code generation and refactoring.

### 5. Internal Tooling & Automation
-   **README Generation:** The immediate next step is to create a script that automatically generates the tables in this README by parsing the frontmatter from all '.mdx' files.
-   **Rule Generation:** Continue to enhance and maintain the scripts that generate the machine-readable rulebooks.

## Contributing

This is a community-driven project, and we welcome contributions! Whether it's a new pattern, a correction, or help with one of the roadmap items, your help is valued.

Please read our **[CONTRIBUTING.md](./CONTRIBUTING.md)** file for guidelines on how to get started.
`;

	return [header, toc, "---", sections, footer].join("\n\n");
}

// --- MAIN EXECUTION ---

async function main() {
	console.log("Starting README generation...");
	const patterns = await getAllPatterns();
	const groupedPatterns = groupPatternsByUseCase(patterns);
	const readmeContent = generateReadmeContent(groupedPatterns);
	await fs.writeFile(README_PATH, readmeContent);
	console.log("✅ README.md has been successfully generated!");
}

main().catch((error) => {
	console.error("❌ Failed to generate README.md:", error);
	process.exit(1);
});