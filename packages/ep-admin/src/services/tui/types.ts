/**
 * TUI Service Types
 */

import { Effect } from "effect";

/**
 * Terminal context type for TUI operations
 */
export type Terminal = any;

/**
 * TUI module interface with proper Effect types
 */
export interface TUIModule {
	displaySuccess?: (message: string) => Effect.Effect<void, never, Terminal>;
	displayError?: (message: string) => Effect.Effect<void, never, Terminal>;
	displayInfo?: (message: string) => Effect.Effect<void, never, Terminal>;
	displayWarning?: (message: string) => Effect.Effect<void, never, Terminal>;
	displayPanel?: (content: string, title: string, options?: any) => Effect.Effect<void, never, Terminal>;
	displayTable?: (data: any[], options: any) => Effect.Effect<void, never, Terminal>;
	displayHighlight?: (message: string) => Effect.Effect<void, never, Terminal>;
	displaySeparator?: () => Effect.Effect<void, never, Terminal>;
}
