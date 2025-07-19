import z from 'zod';
import { SchemaReturnType } from '../utils/zod';

/**
 * A branded string guaranteed to be a
 * valid email
 */
export type Email = `${string}@${string}.${string}` & {
  readonly __brand: 'Email';
};
export const Email = {
  schema: z.email().transform((x): Email => x as Email),
  parse: (x: unknown): Email => Email.schema.parse(x),
} as const satisfies SchemaReturnType<Email>;
