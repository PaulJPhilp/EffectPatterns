/**
 * TUI Service Types
 */

import { Effect } from "effect";

/**
 * Terminal context type for TUI operations
 */
export type Terminal = {
	/** Terminal width */
	width?: number;
	/** Terminal height */
	height?: number;
	/** Color support */
	colors?: boolean;
	/** Terminal type */
	type?: string;
};

/**
 * Table display options
 */
export interface TableOptions {
	/** Column definitions */
	columns: Array<{
		key: string;
		header: string;
		width?: number;
		align?: "left" | "center" | "right";
	}>;
	/** Whether to show borders */
	bordered?: boolean;
	/** Maximum table width */
	maxWidth?: number;
}

/**
 * Panel display options
 */
export interface PanelOptions {
	/** Panel border style */
	border?: boolean;
	/** Panel padding */
	padding?: number;
	/** Panel width */
	width?: number;
	/** Panel alignment */
	align?: "left" | "center" | "right";
}

/**
 * Table row data
 */
export interface TableRow {
	[key: string]: string | number | boolean | null | undefined;
}

/**
 * TUI module interface with proper Effect types
 */
export interface TUIModule {
	displaySuccess?: (message: string) => Effect.Effect<void, never, Terminal>;
	displayError?: (message: string) => Effect.Effect<void, never, Terminal>;
	displayInfo?: (message: string) => Effect.Effect<void, never, Terminal>;
	displayWarning?: (message: string) => Effect.Effect<void, never, Terminal>;
	displayPanel?: (content: string, title: string, options?: PanelOptions) => Effect.Effect<void, never, Terminal>;
	displayTable?: (data: TableRow[], options: TableOptions) => Effect.Effect<void, never, Terminal>;
	displayHighlight?: (message: string) => Effect.Effect<void, never, Terminal>;
	displaySeparator?: () => Effect.Effect<void, never, Terminal>;
}
