import { NextRequest } from 'next/server';
import { PatchChat } from '../../../../models/chat.model';
import { ensureErrorObject } from '../../../../utils/ensureErrorObject';
import { IdParamProps } from '../../../../utils/requests';

export async function GET(_req: NextRequest, { params }: IdParamProps) {
  try {
    const id = await IdParamProps.parseNumberId(params);
    console.info(`Getting item with id: ${id}`);

    return new Response(
      JSON.stringify({
        user: 123,
        context: [
          'good things happened in the session',
          'patient thought she was in California',
        ],
        tokensUsed: 27446,
      }),
    );
  } catch (e: unknown) {
    const error = ensureErrorObject(e);
    console.error(error.message);

    return new Response('Something went wrong when fetching the chat', {
      status: 500,
    });
  }
}

export async function PATCH(req: NextRequest, { params }: IdParamProps) {
  try {
    const rawPayload: unknown = await req.json();
    const chatUpdates = PatchChat.parse(rawPayload);
    const id = await IdParamProps.parseNumberId(params);
    console.info(`Updating chat ${id} with argument ${chatUpdates}`);

    return new Response(
      JSON.stringify({
        user: 123,
        context: [
          'good things happened in the session',
          'patient thought she was in California',
        ],
        tokensUsed: 27446,
      }),
    );
  } catch (e: unknown) {
    const error = ensureErrorObject(e);
    console.error(error.message);

    return new Response('Something went wrong when fetching the chat', {
      status: 500,
    });
  }
}
