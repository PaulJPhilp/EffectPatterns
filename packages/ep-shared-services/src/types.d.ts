/**
 * Type declarations for optional dependencies
 */

declare module "effect-cli-tui" {
	export const displaySuccess: (message: string) => Promise<void>;
	export const displayError: (message: string) => Promise<void>;
	export const displayInfo: (message: string) => Promise<void>;
	export const displayWarning: (message: string) => Promise<void>;
	export const displayPanel: (
		content: string,
		title: string,
		options?: { type?: "info" | "success" | "error" | "warning" }
	) => Promise<void>;
	export const displayTable: <T extends Record<string, unknown>>(
		data: T[],
		options: {
			columns: Array<{
				key: string;
				header: string;
				width?: number;
				align?: string;
				formatter?: (value: unknown) => string;
			}>;
			bordered?: boolean;
			head?: { bold?: boolean; color?: string };
		}
	) => Promise<void>;
	export const displayHighlight: (message: string) => Promise<void>;
}
