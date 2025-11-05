-- Create pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create ConversationEmbedding table
CREATE TABLE "ConversationEmbedding" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"metadata" jsonb,
	"contentHash" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for ConversationEmbedding
CREATE INDEX "conversation_embedding_user_chat_idx" ON "ConversationEmbedding" ("userId","chatId");
CREATE INDEX "conversation_embedding_user_created_idx" ON "ConversationEmbedding" ("userId","createdAt");
CREATE INDEX "conversation_embedding_vector_idx" ON "ConversationEmbedding" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- Create foreign keys for ConversationEmbedding
ALTER TABLE "ConversationEmbedding" ADD CONSTRAINT "ConversationEmbedding_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE cascade;
ALTER TABLE "ConversationEmbedding" ADD CONSTRAINT "ConversationEmbedding_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE cascade;

-- Create ConversationTag table
CREATE TABLE "ConversationTag" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"chatId" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for ConversationTag
CREATE INDEX "conversation_tag_tag_idx" ON "ConversationTag" ("tag");
CREATE INDEX "conversation_tag_chat_tag_idx" ON "ConversationTag" ("chatId","tag");

-- Create foreign key for ConversationTag
ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE cascade;

-- Create SearchCache table
CREATE TABLE "SearchCache" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"userId" uuid NOT NULL,
	"queryHash" varchar(64) NOT NULL,
	"queryText" text NOT NULL,
	"queryEmbedding" vector(1536) NOT NULL,
	"resultIds" json NOT NULL,
	"resultCount" serial NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL
);

-- Create indexes for SearchCache
CREATE INDEX "search_cache_user_query_idx" ON "SearchCache" ("userId","queryHash");
CREATE INDEX "search_cache_expires_at_idx" ON "SearchCache" ("expiresAt");

-- Create foreign key for SearchCache
ALTER TABLE "SearchCache" ADD CONSTRAINT "SearchCache_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE cascade;
