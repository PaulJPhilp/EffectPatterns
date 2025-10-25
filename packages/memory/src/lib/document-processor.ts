import Supermemory from 'supermemory'
import { Effect, Console } from 'effect'

const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY!
})

interface DocumentUpload {
  file: File | Buffer;
  filename?: string;
  collection: string
  metadata?: Record<string, any>
}

export class DocumentProcessor {
  uploadDocument({ file, filename, collection, metadata = {} }: DocumentUpload): Effect.Effect<any, Error> {
    return Effect.tryPromise({
      try: async () => {
        let result;
        if (file instanceof Buffer) {
          if (!filename) {
            throw new Error("filename is required when uploading a Buffer.");
          }
          result = await client.memories.uploadFile({
            file: file,
            filename: filename,
            containerTags: [collection],
            metadata: {
              originalName: filename,
              fileType: metadata.fileType || 'application/octet-stream',
              uploadedAt: new Date().toISOString(),
              ...metadata
            }
          });
        } else { // Assuming it's a File object from a browser environment
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          result = await client.memories.uploadFile({
            file: buffer,
            filename: file.name,
            containerTags: [collection],
            metadata: {
              originalName: file.name,
              fileType: file.type,
              uploadedAt: new Date().toISOString(),
              ...metadata
            }
          });
        }
        return result
      },
      catch: (error: any) => {
        return new Error(`Document upload failed: ${error.message || error}`);
      }
    }).pipe(
      Effect.tapError((error) => Console.error('Document upload error:', error))
    )
  }

  uploadURL({ url, collection, metadata = {} }: { url: string, collection: string, metadata?: Record<string, any> }): Effect.Effect<any, Error> {
    return Effect.tryPromise({
      try: async () => {
        const result = await client.memories.add({
          content: url,
          containerTag: collection,
          metadata: {
            type: 'url',
            originalUrl: url,
            uploadedAt: new Date().toISOString(),
            ...metadata
          }
        })
        return result
      },
      catch: (error: any) => {
        return new Error(`URL upload failed: ${error.message || error}`);
      }
    }).pipe(
      Effect.tapError((error) => Console.error('URL upload error:', error))
    )
  }

  getDocumentStatus(documentId: string): Effect.Effect<any, Error> {
    return Effect.tryPromise({
      try: async () => {
        const memory = await client.memories.get(documentId)
        return {
          id: memory.id,
          status: memory.status,
          title: memory.title,
          progress: memory.metadata?.progress || 0
        }
      },
      catch: (error: any) => {
        return new Error(`Failed to get document status: ${error.message || error}`);
      }
    }).pipe(
      Effect.tapError((error) => Console.error('Status check error:', error))
    )
  }

  listDocuments(collection: string): Effect.Effect<any, Error> {
    return Effect.tryPromise({
      try: async () => {
        const memories = await client.memories.list({
          containerTags: [collection],
          limit: 50,
          sort: 'updatedAt',
          order: 'desc'
        })

        return memories.memories.map(memory => ({
          id: memory.id,
          title: memory.title || memory.metadata?.originalName || 'Untitled',
          type: memory.metadata?.fileType || memory.metadata?.type || 'unknown',
          uploadedAt: memory.metadata?.uploadedAt,
          status: memory.status,
          url: memory.metadata?.originalUrl
        }))
      },
      catch: (error: any) => {
        return new Error(`Failed to list documents: ${error.message || error}`);
      }
    }).pipe(
      Effect.tapError((error) => Console.error('List documents error:', error))
    )
  }
}