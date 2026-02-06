/**
 * Install Service API
 */

import { Effect, Schema } from "effect";

/**
 * Rule Schema
 */
export const RuleSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  skillLevel: Schema.optional(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  content: Schema.String,
});

export interface Rule extends Schema.Schema.Type<typeof RuleSchema> {}

/**
 * Installed Rule Schema
 */
export const InstalledRuleSchema = Schema.extend(
  RuleSchema,
  Schema.Struct({
    installedAt: Schema.String,
    tool: Schema.String,
    version: Schema.String,
  })
);

export interface InstalledRule extends Schema.Schema.Type<typeof InstalledRuleSchema> {}

/**
 * Install Service Interface
 */
export interface InstallService {
  readonly loadInstalledRules: () => Effect.Effect<InstalledRule[], Error>;
  readonly saveInstalledRules: (rules: InstalledRule[]) => Effect.Effect<void, Error>;
  readonly searchRules: (options: {
    query?: string;
    skillLevel?: string;
    useCase?: string;
    tool?: string;
  }) => Effect.Effect<Rule[], Error>;
  readonly fetchRule: (id: string) => Effect.Effect<Rule, Error>;
}
