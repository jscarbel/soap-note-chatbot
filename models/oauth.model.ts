import z from 'zod';
import { SchemaReturnType } from '../utils/zod';
import { Email } from './email.model';
import { UserId } from './user.model';

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
   * The id of the user this corresponds to in the
   * database. This is how we can connect the oauth
   * to an individual
   */
  userId: UserId;
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
};

export const Oauth = {
  schema: z.object({
    id: z.int(),
    provider: z.string(),
    externalId: z.string(),
    userId: UserId.schema,
    email: Email.schema,
    refreshToken: z.string().optional(),
  }),
  parse: (x: unknown): Oauth => Oauth.schema.parse(x),
} as const satisfies SchemaReturnType<Oauth>;
