/**
 * Utility to merge classnames (Tailwind-compatible)
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter((c) => typeof c === "string" && c.length > 0).join(" ");
}

export default cn;
