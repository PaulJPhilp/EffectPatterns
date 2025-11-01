import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  json,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AppUsage } from "../usage";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

/**
 * Semantic Search & Embeddings Tables
 * Stores conversation embeddings for vector similarity search
 */

export const conversationEmbedding = pgTable(
  "ConversationEmbedding",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    metadata: jsonb("metadata").$type<{
      tags: readonly string[];
      outcome: "solved" | "unsolved" | "partial" | "revisited";
      satisfactionScore?: number;
      contentSummary: string;
      messageCount: number;
      duration: number;
    }>(),
    contentHash: varchar("contentHash", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    userChatIdx: index("conversation_embedding_user_chat_idx").on(
      table.userId,
      table.chatId
    ),
    userCreatedIdx: index("conversation_embedding_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
    userRef: foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
    }),
  })
);

export type ConversationEmbedding = InferSelectModel<typeof conversationEmbedding>;

export const conversationTag = pgTable(
  "ConversationTag",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 100 }).notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    tagIdx: index("conversation_tag_tag_idx").on(table.tag),
    chatTagIdx: index("conversation_tag_chat_tag_idx").on(table.chatId, table.tag),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type ConversationTag = InferSelectModel<typeof conversationTag>;

export const searchCache = pgTable(
  "SearchCache",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    queryHash: varchar("queryHash", { length: 64 }).notNull(),
    queryText: text("queryText").notNull(),
    queryEmbedding: vector("queryEmbedding", { dimensions: 1536 }).notNull(),
    resultIds: json("resultIds").$type<readonly string[]>().notNull(),
    resultCount: serial("resultCount").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    expiresAt: timestamp("expiresAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    userQueryIdx: index("search_cache_user_query_idx").on(
      table.userId,
      table.queryHash
    ),
    expiresAtIdx: index("search_cache_expires_at_idx").on(table.expiresAt),
    userRef: foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
    }),
  })
);

export type SearchCache = InferSelectModel<typeof searchCache>;
