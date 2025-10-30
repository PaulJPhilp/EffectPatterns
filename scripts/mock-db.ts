import { Context, Effect, Layer } from "effect";
import * as Queries from "./queries"; // This will be the real queries, but we will mock them
import { DbService } from "../app/code-assistant/lib/db/service"; // Import the DbService interface

export const getChatById = async ({ id }: { id: string }) => {
    console.log(`MOCK DB: getChatById called with id: ${id}`);
    return null; // For now, assume no existing chat
};

export const getMessageCountByUserId = async ({ id, differenceInHours }: { id: string, differenceInHours: number }) => {
    console.log(`MOCK DB: getMessageCountByUserId called with id: ${id}, hours: ${differenceInHours}`);
    return 0; // For now, assume no messages
};

export const saveChat = async (chat: any) => {
    console.log("MOCK DB: saveChat called with:", chat);
    return chat; // Return the saved chat
};

export const getMessagesByChatId = async ({ id }: { id: string }) => {
    console.log(`MOCK DB: getMessagesByChatId called with id: ${id}`);
    return []; // For now, assume no existing messages
};

export const saveMessages = async ({ messages }: { messages: any[] }) => {
    console.log("MOCK DB: saveMessages called with:", messages);
    return messages; // Return the saved messages
};

export const createStreamId = async ({ streamId, chatId }: { streamId: string, chatId: string }) => {
    console.log(`MOCK DB: createStreamId called with streamId: ${streamId}, chatId: ${chatId}`);
    return { streamId, chatId };
};

export const updateChatLastContextById = async ({ chatId, context }: { chatId: string, context: any }) => {
    console.log(`MOCK DB: updateChatLastContextById called with chatId: ${chatId}, context:`, context);
    return { chatId, context };
};

// Create a Layer for the MockDbService
export const MockDbServiceLive = Layer.succeed(DbService, {
  getChatById,
  getMessageCountByUserId,
  saveChat,
  getMessagesByChatId,
  saveMessages,
  createStreamId,
  updateChatLastContextById,
});