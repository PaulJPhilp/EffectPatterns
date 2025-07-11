import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

// --- CONFIGURATION ---

const CONTENT_DIR = path.join(process.cwd(), "content/published");
const README_PATH = path.join(process.cwd(), "README.md");

// Define the order and descriptions for our use cases
const USE_CASE_CONFIG = {
	"Core Concepts": "The absolute fundamentals of Effect. Start here to understand the core philosophy.",
	"Project Setup & Execution": "Getting started and running code, from simple scripts to long-running applications.",
	"Application Configuration": "Managing configuration from different sources in a type-safe and testable way.",
	"Error Management": "Strategies for building resilient applications by treating failures as first-class citizens.",
	"Domain Modeling": "Building a type-safe, expressive model of your business logic.",
	"Modeling Time": "Representing and manipulating time in your applications.",
	"Modeling Data": "Working with data structures and transformations in a type-safe way.",
	"Making HTTP Requests": "Acting as a client to call external APIs and services",
	"Building APIs": "Creating APIs with Effect, including routing, request handling, and response generation.",
	"Building Data Pipelines": "Processing and transforming data in a lazy, composable, and resource-safe manner.",
	"Concurrency": "Building efficient, non-blocking applications that can handle multiple tasks simultaneously.",
	"Testing": "How to test Effect code effectively, reliably, and deterministically.",
};

// Dynamically build the use case list from patterns
function getDynamicUseCaseOrder(groupedPatterns: Record<string, PatternFrontmatter[]>): string[] {
  // Start with known use cases (in order)
  const known = Object.keys(USE_CASE_CONFIG);
  // Find any unknown use cases
  const all = Object.keys(groupedPatterns);
  const unknown = all.filter((uc) => !known.includes(uc)).sort();
  return [...known, ...unknown];
}


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

	// Sort patterns within each group: first by skill level, then by title
	const skillOrder = { beginner: 0, intermediate: 1, advanced: 2 };
	for (const useCase in grouped) {
		grouped[useCase].sort((a, b) => {
			const skillDiff = skillOrder[a.skillLevel] - skillOrder[b.skillLevel];
			if (skillDiff !== 0) return skillDiff;
			return a.title.localeCompare(b.title);
		});
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
		advanced: "🟠 **Advanced**",
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
		const link = `[${pattern.title}](./content/published/${pattern.id}.mdx)`;
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

**Looking for machine-readable rules for AI IDEs and coding agents? See the [AI Coding Rules](#ai-coding-rules) section below.**
`;

	const useCaseOrder = getDynamicUseCaseOrder(groupedPatterns);

	const toc = `## Table of Contents\n\n${useCaseOrder.map(
		(useCase) => `- [${useCase}](#${useCase.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")})`,
	).join("\n")}`;

	const sections = useCaseOrder.map((useCase) =>
		generateUseCaseSection(useCase, groupedPatterns[useCase] || []),
	).join("\n---\n\n");

	const aiRulesSection = `## AI Coding Rules\n\nThis project provides a machine-readable set of coding rules for AI-powered IDEs and coding agents.\n\nYou can find the latest rules files in the [rules directory](./rules/). These files are designed for integration with tools like Cursor, GitHub Copilot, and other AI coding assistants.\n\n- **rules.md**: Human-readable rules summary\n- **rules.json**: Structured rules for programmatic consumption`;

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

	return [header, toc, "---", sections, aiRulesSection, footer].join("\n\n");
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