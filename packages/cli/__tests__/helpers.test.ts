import { describe, expect, it } from 'vitest';

import {
	LINT_RULES,
	categorizeCommits,
	generateChangelog,
	toKebabCase,
} from '../src/index';

describe('toKebabCase', () => {
	it('converts simple titles to kebab-case', () => {
		expect(toKebabCase('Hello World')).toBe('hello-world');
	});

	it('collapses multiple separators into a single dash', () => {
		expect(toKebabCase('Hello   World---Test')).toBe(
			'hello-world-test',
		);
	});

	it('trims leading and trailing non-alphanumeric characters', () => {
		expect(toKebabCase('---Hello World!!!')).toBe('hello-world');
	});

	it('handles mixed case and numbers', () => {
		expect(toKebabCase('Release 1.2.3')).toBe('release-1-2-3');
	});
});

describe('release helpers', () => {
	it('categorizes conventional commits into appropriate buckets', async () => {
		const commits = [
			'feat: add new user onboarding flow',
			'fix: correct null pointer in pipeline',
			'docs: update README for installation',
			'chore: bump dependencies',
			'feat!: remove deprecated API',
			'refactor: cleanup internal types',
		];

		const categories = await categorizeCommits(commits);

		expect(categories.features).toContain(
			'add new user onboarding flow',
		);
		expect(categories.fixes).toContain(
			'correct null pointer in pipeline',
		);
		expect(categories.docs).toContain(
			'update README for installation',
		);
		expect(categories.chore).toContain(
			'bump dependencies',
		);
		expect(categories.other).toContain(
			'cleanup internal types',
		);
	});

	it('generates a changelog with sections for non-empty categories', async () => {
		const commits = [
			'feat: add search',
			'fix: handle edge case',
			'docs: add API docs',
		];

		const categories = await categorizeCommits(commits);
		const changelog = generateChangelog(
			categories,
			'0.1.0',
			'0.2.0',
		);

		expect(changelog).toContain('# Release 0.2.0');
		expect(changelog).toContain('**Previous version:** 0.1.0');
		expect(changelog).toContain('## ✨ Features');
		expect(changelog).toContain('## 🐛 Bug Fixes');
		expect(changelog).toContain('## 📚 Documentation');
	});
});

describe('LINT_RULES registry', () => {
	it('contains the expected lint rule names', () => {
		const ruleNames = LINT_RULES.map((rule) => rule.name);

		expect(ruleNames).toContain('effect-use-taperror');
		expect(ruleNames).toContain('effect-explicit-concurrency');
		expect(ruleNames).toContain('effect-deprecated-api');
		expect(ruleNames).toContain('effect-prefer-pipe');
		expect(ruleNames).toContain('effect-stream-memory');
		expect(ruleNames).toContain('effect-error-model');
	});

	it('has valid default severities for all rules', () => {
		for (const rule of LINT_RULES) {
			expect(['error', 'warning', 'info', 'off']).toContain(
				rule.defaultSeverity,
			);
		}
	});
});
