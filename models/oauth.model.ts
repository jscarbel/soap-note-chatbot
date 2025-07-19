import z from 'zod';
import { SchemaReturnType } from '../utils/zod';
import { Email } from './email.model';

/**
 * # Oauth 2.0
 *
 * Oauth records are how we keep track of what
 * service was used to log in with a user.
 */
export type Oauth = {
  id: number;
  /**
   * The company that provided
   * the login
   *
   * @example
   * ```typescript
   * "google" | "facebook"
   * ```
   * */
  provider: string;
  /**
   * The identifier that the third-party gave to
   * the user. This is typically a UUID, though
   * really they can use anything.
   */
  externalId: string;
  /**
   * The email that is associated with the Oauth.
   * This should be the same as what is on the user
   * model and can also be used to look up the user
   */
  email: Email;
  /**
   * This is the value given by the third-party
   * that can be used to re-issue a new valid
   * login with them
   */
  refreshToken?: string;
  createdAt: string;
  updatedAt: string;
};

export const Oauth = {
  schema: z.object({
    id: z.int(),
    provider: z.string(),
    externalId: z.string(),
    email: Email.schema,
    refreshToken: z.string().optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
  parse: (x: unknown): Oauth => Oauth.schema.parse(x),
} as const satisfies SchemaReturnType<Oauth>;
