import { ZodError, ZodType } from 'zod';

/**
 * ## Helper Utility to guarantee correct parsing
 * ---
 *
 * This helper works in conjunction with the `satisfies`
 * utility in typescript.
 *
 * It guarantees that an object
 * has a property called `schema` that is a zod parser that
 * returns the type you give it.
 *
 * It also requires that there is a `parse` methods,
 * which should be a function run the aforementioned
 * schema.
 *
 * ---
 *
 * @example
 * for context lets say you have this type:
 * ```typescript
 * type User = {
 *   name: string,
 *   age: number,
 * }
 * ```
 * if we are to make a parser for that, we can write it like this:
 * ```typescript
 * const User = {
 *   schema: z.object({
 *     name: z.string(), // this property must be there and must be a string
 *     age: z.number(), // this is also enforced
 *   }),
 *   parse: (x: unknown) => User.schema.parse(x)
 * // This satisfies statement is what enforces that the parse and schema fields are there.
 * } as const satisfies SchemaReturnType<User>; // just pass in the type you want this parser to guarantee
 */
export type SchemaReturnType<T> = {
  /** The zod schmea for type passed into this utility */
  schema: ZodType<T>;
  /**
   * A method that can take in one argument,
   * which can be anything at all, and it returns
   * a result of type  passed into this utility or throws a {@link ZodError} exception
   * */
  parse: (x: unknown) => T;
} & Record<string, unknown>;
