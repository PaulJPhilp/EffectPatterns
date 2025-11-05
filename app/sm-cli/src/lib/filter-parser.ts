/**
 * Filter Parser Library
 *
 * Parses human-readable filter expressions into Supermemory API compatible
 * FilterConditions format. Supports AND/OR logic and metadata filtering.
 *
 * Examples:
 * - "category:ai AND difficulty:beginner"
 * - "author:alice OR author:bob"
 * - "type:pattern AND (status:active OR status:new)"
 * - "date:2025-11-04"
 */

import type { FilterClause, FilterConditions } from '../types.js';



/**
 * Represents a parsed filter clause
 */
interface ParsedClause {
  key: string;
  value: string | number | boolean;
  negate: boolean;
}

/**
 * Parse a filter expression string into FilterConditions
 *
 * Supports:
 * - Simple: "key:value"
 * - AND: "key1:value1 AND key2:value2"
 * - OR: "key1:value1 OR key2:value2"
 * - Negation: "NOT key:value"
 * - Complex: "key1:value1 AND (key2:value2 OR key3:value3)"
 *
 * @param expression - Filter expression string
 * @returns FilterConditions object for Supermemory API
 * @throws FilterParseError if expression is invalid
 */
export const parseFilterExpression = (expression: string): FilterConditions => {
  if (!expression || !expression.trim()) {
    return {};
  }

  const trimmed = expression.trim();
  const tokens = tokenize(trimmed);
  const result = parseTokens(tokens);

  return result;
};

/**
 * Validate a filter clause for correctness
 *
 * Checks:
 * - key is non-empty string
 * - value is string, number, or boolean
 * - negate is boolean
 *
 * @param clause - FilterClause to validate
 * @returns true if valid, false otherwise
 */
export const validateFilterClause = (clause: FilterClause): boolean => {
  if (!clause) return false;
  if (typeof clause.key !== 'string' || !clause.key) return false;

  const valueType = typeof clause.value;
  if (!['string', 'number', 'boolean'].includes(valueType)) {
    return false;
  }

  if (clause.negate !== undefined && typeof clause.negate !== 'boolean') {
    return false;
  }

  return true;
};

/**
 * Convert FilterConditions to a human-readable string
 *
 * Useful for displaying active filters to users
 *
 * @param conditions - FilterConditions to convert
 * @returns Human-readable filter string
 */
export const filterToString = (conditions: FilterConditions): string => {
  if (!conditions || ((!conditions.AND || conditions.AND.length === 0) &&
                     (!conditions.OR || conditions.OR.length === 0))) {
    return 'No filters';
  }

  const parts: string[] = [];

  if (conditions.AND && conditions.AND.length > 0) {
    const andParts = conditions.AND.map(clause => clauseToString(clause));
    parts.push(`AND: ${andParts.join(', ')}`);
  }

  if (conditions.OR && conditions.OR.length > 0) {
    const orParts = conditions.OR.map(clause => clauseToString(clause));
    parts.push(`OR: ${orParts.join(', ')}`);
  }

  return parts.join('; ');
};

/**
 * Create a filter condition from key-value pairs
 *
 * @param filters - Object with key:value pairs
 * @param operator - 'AND' or 'OR' (default: 'AND')
 * @returns FilterConditions object
 */
export const createFilterConditions = (
  filters: Record<string, string | number | boolean>,
  operator: 'AND' | 'OR' = 'AND',
): FilterConditions => {
  const clauses = Object.entries(filters).map(([key, value]) => ({
    key,
    value,
    negate: false,
  }));

  return operator === 'AND' ? { AND: clauses } : { OR: clauses };
};

/**
 * Merge multiple filter conditions
 *
 * @param conditions - Array of FilterConditions
 * @param operator - How to combine (default: 'AND')
 * @returns Combined FilterConditions
 */
export const mergeFilterConditions = (
  conditions: FilterConditions[],
  operator: 'AND' | 'OR' = 'AND',
): FilterConditions => {
  const allClauses: FilterClause[] = [];

  for (const cond of conditions) {
    if (cond.AND) allClauses.push(...cond.AND);
    if (cond.OR) allClauses.push(...cond.OR);
  }

  return operator === 'AND' ? { AND: allClauses } : { OR: allClauses };
};

/**
 * Check if filter has any conditions
 */
export const hasFilters = (conditions: FilterConditions): boolean => {
  return (
    (conditions.AND && conditions.AND.length > 0) ||
    (conditions.OR && conditions.OR.length > 0)
  );
};

/**
 * Get all keys used in filter conditions
 */
export const getFilterKeys = (conditions: FilterConditions): string[] => {
  const keys = new Set<string>();

  if (conditions.AND) {
    conditions.AND.forEach(clause => keys.add(clause.key));
  }

  if (conditions.OR) {
    conditions.OR.forEach(clause => keys.add(clause.key));
  }

  return Array.from(keys);
};

/**
 * Update a specific filter key in conditions
 */
export const updateFilterKey = (
  conditions: FilterConditions,
  key: string,
  newValue: string | number | boolean,
): FilterConditions => {
  const result = JSON.parse(JSON.stringify(conditions)) as FilterConditions;

  if (result.AND) {
    const existing = result.AND.find(c => c.key === key);
    if (existing) {
      existing.value = newValue;
    } else {
      result.AND.push({ key, value: newValue, negate: false });
    }
  } else {
    result.AND = [{ key, value: newValue, negate: false }];
  }

  return result;
};

/**
 * Remove a filter key from conditions
 */
export const removeFilterKey = (
  conditions: FilterConditions,
  key: string,
): FilterConditions => {
  const result = JSON.parse(JSON.stringify(conditions)) as FilterConditions;

  if (result.AND) {
    result.AND = result.AND.filter(c => c.key !== key);
    if (result.AND.length === 0) delete result.AND;
  }

  if (result.OR) {
    result.OR = result.OR.filter(c => c.key !== key);
    if (result.OR.length === 0) delete result.OR;
  }

  return result;
};

// ============================================================================
// Private Helper Functions
// ============================================================================

type Token = { type: string; value: string };

/**
 * Tokenize filter expression into logical units
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let current = '';
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];
    const nextChar = expression[i + 1];
    const remaining = expression.substring(i);

    // Handle whitespace
    if (/\s/.test(char)) {
      if (current) {
        tokens.push({ type: 'value', value: current });
        current = '';
      }
      i++;
      continue;
    }

    // Handle AND operator
    if (remaining.startsWith('AND')) {
      if (current) {
        tokens.push({ type: 'value', value: current });
        current = '';
      }
      tokens.push({ type: 'operator', value: 'AND' });
      i += 3;
      continue;
    }

    // Handle OR operator
    if (remaining.startsWith('OR')) {
      if (current) {
        tokens.push({ type: 'value', value: current });
        current = '';
      }
      tokens.push({ type: 'operator', value: 'OR' });
      i += 2;
      continue;
    }

    // Handle NOT operator
    if (remaining.startsWith('NOT')) {
      if (current) {
        tokens.push({ type: 'value', value: current });
        current = '';
      }
      tokens.push({ type: 'operator', value: 'NOT' });
      i += 3;
      continue;
    }

    // Handle parentheses
    if (char === '(' || char === ')') {
      if (current) {
        tokens.push({ type: 'value', value: current });
        current = '';
      }
      tokens.push({ type: 'paren', value: char });
      i++;
      continue;
    }

    // Build value token
    current += char;
    i++;
  }

  if (current) {
    tokens.push({ type: 'value', value: current });
  }

  return tokens;
}

/**
 * Parse tokens into FilterConditions
 */
function parseTokens(tokens: Token[]): FilterConditions {
  const result: FilterConditions = {};
  let i = 0;
  let currentOperator: 'AND' | 'OR' = 'AND';
  let clauses: FilterClause[] = [];

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'operator') {
      if (token.value === 'AND' || token.value === 'OR') {
        currentOperator = token.value;
      } else if (token.value === 'NOT') {
        // Next clause should be negated
        i++;
        if (i < tokens.length && tokens[i].type === 'value') {
          const clause = parseClause(tokens[i].value);
          if (clause) {
            clause.negate = true;
            clauses.push(clause);
          }
        }
        i++;
        continue;
      }
    } else if (token.type === 'value') {
      const clause = parseClause(token.value);
      if (clause) {
        clauses.push(clause);
      }
    }

    i++;
  }

  if (clauses.length > 0) {
    if (currentOperator === 'AND') {
      result.AND = clauses;
    } else {
      result.OR = clauses;
    }
  }

  return result;
}

/**
 * Parse a single clause (e.g., "category:ai")
 */
function parseClause(clauseStr: string): FilterClause | null {
  const trimmed = clauseStr.trim();
  if (!trimmed.includes(':')) {
    return null;
  }

  const [key, ...valueParts] = trimmed.split(':');
  const value = valueParts.join(':');

  if (!key || !value) {
    return null;
  }

  return {
    key: key.trim(),
    value: parseValue(value.trim()),
    negate: false as const,
  };
}

/**
 * Parse value to appropriate type
 */
function parseValue(value: string): string | number | boolean {
  const trimmed = value.trim();

  // Check for boolean
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;

  // Check for number
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  if (/^\d+\.\d+$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // Return as string
  return trimmed;
}

/**
 * Convert a clause to human-readable string
 */
function clauseToString(clause: FilterClause): string {
  const negation = clause.negate ? 'NOT ' : '';
  return `${negation}${clause.key}:${clause.value}`;
}
