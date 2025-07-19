import { z } from 'zod';
import { SchemaReturnType } from '../utils/zod';

export type Chat = Readonly<{
  context: ReadonlyArray<string>;
  message: string;
}>;

export const Chat = {
  schema: z.object({
    context: z.array(z.string()),
    message: z.string(),
  }),
  parse(x: unknown): Chat {
    return Chat.schema.parse(x);
  },
} as const satisfies SchemaReturnType<Chat>;

export type PatchChat = Readonly<{
  message: string;
}>;

export const PatchChat = {
  schema: z.object({
    message: z.string(),
  }),
  parse: (x: unknown): PatchChat => PatchChat.schema.parse(x),
} as const satisfies SchemaReturnType<PatchChat>;
