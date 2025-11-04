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

// Search and Filtering Types

// Filter conditions for metadata filtering
export interface FilterClause {
  key: string;
  value: string | number | boolean;
  negate?: boolean;
}

export interface FilterConditions {
  AND?: FilterClause[];
  OR?: FilterClause[];
}

// Document Search (v3/search endpoint)
export interface DocumentSearchOptions {
  q: string;
  limit?: number;
  documentThreshold?: number;
  chunkThreshold?: number;
  rerank?: boolean;
  rewriteQuery?: boolean;
  includeFullDocs?: boolean;
  includeSummary?: boolean;
  onlyMatchingChunks?: boolean;
  containerTags?: string[];
  filters?: FilterConditions;
}

export interface DocumentChunk {
  documentId: string;
  title: string;
  type: string;
  score: number;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSearchResult {
  results: DocumentChunk[];
  timing: number;
  total: number;
}

// Memory Search (v4/search endpoint)
export interface MemorySearchOptions {
  q: string;
  limit?: number;
  containerTag?: string;
  threshold?: number;
  rerank?: boolean;
}

export interface RelatedMemory {
  memory: string;
  relation: 'extends' | 'derives';
  version: number;
  updatedAt: string;
}

export interface MemoryContext {
  parents?: RelatedMemory[];
  children?: RelatedMemory[];
}

export interface MemoryItem {
  id: string;
  memory: string;
  similarity: number;
  metadata?: Record<string, unknown>;
  updatedAt: string;
  version?: number;
  context?: MemoryContext;
  documents?: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: string;
  }>;
}

export interface MemorySearchResult {
  results: MemoryItem[];
  timing: number;
  total: number;
}

// Advanced search options combining both endpoints
export interface AdvancedSearchOptions {
  q: string;
  searchType: 'documents' | 'memories' | 'both';
  limit?: number;
  threshold?: number;
  documentThreshold?: number;
  chunkThreshold?: number;
  containerTag?: string;
  containerTags?: string[];
  rerank?: boolean;
  rewriteQuery?: boolean;
  filters?: FilterConditions;
}

export interface CombinedSearchResult {
  documents?: DocumentSearchResult;
  memories?: MemorySearchResult;
  timing: number;
}
