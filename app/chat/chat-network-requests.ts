import { Chat } from '../../models/chat.model';

export const getChat = async (): Promise<Chat> => {
  const response = await fetch('/api/chats', {
    method: 'GET',
  });

  const text: unknown = await response.json();
  return Chat.parse(text);
};

export const postChat = async (body: unknown) => {
  const response = await fetch('/api/chats', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      contentType: 'application/json',
    },
  });

  const text = await response.text();
  return text;
};
