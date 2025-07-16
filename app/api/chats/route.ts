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

export async function GET(_req: NextRequest) {
  // TODO: get the user from the req headers.
  // the user can be determined from the "Authroization" property
  // by extracting the data encoded in a JWT
  // Though, you'll need to first set up a login process to encode
  // the data in a jwt and give it to the user for their cookies
  // JWTs ideally expire after not too long, so it is a good user exprience
  // to allow the users to renew thier JWT automatically so they don't need to login again
  const chatService = new ChatService();

  const chats: Chat = await chatService.getChats();

  return new Response(JSON.stringify(chats), {
    headers: { contentType: 'application/json' },
  });
}
