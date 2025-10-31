import { Client } from "@notionhq/client";
import type { NotionConfig } from "./types.js";

/**
 * Creates a configured Notion client with database IDs
 */
export function createNotionClient(config?: Partial<NotionConfig>) {
  // Use environment variables as defaults
  const apiKey = config?.apiKey || process.env.NOTION_API_KEY;
  const blogPostsDatabaseId =
    config?.blogPostsDatabaseId || process.env.NOTION_DATABASE_ID_BLOG_POSTS;
  const seriesDatabaseId = config?.seriesDatabaseId || process.env.NOTION_DATABASE_ID_SERIES;
  const resourcesDatabaseId =
    config?.resourcesDatabaseId || process.env.NOTION_DATABASE_ID_RESOURCES;

  if (!apiKey) {
    throw new Error("Missing NOTION_API_KEY environment variable");
  }

  if (!blogPostsDatabaseId) {
    throw new Error("Missing NOTION_DATABASE_ID_BLOG_POSTS environment variable");
  }

  if (!seriesDatabaseId) {
    throw new Error("Missing NOTION_DATABASE_ID_SERIES environment variable");
  }

  const client = new Client({
    auth: apiKey,
  });

  return {
    client,
    blogPostsDatabaseId,
    seriesDatabaseId,
    resourcesDatabaseId,
  };
}

/**
 * Environment validation helper
 */
export function validateNotionEnvironment(): NotionConfig {
  const apiKey = process.env.NOTION_API_KEY;
  const blogPostsDatabaseId = process.env.NOTION_DATABASE_ID_BLOG_POSTS;
  const seriesDatabaseId = process.env.NOTION_DATABASE_ID_SERIES;
  const resourcesDatabaseId = process.env.NOTION_DATABASE_ID_RESOURCES;

  if (!apiKey) {
    throw new Error("Missing NOTION_API_KEY environment variable");
  }

  if (!blogPostsDatabaseId) {
    throw new Error("Missing NOTION_DATABASE_ID_BLOG_POSTS environment variable");
  }

  if (!seriesDatabaseId) {
    throw new Error("Missing NOTION_DATABASE_ID_SERIES environment variable");
  }

  const base: NotionConfig = {
    apiKey,
    blogPostsDatabaseId,
    seriesDatabaseId,
  };

  // With exactOptionalPropertyTypes, do not assign `undefined` to optional props.
  return resourcesDatabaseId ? { ...base, resourcesDatabaseId } : base;
}
