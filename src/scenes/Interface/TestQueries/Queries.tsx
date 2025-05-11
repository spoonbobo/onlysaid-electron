/* Write all queries here in lowercase */
import { v4 as uuidv4 } from 'uuid';


export const databaseQueries = [
  {
    id: 'clean-messages',
    title: 'debug.clean-messages',
    description: 'Delete all messages from a specific chat',
    getQuery: (chat_id: string) => ({
      query: `delete from messages where chat_id = @chat_id`,
      params: {
        chat_id
      }
    })
  },

  {
    id: 'bot-message',
    title: 'debug.bot-message',
    description: 'Insert a message as if sent by a bot',
    getQuery: (chat_id: string, content: string) => ({
      query: `insert into messages (id, chat_id, sender, text, created_at)
              values (@id, @chat_id, @sender, @text, @created_at)`,
      params: {
        id: uuidv4(),
        chat_id,
        sender: "d8585d79-795d-4956-8061-ee082e202d98",
        text: content,
        created_at: new Date().toISOString()
      }
    })
  },

  {
    id: 'sample-markdown',
    title: 'debug.sample-markdown',
    description: 'Insert a message with sample markdown formatting',
    getQuery: (chat_id: string) => ({
      query: `insert into messages (id, chat_id, sender, text, created_at)
              values (@id, @chat_id, @sender, @text, @created_at)`,
      params: {
        id: uuidv4(),
        chat_id,
        sender: "d8585d79-795d-4956-8061-ee082e202d98",
        text: "# Markdown Sample\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2\n\n1. Numbered item 1\n2. Numbered item 2\n\n```\ncode block\n```\n\n> Blockquote\n\n[Link](https://example.com)\n\n![Image](https://example.com/image.jpg)\n\n| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Row 1    | Data     | Data     |\n| Row 2    | Data     | Data     |",
        created_at: new Date().toISOString()
      }
    })
  }
];