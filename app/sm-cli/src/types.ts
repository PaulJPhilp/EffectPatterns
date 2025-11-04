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
