import { z } from 'zod';

export type Chat = Readonly<{
  context: ReadonlyArray<string>;
  message: string;
}>;

export const Chat = {
  SCHEMA: z
    .object({
      context: z.array(z.string()),
      message: z.string(),
    })
    .transform((x): Chat => x),
} as const;

export type PatchChat = Readonly<{
  message: string;
}>;

export const PatchChat = {
  SCHEMA: z.object({
    message: z.string(),
  }),
} as const;
