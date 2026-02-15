import { Schema } from "effect";

export const StoredHashSchema = Schema.Struct({
  salt: Schema.String,
  hash: Schema.String,
  iterations: Schema.Number,
  digest: Schema.Literal("sha256"),
});

export const AuthConfigSchema = Schema.Struct({
  version: Schema.Literal(1),
  username: Schema.String,
  passphrase: StoredHashSchema,
  serviceToken: Schema.optional(StoredHashSchema),
  createdAt: Schema.String,
});

export const AuthSessionSchema = Schema.Struct({
  username: Schema.String,
  createdAt: Schema.String,
  expiresAt: Schema.String,
});
