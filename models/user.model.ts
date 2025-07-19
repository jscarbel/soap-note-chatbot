import { v4 } from 'uuid';
import z from 'zod';
import { SchemaReturnType } from '../utils/zod';
import { Email } from './email.model';

/**
 * A branded string for identifying a string as
 * specifically being a UserId
 */
export type UserId = string & { readonly __brand: 'UserId' };
export const UserId = {
  schema: z.uuid().transform((x): UserId => x as UserId),
  parse: (x: unknown): UserId => UserId.schema.parse(x),
  /**
   * # make utility
   * ---
   * This takes in a string and just asserts that
   * the string is a UserId.
   *
   * This can be dangerous to use outside of tests, since
   * it is in effect saying that any string can be a UserId
   *
   * @example
   * Take this example for instance:
   * ```typescript
   * const testId = UserId.make('fake-user-id')
   * ```
   * In this case, testId is now recognized by the type
   * checker as being a valid UserId, though it would fail
   * the parser and it would not actually correspond to
   * any database record.
   */
  make: (x: string): UserId => x as UserId,
  /**
   * # Generate utility function
   * ---
   * The `generate` utility function creates a new UUID
   * branded as a UserId.
   *
   * This should be used when creating a new database record
   * or when making a test.
   *
   * @example
   * ```typescript
   * const newUserId = UserId.generate() // newUserId is now a UUID branded as a UserId
   * ```
   */
  generate: (): UserId => v4() as UserId,
} as const satisfies SchemaReturnType<UserId>;

/**
 * # SLP or administrator
 *
 * A user is the actual end-user of the app, which
 * includes SLPs, Admins, and any individuals
 * authroized to access and generate SOAP notes
 */
export type User = {
  /**
   * This is an auto-incrementing number used to
   * identify a user in a database
   */
  id: UserId;
  email: Email;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export const User = {
  schema: z.object({
    id: UserId.schema,
    email: Email.schema,
    name: z.string(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
  parse: (x: unknown): User => User.schema.parse(x),
} as const satisfies SchemaReturnType<User>;
