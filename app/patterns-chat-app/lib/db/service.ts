
import { Effect, Layer } from "effect";
import * as Queries from "./queries";

export class DbService extends Effect.Service<DbService>()(
  "DbService",
  {
    succeed: {
      getChatById: Queries.getChatById,
      getMessageCountByUserId: Queries.getMessageCountByUserId,
      saveChat: Queries.saveChat,
      getMessagesByChatId: Queries.getMessagesByChatId,
      saveMessages: Queries.saveMessages,
      createStreamId: Queries.createStreamId,
      updateChatLastContextById: Queries.updateChatLastContextById,
    },
  }
) {}

export const LiveDbService = Layer.succeed(DbService, DbService.of({
  _tag: "DbService",
  getChatById: Queries.getChatById,
  getMessageCountByUserId: Queries.getMessageCountByUserId,
  saveChat: Queries.saveChat,
  getMessagesByChatId: Queries.getMessagesByChatId,
  saveMessages: Queries.saveMessages,
  createStreamId: Queries.createStreamId,
  updateChatLastContextById: Queries.updateChatLastContextById,
}) as any);
