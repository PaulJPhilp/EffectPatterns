import { Command } from 'commander';
import { Console, Effect, pipe } from 'effect';
import { DocumentProcessor } from './lib/document-processor';
import * as fs from 'fs';
import * as path from 'path';

// For the 'ask' command
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';

const documentProcessor = new DocumentProcessor();
const program = new Command();

program
  .name('memory-cli')
  .description('CLI for interacting with Supermemory to manage documents and ask AI questions.')
  .version('0.1.0');

// --- Upload File Command ---
program.command('upload-file')
  .description('Upload a file to Supermemory.')
  .requiredOption('-p, --filePath <path>', 'Path to the file to upload.')
  .requiredOption('-c, --collection <name>', 'Name of the collection.')
  .option('-m, --metadata <json>', 'Optional metadata as a JSON string.', '{}')
  .action((options) => Effect.runPromise(
    pipe(
      Effect.sync(() => path.resolve(options.filePath)),
      Effect.flatMap((absolutePath) =>
        Effect.sync(() => {
          if (!fs.existsSync(absolutePath)) {
            throw new Error(`File not found at ${absolutePath}`);
          }
          return absolutePath;
        })
      ),
      Effect.flatMap((absolutePath) =>
        Effect.sync(() => ({
          fileBuffer: fs.readFileSync(absolutePath),
          filename: path.basename(absolutePath),
          parsedMetadata: JSON.parse(options.metadata)
        }))
      ),
      Effect.flatMap(({ fileBuffer, filename, parsedMetadata }) =>
        Console.log(`Uploading file '${filename}' to collection '${options.collection}'...`).pipe(
          Effect.flatMap(() =>
            documentProcessor.uploadDocument({
              file: fileBuffer,
              filename: filename,
              collection: options.collection,
              metadata: parsedMetadata
            })
          )
        )
      ),
      Effect.flatMap((result) => Console.log("File uploaded successfully:", result)),
      Effect.catchAll((error) => Console.error("Error uploading file:", error))
    )
  ));

// --- Upload URL Command ---
program.command('upload-url')
  .description('Upload a URL to Supermemory.')
  .requiredOption('-u, --url <url>', 'The URL to upload.')
  .requiredOption('-c, --collection <name>', 'Name of the collection.')
  .option('-m, --metadata <json>', 'Optional metadata as a JSON string.', '{}')
  .action((options) => Effect.runPromise(
    pipe(
      Console.log(`Uploading URL '${options.url}' to collection '${options.collection}'...`).pipe(
        Effect.flatMap(() =>
          documentProcessor.uploadURL({
            url: options.url,
            collection: options.collection,
            metadata: JSON.parse(options.metadata)
          })
        )
      ),
      Effect.flatMap((result) => Console.log("URL uploaded successfully:", result)),
      Effect.catchAll((error) => Console.error("Error uploading URL:", error))
    )
  ));

// --- List Documents Command ---
program.command('list-documents')
  .description('List documents in a collection.')
  .requiredOption('-c, --collection <name>', 'Name of the collection.')
  .action((options) => Effect.runPromise(
    pipe(
      Console.log(`Listing documents in collection '${options.collection}'...`).pipe(
        Effect.flatMap(() => documentProcessor.listDocuments(options.collection))
      ),
      Effect.flatMap((documents) => {
        if (documents.length === 0) {
          return Console.log("No documents found in this collection.");
        } else {
          return Effect.forEach(documents, (doc) =>
            Console.log(`- ID: ${doc.id}, Title: ${doc.title}, Type: ${doc.type}, Status: ${doc.status}`)
          );
        }
      }),
      Effect.catchAll((error) => Console.error("Error listing documents:", error))
    )
  ));

// --- Ask AI Command ---
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

program.command('ask')
  .description('Asks the AI a question, using a specified Supermemory collection for context.')
  .requiredOption('-q, --question <text>', 'The question to ask the AI.')
  .requiredOption('-c, --collection <name>', 'The Supermemory collection to use.')
  .action((options) => Effect.runPromise(
    pipe(
      Console.log(`Asking AI about collection '${options.collection}': "${options.question}"...`),
      Effect.flatMap(() =>
        Effect.promise(() =>
          generateText({
            model: openai('gpt-5'),
            messages: [
              { role: 'user', content: options.question }
            ],
            tools: {
              ...supermemoryTools(process.env.SUPERMEMORY_API_KEY!,
                { containerTags: [options.collection] }
              ),
            }
          })
        )
      ),
      Effect.flatMap((result) =>
        Console.log("\nAI Response:", result.text).pipe(
          Effect.flatMap(() => {
            if (result.toolCalls && result.toolCalls.length > 0) {
              return Console.log("\nAI Tool Calls (Supermemory Interaction):").pipe(
                Effect.flatMap(() =>
                  Effect.forEach(result.toolCalls, (toolCall) =>
                    Console.log(`- Tool: ${toolCall.toolName}, Args: ${JSON.stringify(toolCall.args)}`)
                  )
                )
              );
            }
            return Effect.void;
          })
        )
      ),
      Effect.catchAll((error) => Console.error("Error during AI request:", error))
    )
  ));

program.parse(process.argv);