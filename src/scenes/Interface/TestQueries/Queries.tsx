/* Write all queries here in lowercase */
import { v4 as uuidv4 } from 'uuid';


export const databaseQueries = [
  {
    id: 'clean-messages',
    title: 'debug.clean-messages',
    description: 'Delete all messages from a specific room/topic',
    getQuery: (roomId: string) => ({
      query: `delete from messages where room_id = @roomId`,
      params: {
        roomId
      }
    })
  },

  {
    id: 'bot-message',
    title: 'debug.bot-message',
    description: 'Insert a message as if sent by a bot',
    getQuery: (roomId: string, content: string) => ({
      query: `insert into messages (id, room_id, sender, text, created_at)
              values (@id, @roomId, @sender, @text, @createdAt)`,
      params: {
        id: uuidv4(),
        roomId,
        sender: "d8585d79-795d-4956-8061-ee082e202d98",
        text: content,
        createdAt: new Date().toISOString()
      }
    })
  }
];
