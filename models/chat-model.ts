import { z, ZodType } from 'zod';

export type Chat = Readonly<{
  context: ReadonlyArray<string>;
  message: string;
}>;

export const Chat = {
  schema: z.object({
    context: z.array(z.string()),
    message: z.string(),
  }),
} as const satisfies { schema: ZodType<Chat> };

export type PatchChat = Readonly<{
  message: string;
}>;

export const PatchChat = {
  schema: z.object({
    message: z.string(),
  }),
} as const satisfies { schema: ZodType<PatchChat> };
