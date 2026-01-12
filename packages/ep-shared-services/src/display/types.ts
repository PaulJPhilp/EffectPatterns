/**
 * Display service types
 */

/**
 * Panel display options
 */
export interface PanelOptions {
	readonly type?: "info" | "success" | "error" | "warning";
}

/**
 * Table column definition
 */
export interface TableColumn<T> {
	readonly key: keyof T;
	readonly header: string;
	readonly width?: number;
	readonly align?: "left" | "center" | "right";
	readonly formatter?: (value: unknown) => string;
}

/**
 * Table display options
 */
export interface TableOptions<T> {
	readonly columns: TableColumn<T>[];
	readonly bordered?: boolean;
	readonly head?: { readonly bold?: boolean; readonly color?: string };
}
