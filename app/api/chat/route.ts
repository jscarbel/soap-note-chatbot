import { NextRequest } from 'next/server';
import { Chat } from '../../../models/chat-model';
import { ChatService } from '../../../services/ChatService';

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  console.info('Recieved post at /api/chat');
  console.info(body);

  return new Response(JSON.stringify(body), {
    status: 201,
    headers: {
      contentType: 'application/json',
    },
  });
}

export async function GET(req: NextRequest) {
  const chatService = new ChatService();

  const chats: Chat = await chatService.getChats();

  return new Response(JSON.stringify(chats), {
    headers: { contentType: 'application/json' },
  });
}
