/**
 * Supermemory CLI Types and Interfaces
 */

export interface SupermemoryConfig {
  activeProject: string;
  apiKey: string;
  supermemoryUrl: string;
  lastUpload?: string;
  uploadedPatterns: string[];
}

export interface MemoryMetadata {
  type: string;
  patternId?: string;
  title?: string;
  skillLevel?: string;
  tags?: string;
  userId?: string;
  source?: string;
  [key: string]: unknown;
}

export interface Memory {
  id: string;
  title: string;
  summary: string;
  type: string;
  metadata: MemoryMetadata;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pattern {
  id: string;
  title: string;
  summary: string;
  skillLevel: string;
  tags: string[];
  useCase: string[];
  content: string;
}

export interface UploadResult {
  patternId: string;
  memoryId: string;
  status: 'success' | 'error';
  message?: string;
}

export interface OutputOptions {
  format: 'human' | 'json';
  verbose?: boolean;
}

export type ProcessingStatus = 'queued' | 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'done' | 'failed';

export interface ProcessingDocument {
  id: string;
  status: ProcessingStatus;
  created_at: string;
  updated_at: string;
  container_tags: string[];
  metadata: Record<string, unknown>;
}

export interface ProcessingQueue {
  documents: ProcessingDocument[];
  total: number;
}

// User Profile Types

export interface UserProfile {
  userId: string;
  static: string[];      // Long-term, stable facts about the user
  dynamic: string[];     // Recent context and temporary information
  retrievedAt: string;   // ISO timestamp of when profile was retrieved
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface UserProfileWithSearch {
  profile: UserProfile;
  searchResults?: SearchResult[];
  searchQuery?: string;
  searchTiming?: number;  // milliseconds
}

export interface ProfileComparison {
  user1: string;
  user2: string;
  commonStatic: string[];
  uniqueStatic1: string[];
  uniqueStatic2: string[];
  commonDynamic: string[];
  uniqueDynamic1: string[];
  uniqueDynamic2: string[];
}

export interface ProfileStats {
  container: string;
  totalUsers: number;
  avgStaticFacts: number;
  avgDynamicFacts: number;
  maxStaticFacts: number;
  maxDynamicFacts: number;
  commonTopics: Record<string, number>;
  retrievedAt: string;
}

// Search Types
export interface FilterClause {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface FilterConditions {
  clauses: FilterClause[];
  logic: 'AND' | 'OR';
}

export interface DocumentSearchOptions {
  q: string;
  limit?: number;
  threshold?: number;
  rerank?: boolean;
  container?: string;
  filter?: FilterConditions;
}

export interface DocumentSearchResult {
  results: SearchResult[];
  totalCount: number;
  timing?: number;
}

export interface MemorySearchOptions {
  q: string;
  limit?: number;
  threshold?: number;
  rerank?: boolean;
  container?: string;
  filter?: FilterConditions;
}

export interface MemorySearchResult {
  results: Memory[];
  totalCount: number;
  timing?: number;
}
